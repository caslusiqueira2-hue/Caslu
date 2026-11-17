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
test('configuração não revela chave e análise funciona sem senha nem cookie',async(t)=>{
  const originalKey=process.env.GEMINI_API_KEY,originalPassword=process.env.APP_PASSWORD,originalFetch=globalThis.fetch;
  process.env.GEMINI_API_KEY=' GEMINI_API_KEY="chave-ficticia-para-teste" ';delete process.env.APP_PASSWORD;
  t.after(()=>{globalThis.fetch=originalFetch;if(originalKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=originalKey;if(originalPassword===undefined)delete process.env.APP_PASSWORD;else process.env.APP_PASSWORD=originalPassword;});
  const configRes=response();configHandler({...request(),method:'GET'},configRes);
  assert.equal(configRes.data.requiresPassword,false);assert.equal(configRes.data.configured,true);
  assert.ok(!JSON.stringify(configRes.data).includes('chave-ficticia'));
  const badPhoto=response();await analyzeHandler({...request({'content-type':'application/json'}),method:'POST',body:{consent:false}},badPhoto);
  assert.equal(badPhoto.statusCode,400);assert.match(badPhoto.data.error,/Autorize/);
  let sent=false;globalThis.fetch=async(url,options)=>{sent=true;assert.equal(options.headers['x-goog-api-key'],'chave-ficticia-para-teste');return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({items:[],notes:'Sem comida'})}]}}]}),{status:200,headers:{'content-type':'application/json'}});};
  const photo=response();await analyzeHandler({...request({'content-type':'application/json',origin:'https://nutra.example'}),method:'POST',body:{consent:true,mimeType:'image/png',image:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg=='}},photo);
  assert.equal(photo.statusCode,200);assert.ok(sent);assert.deepEqual(photo.data.items,[]);
  const configWrite=response();configHandler({...request(),method:'POST',body:{key:'public-key'}},configWrite);assert.equal(configWrite.statusCode,405);
});
