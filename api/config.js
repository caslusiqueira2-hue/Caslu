import { authenticated, reply } from '../lib/cloud-api.mjs';
export default function handler(req,res) {
  if(req.method!=='GET')return reply(res,405,{error:'As chaves são configuradas nas variáveis de ambiente da Vercel.'});
  return reply(res,200,{
    configured:Boolean(process.env.GEMINI_API_KEY),
    passwordConfigured:Boolean(process.env.APP_PASSWORD),
    authenticated:authenticated(req,process.env.APP_PASSWORD),
    model:process.env.GEMINI_MODEL||'gemini-3.1-flash-lite',
    local:false,
    storage:'browser'
  });
}
