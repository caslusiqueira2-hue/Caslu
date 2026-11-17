import { analyze } from '../gemini.mjs';
import { bodyObject, reply, sameOrigin } from '../lib/cloud-api.mjs';
export default async function handler(req,res) {
  if(req.method!=='POST')return reply(res,405,{error:'Método não permitido.'});
  if(!sameOrigin(req))return reply(res,403,{error:'Origem não permitida.'});
  try {
    const data=bodyObject(req);
    const result=await analyze(data,{apiKey:process.env.GEMINI_API_KEY,model:process.env.GEMINI_MODEL?.trim()||'gemini-3.1-flash-lite'});
    return reply(res,200,result);
  } catch(e) {return reply(res,e.status||400,{error:e.message});}
}
