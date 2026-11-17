import assert from 'node:assert/strict';
import { test } from 'node:test';
import { authenticated, issueSession, passwordMatches, sameOrigin, bodyObject } from '../lib/cloud-api.mjs';
import configHandler from '../api/config.js';
import sessionHandler from '../api/session.js';
import analyzeHandler from '../api/analyze.js';
const now=1_800_000_000_000;
const request=(headers={})=>({headers:{host:'nutra.example',...headers}});
function response() {
  return {statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(s){this.statusCode=s;return this;},json(data){this.data=data;return this;}};
}
test('sessão assinada exige senha correta, expira e é invalidada pela troca de senha',()=>{
  assert.equal(passwordMatches('incorreta','senha-de-teste'),false);
  assert.equal(passwordMatches('senha-de-teste','senha-de-teste'),true);
  assert.equal(passwordMatches(undefined,''),false);
  const token=issueSession('senha-de-teste',now);
  const req=request({cookie:'outra=x; nutra_session='+token});
  assert.equal(authenticated(req,'senha-de-teste',now+1000),true);
  assert.equal(authenticated(req,'outra-senha',now+1000),false);
  assert.equal(authenticated(req,'senha-de-teste',now+8*86400000),false);
  assert.equal(authenticated(request({cookie:'nutra_session='+token+'x'}),'senha-de-teste',now),false);
});
test('API recusa origem externa e corpo acima do limite',()=>{
  assert.equal(sameOrigin(request({origin:'https://nutra.example'})),true);
  assert.equal(sameOrigin(request({origin:'https://external.example'})),false);
  assert.throws(()=>bodyObject({headers:{'content-type':'application/json'},body:{image:'a'.repeat(10)}},5),/grande/);
});
test('configuração não revela a chave; login usa cookie seguro e fotos exigem sessão',async(t)=>{
  const originalKey=process.env.GEMINI_API_KEY, originalPassword=process.env.APP_PASSWORD;
  process.env.GEMINI_API_KEY='chave-ficticia-para-teste';process.env.APP_PASSWORD='senha-ficticia-para-teste';
  t.after(()=>{if(originalKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=originalKey;if(originalPassword===undefined)delete process.env.APP_PASSWORD;else process.env.APP_PASSWORD=originalPassword;});
  const configRes=response();configHandler({...request(),method:'GET'},configRes);
  assert.equal(configRes.data.local,false);assert.equal(configRes.data.storage,'browser');assert.equal(configRes.data.configured,true);
  assert.ok(!JSON.stringify(configRes.data).includes(process.env.GEMINI_API_KEY));
  const unauth=response();await analyzeHandler({...request(),method:'POST',body:{}},unauth);assert.equal(unauth.statusCode,401);
  const login=response();sessionHandler({...request({'content-type':'application/json',origin:'https://nutra.example'}),method:'POST',body:{password:process.env.APP_PASSWORD}},login);
  assert.equal(login.statusCode,200);assert.match(login.headers['Set-Cookie'],/HttpOnly; Secure; SameSite=Strict/);
  const cookie=login.headers['Set-Cookie'].split(';')[0];
  const badPhoto=response();await analyzeHandler({...request({cookie,'content-type':'application/json'}),method:'POST',body:{consent:false}},badPhoto);
  assert.equal(badPhoto.statusCode,400);assert.match(badPhoto.data.error,/Autorize/);
  const configWrite=response();configHandler({...request(),method:'POST',body:{key:'public-key'}},configWrite);assert.equal(configWrite.statusCode,405);
});
