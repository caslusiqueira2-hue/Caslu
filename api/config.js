import { reply } from '../lib/cloud-api.mjs';
import { normalizeApiKey } from '../gemini.mjs';
export default function handler(req,res) {
  if(req.method!=='GET')return reply(res,405,{error:'As chaves são configuradas nas variáveis de ambiente da Vercel.'});
  return reply(res,200,{configured:Boolean(normalizeApiKey(process.env.GEMINI_API_KEY)),requiresPassword:false,authenticated:true,model:process.env.GEMINI_MODEL?.trim()||'gemini-3.1-flash-lite',local:false,storage:'browser'});
}
