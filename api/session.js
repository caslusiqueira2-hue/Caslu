import { bodyObject, issueSession, passwordMatches, reply, sameOrigin } from '../lib/cloud-api.mjs';
export default function handler(req,res) {
  if(!sameOrigin(req))return reply(res,403,{error:'Origem não permitida.'});
  if(req.method==='DELETE') {res.setHeader('Set-Cookie','nutra_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0');return reply(res,200,{authenticated:false});}
  if(req.method!=='POST')return reply(res,405,{error:'Método não permitido.'});
  if(!process.env.APP_PASSWORD)return reply(res,503,{error:'Defina APP_PASSWORD nas variáveis de ambiente da Vercel e faça um novo deploy.'});
  try {
    const data=bodyObject(req,2048);
    if(!passwordMatches(data.password,process.env.APP_PASSWORD))return reply(res,401,{error:'Senha incorreta.'});
    res.setHeader('Set-Cookie',`nutra_session=${issueSession(process.env.APP_PASSWORD)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`);
    return reply(res,200,{authenticated:true});
  } catch(e) {return reply(res,e.status||400,{error:e.message});}
}
