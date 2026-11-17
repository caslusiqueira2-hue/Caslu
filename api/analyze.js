import { analyze } from '../gemini.mjs';
import { authenticated, bodyObject, reply, sameOrigin } from '../lib/cloud-api.mjs';
export default async function handler(req,res) {
  if(req.method!=='POST')return reply(res,405,{error:'Método não permitido.'});
  if(!sameOrigin(req))return reply(res,403,{error:'Origem não permitida.'});
  if(!process.env.APP_PASSWORD)return reply(res,503,{error:'Defina APP_PASSWORD nas variáveis de ambiente da Vercel para habilitar fotos.'});
  if(!authenticated(req,process.env.APP_PASSWORD))return reply(res,401,{error:'Entre com a senha do app em Ajustes para usar a análise de fotos.'});
  try {
    const data=bodyObject(req);
    const result=await analyze(data,{apiKey:process.env.GEMINI_API_KEY,model:process.env.GEMINI_MODEL||'gemini-3.1-flash-lite'});
    return reply(res,200,result);
  } catch(e) {return reply(res,e.status||400,{error:e.message});}
}
