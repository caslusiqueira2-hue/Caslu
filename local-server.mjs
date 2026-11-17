import http from 'node:http';
import { readFile, writeFile, rename, mkdir, copyFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { EMPTY_STATE, validateState } from './public/nutrition.mjs';
import { analyze } from './gemini.mjs';

export function createLocalServer({ directory, stateFile, envFile, port, initialKey='', initialModel='gemini-3.1-flash-lite', fetchGemini=fetch }) {
const PUBLIC = path.join(directory,'public');
let apiKey=initialKey, model=initialModel;
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
let queue = Promise.resolve();
async function loadState() { try{return validateState(JSON.parse(await readFile(stateFile,'utf8')));}catch(e){if(e.code==='ENOENT')return structuredClone(EMPTY_STATE);throw new Error('Os dados locais não puderam ser lidos. Preserve data/state.json e restaure um backup.');} }
function saveState(s) {
  const safe = validateState(s);
  const work = queue.then(async()=>{
    await mkdir(path.dirname(stateFile),{recursive:true});
    try{await copyFile(stateFile,stateFile.replace(/\.json$/,'.previous.json'));}catch(e){if(e.code!=='ENOENT')throw e;}
    await writeFile(stateFile+'.tmp',JSON.stringify(safe,null,2),'utf8');
    await rename(stateFile+'.tmp',stateFile);
  }); queue=work.catch(()=>{});return work;
}
async function body(req) {
  if(!String(req.headers['content-type']).startsWith('application/json')) throw Object.assign(new Error('Envie JSON.'),{status:415});
  let size=0;const chunks=[];
  for await(const chunk of req){size+=chunk.length;if(size>8*1024*1024)throw Object.assign(new Error('O arquivo é grande demais. Use até 5 MB.'),{status:413});chunks.push(chunk);}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw Object.assign(new Error('JSON inválido.'),{status:400});}
}
function json(res,status,value){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(value));}
return http.createServer(async(req,res)=>{
  const allowedHost = /^(localhost|127\.0\.0\.1)(:\d+)?$/;
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
  if(!allowedHost.test(req.headers.host||''))return json(res,403,{error:'Acesso disponível apenas neste computador.'});
  if(req.headers.origin && req.headers.origin !== `http://${req.headers.host}`)return json(res,403,{error:'Origem não permitida.'});
  try{
    const url = new URL(req.url,`http://${req.headers.host}`);
    if(url.pathname==='/api/health')return json(res,200,{ok:true});
    if(url.pathname==='/api/config'&&req.method==='GET')return json(res,200,{configured:Boolean(apiKey),model,local:true});
    if(url.pathname==='/api/config'&&req.method==='POST'){
      const data=await body(req);
      if(typeof data.key!=='string'||data.key.length<10||data.key.length>300||/[\r\n]/.test(data.key)||!/^gemini-[a-z0-9.-]+$/.test(data.model||''))throw new Error('Confira a chave e o nome do modelo.');
      apiKey=data.key.trim();model=data.model;
      await writeFile(envFile,`GEMINI_API_KEY=${apiKey}\nGEMINI_MODEL=${model}\nPORT=${port}\n`,{mode:0o600});return json(res,200,{configured:true,model});
    }
    if(url.pathname==='/api/state'&&req.method==='GET')return json(res,200,await loadState());
    if(url.pathname==='/api/state'&&req.method==='PUT'){await saveState(await body(req));return json(res,200,{saved:true});}
    if(url.pathname==='/api/analyze'&&req.method==='POST')return json(res,200,await analyze(await body(req), { apiKey, model, fetchGemini }));
    if(url.pathname.startsWith('/api/'))return json(res,404,{error:'Rota não encontrada.'});
    if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'Método não permitido.'});
    const decoded=decodeURIComponent(url.pathname);
    const file=path.resolve(PUBLIC,'.'+(decoded==='/'?'/index.html':decoded));
    if(!file.startsWith(PUBLIC+path.sep))return json(res,403,{error:'Caminho não permitido.'});
    const info=await stat(file);if(!info.isFile())throw Object.assign(new Error('Arquivo não encontrado.'),{code:'ENOENT'});
    const content=await readFile(file);res.writeHead(200,{'content-type':MIME[path.extname(file)]||'application/octet-stream','cache-control':'no-cache'});res.end(req.method==='HEAD'?undefined:content);
  }catch(e){const status=e.code==='ENOENT'?404:e.status||400;json(res,status,{error:e.message});}
});
}
