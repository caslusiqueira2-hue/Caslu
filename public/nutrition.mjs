export const ACTIVITY = {
  sedentary: { factor: 1.2, label: 'Pouco ativo', detail: 'Rotina sentada, pouco exercício' },
  light: { factor: 1.375, label: 'Levemente ativo', detail: 'Exercício leve 1 a 3 vezes/semana' },
  moderate: { factor: 1.55, label: 'Moderadamente ativo', detail: 'Exercício 3 a 5 vezes/semana' },
  high: { factor: 1.725, label: 'Muito ativo', detail: 'Treino intenso e rotina com movimento' },
  athlete: { factor: 1.9, label: 'Atividade muito elevada', detail: 'Trabalho físico pesado e treino intenso' }
};
export const GOALS = { lose: 'Emagrecer', maintain: 'Manter o peso', gain: 'Ganhar massa' };
export const MEALS = ['Café da manhã', 'Almoço', 'Lanche', 'Jantar'];
export const EMPTY_STATE = { version: 1, profile: null, entries: [], customFoods: [], water: {}, weights: [], days: {} };
export const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
export function finite(value, min, max, name) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`${name}: informe um valor entre ${min} e ${max}.`);
  return value;
}
export function validateProfile(p) {
  if (!p || typeof p !== 'object') throw new Error('Preencha o perfil.');
  finite(p.age, 18, 100, 'Idade');
  if (!Number.isInteger(p.age)) throw new Error('Informe a idade em anos completos.');
  finite(p.weight, 30, 350, 'Peso'); finite(p.height, 120, 230, 'Altura');
  if (!['male', 'female'].includes(p.sex) || !ACTIVITY[p.activity] || !GOALS[p.goal]) throw new Error('Confira os campos do perfil.');
  if (typeof p.specialCare !== 'boolean') throw new Error('Responda à pergunta sobre acompanhamento.');
  return { name: String(p.name || '').trim().slice(0,60), age: p.age, weight: p.weight, height: p.height, sex: p.sex, activity: p.activity, goal: p.goal, specialCare: p.specialCare };
}
export function calculateTargets(input) {
  const p = validateProfile(input);
  const bmi = p.weight / ((p.height / 100) ** 2);
  const blocked = Boolean(p.specialCare || bmi < 18.5);
  // Mifflin–St Jeor estimates resting energy expenditure, not measured BMR.
  const resting = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === 'male' ? 5 : -161);
  const expenditure = resting * ACTIVITY[p.activity].factor;
  let reason = '';
  if (p.specialCare) {
    reason = 'Use metas definidas com um profissional. O diário continua disponível.';
  } else if (bmi < 18.5) {
    reason = 'Com este peso e altura, a meta automática precisa de avaliação profissional. O diário continua disponível.';
  }
  // Product guardrails, not claims that these thresholds are safe for everyone.
  const floor = p.sex === 'male' ? 1500 : 1200;
  const proposed = p.goal === 'lose' ? expenditure - Math.min(expenditure * .15, 500) : p.goal === 'gain' ? expenditure + Math.min(expenditure * .08, 300) : expenditure;
  let outOfRange = false;
  if (proposed < floor || proposed > 5000) {
    outOfRange = true;
    if (!reason) reason = 'A estimativa ficou fora da faixa automática do app. Defina sua meta com um nutricionista.';
  }
  const isBlocked = blocked || outOfRange;
  const safeProposed = Math.max(floor, Math.min(5000, proposed));
  const calories = Math.round(isBlocked && !proposed ? safeProposed : proposed);
  const proteinFactor = p.goal === 'maintain' ? 1.2 : 1.6;
  const protein = Math.min(p.weight * proteinFactor, calories * .35 / 4);
  const fat = calories * .30 / 9;
  const carbs = (calories - protein * 4 - fat * 9) / 4;
  return { blocked: isBlocked, reason: isBlocked ? reason : undefined, resting: Math.round(resting), expenditure: Math.round(expenditure), calories: Math.round(calories), protein, fat, carbs, adjustment: Math.round(proposed - expenditure), factor: ACTIVITY[p.activity].factor, proteinCapped: protein < p.weight * proteinFactor, bmi };
}
export function validateFood(f) {
  if (!f || typeof f !== 'object' || typeof f.name !== 'string' || !f.name.trim()) throw new Error('Informe o nome do alimento.');
  const result = { id: String(f.id || '').slice(0,100), name: f.name.trim().slice(0,150), category: String(f.category || 'Meus alimentos').slice(0,100), source: String(f.source || 'Cadastro próprio').slice(0,150) };
  for (const key of ['calories','protein','carbs','fat']) result[key] = finite(f[key], 0, key === 'calories' ? 1000 : 100, key);
  result.fiber = f.fiber == null ? null : finite(f.fiber,0,100,'Fibra');
  if (result.protein + result.carbs + result.fat > 105) throw new Error('Confira os macros por 100 g: a soma ultrapassa 105 g.');
  return result;
}
export function portion(food, grams) {
  finite(grams, 0.1, 5000, 'Quantidade em gramas');
  const out = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: food.fiber == null ? null : 0 };
  for (const k of Object.keys(out)) if (out[k] !== null) out[k] = food[k] * grams / 100;
  return out;
}
export function total(entries) {
  return entries.reduce((acc,e) => { const n = portion(e.food,e.grams); for (const k of ['calories','protein','carbs','fat']) acc[k] += n[k]; return acc; }, {calories:0,protein:0,carbs:0,fat:0});
}
export function validDate(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v;
}
export function validateState(s) {
  if (!s || s.version !== 1 || !Array.isArray(s.entries) || !Array.isArray(s.customFoods) || !Array.isArray(s.weights) || !s.water || typeof s.water !== 'object' || Array.isArray(s.water)) throw new Error('Arquivo de dados inválido.');
  if (s.entries.length > 50000 || s.customFoods.length > 10000 || s.weights.length > 10000) throw new Error('Arquivo acima do limite de registros.');
  const profile = s.profile == null ? null : validateProfile(s.profile);
  const customFoods = s.customFoods.map(validateFood);
  const ids = new Set();
  const entries = s.entries.map(e => {
    if (!e || typeof e.id !== 'string' || !e.id || ids.has(e.id) || !validDate(e.date) || !MEALS.includes(e.meal)) throw new Error('Registro de refeição inválido.');
    ids.add(e.id);
    return { id:e.id.slice(0,100), date:e.date, meal:e.meal, grams:finite(e.grams,.1,5000,'Quantidade'), food:validateFood(e.food), viaPhoto:Boolean(e.viaPhoto) };
  });
  const water = {};
  for (const [date, ml] of Object.entries(s.water)) { if (!validDate(date)) throw new Error('Data de água inválida.'); water[date]=finite(ml,0,15000,'Água'); }
  const weights = s.weights.map(w=>{ if(!validDate(w.date))throw new Error('Data do peso inválida.');return {date:w.date,weight:finite(w.weight,30,350,'Peso')};});
  const days = {};
  if(s.days && (typeof s.days !== 'object' || Array.isArray(s.days))) throw new Error('Histórico de metas inválido.');
  for(const [date,day] of Object.entries(s.days || {})) {
    if(!validDate(date) || !day || typeof day.closed !== 'boolean') throw new Error('Histórico diário inválido.');
    days[date] = {profile:day.profile == null ? null : validateProfile(day.profile),closed:day.closed};
  }
  return {version:1, profile, entries, customFoods, water, weights, days};
}
export function dailyBalance(consumed, targets, closed=false, hasEntries=true) {
  if(!targets || (!targets.expenditure && targets.blocked)) return {status:'no-target',label:'Sem meta calculada'};
  if(!hasEntries) return {status:'empty',label:'Sem registros alimentares'};
  const expenditure = targets.expenditure || targets.calories;
  const difference = consumed - expenditure;
  const status = Math.abs(difference) <= 50 ? 'maintenance' : difference < 0 ? 'deficit' : 'surplus';
  const labels = {deficit:'Déficit estimado',maintenance:'Próximo à manutenção',surplus:'Superávit estimado'};
  return {status,label:(closed ? '' : 'Projeção: ')+labels[status],difference,remaining:(targets.calories||expenditure)-consumed,margin:expenditure-consumed,closed};
}
export function matchFoods(name, foods, limit=8) {
  const q = normalize(name); const tokens = q.split(' ').filter(t=>t.length>1);
  return foods.map(food=>{
    const n = normalize(food.name);
    let score = n === q ? 100 : n.includes(q) ? 60 : 0;
    for(const t of tokens) if(n.split(' ').includes(t)) score += 10;
    return {food,score};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,limit).map(x=>x.food);
}
