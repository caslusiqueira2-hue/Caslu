import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDailyBudgets } from '../public/daily-budgets.mjs';
const targets={calories:2000,carbs:250,protein:100,fat:66.7};
const consumed={calories:500,carbs:50,protein:25,fat:10};
test('quadro inicial reúne meta, consumo e saldo de calorias e dos três macros',()=>{
  const html=renderDailyBudgets(consumed,targets);
  assert.ok(html.includes('hero daily-budget-panel'));
  for(const label of ['Calorias','Carboidratos','Proteínas','Gorduras'])assert.ok(html.includes('aria-label="'+label+'"'));
  for(const label of ['Meta diária','Consumido','Falta para a meta'])assert.equal((html.match(new RegExp('data-label="'+label+'"','g'))||[]).length,4);
  for(const value of ['2.000','1.500','200','75','56,7'])assert.ok(html.includes(value),value);
});
test('consumo acima da meta exibe excesso sem valor restante negativo',()=>{
  const html=renderDailyBudgets({...consumed,calories:2200,protein:130},targets);
  assert.equal((html.match(/data-label="Acima da meta"/g)||[]).length,2);
  assert.ok(html.includes('<strong>200</strong><small>kcal</small>'));
  assert.ok(html.includes('<strong>30</strong><small>g</small>'));
  assert.ok(!html.includes('-200'));
  assert.ok(!html.includes('-30'));
});
test('perfil ausente ou bloqueado mantém consumo e pede metas sem inventar valores',()=>{
  for(const target of [null,{blocked:true,reason:'Acompanhamento individual'}]){
    const html=renderDailyBudgets(consumed,target);
    assert.equal((html.match(/A definir/g)||[]).length,8);
    assert.ok(html.includes('<strong>500</strong><small>kcal</small>'));
    assert.ok(html.includes('Preencha e salve seu perfil'));
    assert.ok(!html.includes('NaN'));
  }
});
