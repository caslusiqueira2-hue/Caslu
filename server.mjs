import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createLocalServer} from './local-server.mjs';

const directory=path.dirname(fileURLToPath(import.meta.url));
const envFile=path.join(directory,'.env');
const env={};
try {
  for(const line of (await readFile(envFile,'utf8')).split(/\r?\n/)) {
    const match=line.match(/^([A-Z_]+)=(.*)$/);
    if(match)env[match[1]]=match[2].trim();
  }
} catch(e) { if(e.code!=='ENOENT')throw e; }
const port=Number(process.env.PORT || env.PORT || 3210);
const initialKey=process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || '';
const initialModel=process.env.GEMINI_MODEL || env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
const stateFile=process.env.NUTRA_STATE_FILE || path.join(directory,'data','state.json');
const server=createLocalServer({directory,stateFile,envFile,port,initialKey,initialModel});
server.listen(port,'127.0.0.1',()=>{
  console.log('Nutra local: http://localhost:'+port+'\nDados salvos em: '+stateFile+'\nGemini: '+(initialKey?'configurado':'não configurado')+' ('+initialModel+')');
});
