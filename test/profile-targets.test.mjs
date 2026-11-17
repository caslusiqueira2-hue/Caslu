import assert from 'node:assert/strict';
import {test} from 'node:test';
import {EMPTY_STATE,calculateTargets,validateState} from '../public/nutrition.mjs';
import {resolveDayInfo,saveProfileToState,profileFromValues} from '../public/profile-targets.mjs';
const today='2026-11-17', yesterday='2026-11-16';
const profile={name:'Teste',age:30,sex:'male',weight:80,height:180,activity:'moderate',goal:'lose',specialCare:false};
test('diário recupera as metas quando um dia foi fechado sem perfil antes do cadastro',()=>{
  const state={...structuredClone(EMPTY_STATE),profile,days:{[today]:{closed:true,profile:null}}};
  const day=resolveDayInfo(state,today,today);
  assert.equal(day.closed,true);
  const targets=calculateTargets(day.profile);
  assert.equal(targets.calories,2345);
  assert.equal(targets.protein,128);
});
test('salvar perfil atualiza imediatamente hoje, inclusive fechado, e persiste a meta',()=>{
  const state={...structuredClone(EMPTY_STATE),days:{[today]:{closed:true,profile:null}}};
  saveProfileToState(state,profile,today);
  const restored=validateState(JSON.parse(JSON.stringify(state)));
  assert.equal(resolveDayInfo(restored,today,today).closed,true);
  assert.equal(calculateTargets(resolveDayInfo(restored,today,today).profile).calories,2345);
  saveProfileToState(state,{...profile,weight:90},today);
  assert.equal(calculateTargets(resolveDayInfo(state,today,today).profile).calories,2477);
});
test('metas antigas com perfil são preservadas e dias sem perfil usam a estimativa atual',()=>{
  const state={...structuredClone(EMPTY_STATE),days:{[yesterday]:{closed:true,profile:{...profile,weight:70}},'2026-11-15':{closed:true,profile:null}}};
  saveProfileToState(state,profile,today);
  assert.equal(resolveDayInfo(state,yesterday,today).profile.weight,70);
  const missing=resolveDayInfo(state,'2026-11-15',today);
  assert.equal(missing.profile.weight,80);
  assert.equal(missing.usesCurrentProfile,true);
});
test('cadastro novo já permite calcular todos os nutrientes sem registrar refeição',()=>{
  const state=structuredClone(EMPTY_STATE);
  saveProfileToState(state,profile,today);
  const targets=calculateTargets(resolveDayInfo(state,today,today).profile);
  for(const key of ['calories','protein','carbs','fat'])assert.ok(Number.isFinite(targets[key])&&targets[key]>0);
});

test('perfil aceita vírgula decimal e altura em metros como no teclado do iPhone',()=>{
  const parsed=profileFromValues({...profile,age:'30',weight:'80,5',height:'1,80'});
  assert.equal(parsed.weight,80.5);assert.equal(parsed.height,180);
  assert.equal(profileFromValues({...profile,age:'30',weight:'80.5',height:'180'}).height,180);
  assert.equal(profileFromValues({...profile,age:'30',weight:'80,5 kg',height:'1,75 m'}).height,175);
  assert.ok(calculateTargets(parsed).calories>0);
});
test('perfil com cuidado especial ainda calcula metas orientativas',()=>{
  const special=calculateTargets({...profile,specialCare:true});
  assert.equal(special.blocked,true);
  assert.ok(special.calories>0);
  assert.ok(special.reason.includes('Use metas'));
});
test('medidas incompletas ou inválidas não viram perfil salvo',()=>{
  assert.throws(()=>profileFromValues({...profile,weight:'',height:'1,80'}),/Peso/);
  assert.throws(()=>profileFromValues({...profile,weight:'oitenta',height:'1,80'}),/Peso/);
  assert.throws(()=>profileFromValues({...profile,age:'30,5'}),/anos completos/);
});
