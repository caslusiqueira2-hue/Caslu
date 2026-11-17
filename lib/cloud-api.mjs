import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
export function reply(res,status,value) { res.setHeader('Cache-Control','no-store'); return res.status(status).json(value); }
export function sameOrigin(req) {
  const origin=req.headers.origin;
  if(!origin) return true;
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}
export function bodyObject(req,maxBytes=4_000_000) {
  if(!String(req.headers['content-type']).startsWith('application/json'))throw Object.assign(new Error('Envie JSON.'),{status:415});
  const size=Number(req.headers['content-length']||0);
  if(size>maxBytes)throw Object.assign(new Error('A foto é grande demais. Escolha uma imagem menor.'),{status:413});
  const data=typeof req.body==='string'?JSON.parse(req.body):req.body;
  if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Solicitação inválida.');
  if(Buffer.byteLength(JSON.stringify(data))>maxBytes)throw Object.assign(new Error('A foto é grande demais. Escolha uma imagem menor.'),{status:413});
  return data;
}
function equal(a,b) { return timingSafeEqual(createHash('sha256').update(String(a)).digest(),createHash('sha256').update(String(b)).digest()); }
export function passwordMatches(password,expected) { return Boolean(expected) && typeof password==='string' && password.length<=500 && equal(password,expected); }
function signature(payload,password) {return createHmac('sha256',password).update(payload).digest('base64url');}
export function issueSession(password,now=Date.now()) {
  const payload=Buffer.from(JSON.stringify({expires:now+7*86400_000})).toString('base64url');
  return payload+'.'+signature(payload,password);
}
export function authenticated(req,password,now=Date.now()) {
  if(!password)return false;
  try {
    const value=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('nutra_session='))?.slice(14);
    if(!value||value.length>1000)return false;
    const [payload,sig,...extra]=value.split('.');
    if(extra.length||!payload||!sig||!equal(sig,signature(payload,password)))return false;
    const expires=JSON.parse(Buffer.from(payload,'base64url').toString('utf8')).expires;
    return Number.isFinite(expires)&&expires>now&&expires<=now+7*86400_000;
  } catch { return false; }
}
