import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDailyBudgets } from '../public/daily-budgets.mjs';
const targets={calories:2000,carbs:250,protein:100,fat:66.7};
const consumed={calories:500,carbs:50,protein:25,fat:10};
test('infográfico mostra calorias restantes e barras com consumo, meta e saldo de cada macro',()=>{
  const html=renderDailyBudgets(consumed,targets);
  assert.ok(html.includes('1.500 kcal restantes'));
  assert.ok(html.includes('data-energy="target"'));
  assert.ok(html.includes('data-energy="consumed"'));
  assert.equal((html.match(/role="progressbar"/g)||[]).length,3);
  for(const label of ['Proteínas','Carboidratos','Gorduras'])assert.ok(html.includes('aria-label="'+label+'"'));
  for(const value of ['200','75','56,7'])assert.ok(html.includes('Faltam <b>'+value+' g</b>'),value);
  assert.ok(!html.includes('<table'));
});
test('excesso de consumo aparece identificado e limita barras a 100 por cento',()=>{
  const html=renderDailyBudgets({...consumed,calories:2200,protein:130},targets);
  assert.ok(html.includes('200 kcal acima da meta'));
  assert.ok(html.includes('Excedeu <b>30 g</b>'));
  assert.ok(!html.includes('-200'));
  assert.ok(!html.includes('width:130%'));
});
test('ausência de perfil e metas individuais têm orientação visível e mantêm o consumo',()=>{
  const empty=renderDailyBudgets(consumed,null);
  assert.ok(empty.includes('Calcular metas'));
  assert.ok(empty.includes('Preencha<br>seu perfil'));
  assert.ok(empty.includes('<strong>500</strong><small>kcal</small>'));
  const blocked=renderDailyBudgets(consumed,{blocked:true,reason:'Use metas definidas com um profissional.'});
  assert.ok(blocked.includes('Use metas definidas com um profissional.'));
  for(const html of [empty,blocked]){
    assert.ok(!html.includes('A definir'));
    assert.ok(!html.includes('NaN'));
  }
});
