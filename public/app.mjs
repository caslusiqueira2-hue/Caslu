import { preparePhotoImage } from './photo-image.mjs';
import { resolveDayInfo, saveProfileToState, profileFromValues } from './profile-targets.mjs';
import { renderDailyBudgets } from './daily-budgets.mjs';
import { readBrowserState, writeBrowserState } from './browser-storage.mjs';
import { ACTIVITY, GOALS, MEALS, calculateTargets, dailyBalance, normalize, portion, total, validateFood, validateProfile, validateState, validDate, matchFoods } from './nutrition.mjs';

const $=(q,e=document)=>e.querySelector(q);
const view=$('#view'), dialog=$('#modal');
const icons={book:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 3v18m4-13h4m-4 4h4"/>',food:'<path d="M3 12h18a9 9 0 0 1-18 0Zm4 8h10M9 3c0 2 2 2 2 4m3-4c0 2 2 2 2 4"/>',chart:'<path d="M4 19V5m0 14h16M8 15v-3m4 3V8m4 7V5"/>',target:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 12h.01"/>',settings:'<circle cx="12" cy="12" r="3"/><path d="m10 3-.6 2.3-2.4 1-2.1-.9-1.4 2.4L5.1 10v2.8l-1.6 2.1 1.4 2.4 2.4-.9 2.1 1.2L10 20h3l.6-2.4 2.2-1.1 2.4.8 1.4-2.4-1.6-2.1V10l1.6-2.2-1.4-2.4-2.4.9-2.2-1L13 3z"/>',camera:'<path d="M3 7h4l2-3h6l2 3h4v13H3Z"/><circle cx="12" cy="13" r="3"/>',plus:'<path d="M12 5v14M5 12h14"/>',calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/>',left:'<path d="m14 6-6 6 6 6"/>',right:'<path d="m10 6 6 6-6 6"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>',coffee:'<path d="M4 7h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Zm12 1h3a2 2 0 0 1 0 4h-3M3 21h16M8 3h.01m4 0h.01"/>',leaf:'<path d="M5 19c4-6 7-9 14-14m-13 11C2 9 8 3 20 3c0 11-5 16-14 13Z"/>',moon:'<path d="M20 15A8 8 0 0 1 9 4a8 8 0 1 0 11 11Z"/>',search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',pencil:'<path d="m4 16 12-12 4 4L8 20H4Zm10-10 4 4"/>',trash:'<path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5"/>',check:'<path d="m4 12 5 5L20 6"/>',download:'<path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/>'};
const ico=(n)=>`<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[n]||''}</svg>`;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(n,dec=0)=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:dec}).format(n);
const NAV=[['diary','Diário','book'],['foods','Alimentos','food'],['history','Histórico','chart'],['goals','Metas','target'],['settings','Ajustes','settings']];
const mealIcons=['coffee','sun','leaf','moon'];
const macroInfo=[['protein','Proteínas','--p'],['carbs','Carboidratos','--c'],['fat','Gorduras','--f']];
const goalGuide={lose:'Use a meta como ponto de partida. Ajuste as porções sem eliminar grupos de alimentos. Priorize refeições com verduras, legumes, feijão ou outra leguminosa e uma fonte de proteína.',maintain:'Procure manter refeições variadas e uma rotina que você consiga repetir. Observe a tendência ao longo das semanas para saber se a estimativa combina com a sua rotina.',gain:'Para ganhar massa, combine um pequeno aumento no consumo com treino de força. Divida a proteína entre as refeições e inclua alimentos que ajudem a atingir a meta, como arroz, feijão, ovos e iogurte.'};
const mealOptions=(selected)=>MEALS.map(m=>`<option ${m===selected?'selected':''}>${m}</option>`).join('');
let state, catalog=[], page='diary', selectedDate=localDate(), config={configured:false}, toastTimer;
let foodQuery='', foodCategory='', foodPage=0;
let photoFile=null, photoUrl='', photoItems=[], photoLoadId=0;
let saveQueue=Promise.resolve();
function localDate(date=new Date()){const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');return `${y}-${m}-${d}`;}
function shift(date,n){const d=new Date(`${date}T12:00:00`);d.setDate(d.getDate()+n);return localDate(d);}
function dateText(date,long=false){return new Intl.DateTimeFormat('pt-BR',long?{weekday:'long',day:'numeric',month:'long'}:{day:'2-digit',month:'short'}).format(new Date(date+'T12:00:00'));}
async function api(url,method='GET',data,customHeaders={}){
  if(url==='/api/state'&&config.local===false){
    return method==='GET'?readBrowserState():writeBrowserState(data);
  }
  const headers={
    ...(data?{'content-type':'application/json'}:undefined),
    ...customHeaders
  };
  const r=await fetch(url,{method,headers:Object.keys(headers).length?headers:undefined,body:data?JSON.stringify(data):undefined});
  const j=await r.json();
  if(!r.ok)throw new Error(j.error||'Não foi possível concluir.');
  return j;
}
function notify(message){clearTimeout(toastTimer);$('#toast').textContent=message;toastTimer=setTimeout(()=>{$('#toast').textContent='';},3700);}
async function mutate(change,renderView=true){const job=saveQueue.then(async()=>{const next=structuredClone(state);change(next);const safe=validateState(next);await api('/api/state','PUT',safe);state=safe;if(renderView)render();});saveQueue=job.catch(()=>{});return job;}
function dayInfo(date){return resolveDayInfo(state,date,localDate());}
function entriesFor(date){return state.entries.filter(e=>e.date===date);}
function snapshot(next,date){next.days[date]??={profile:next.profile,closed:false};return next.days[date];}
function normalizeDates(test){return validDate(test)&&test<=localDate();}
const heading=(tag,title,desc,actions='')=>`<header class="pagehead"><div><div class="eyebrow">${tag}</div><h1>${title}</h1><p>${desc}</p></div>${actions?`<div class="actions">${actions}</div>`:''}</header>`;
const button=(txt,action,style='outline',icon='',extra='')=>`<button type="button" class="btn ${style}" ${action} ${extra}>${icon?ico(icon):''}${txt}</button>`;
const iconButton=(label,action,icon,extra='')=>button('',action,'outline icon',icon,`aria-label="${esc(label)}" title="${esc(label)}" ${extra}`);
function badge(b){return `<span class="badge ${b.status}">${esc(b.label)}</span>`;}
function render(){
  const local=config.local!==false; $('.rail-foot b').textContent=local?'Modo local':'Seu diário'; $('.rail-foot small').textContent=local?'Dados neste computador':'Salvo neste navegador';
  $('#nav').innerHTML=NAV.map(([id,label,icon])=>`<button type="button" data-page="${id}" class="nav-btn ${page===id?'active':''}" ${page===id?'aria-current="page"':''}>${ico(icon)}${label}</button>`).join('');
  view.innerHTML=({diary:diaryView,foods:foodsView,history:historyView,goals:goalsView,settings:settingsView}[page])();
  if(page==='foods')renderFoods();
}
function diaryView(){
  const es=entriesFor(selectedDate), n=total(es), d=dayInfo(selectedDate);
  const t=d.profile?calculateTargets(d.profile):null;
  const active=Boolean(t&&t.calories>0);
  const b=dailyBalance(n.calories,t,d.closed,es.length>0);
  const margin=active?(t.expenditure||t.calories)-n.calories:0;
  const headerActions=button('Por foto','data-add="photo"','outline','camera')+button('Registrar','data-add="manual"','primary','plus');
  const objective = d.profile ? ({lose:'emagrecer',maintain:'manter o peso',gain:'ganhar massa muscular'})[d.profile.goal] : '';
  const balanceDetails=active?`<div class="value">${fmt(t.expenditure||t.calories)} kcal</div><p class="textline">Gasto diário estimado para manutenção</p><div class="rule"></div><p class="textline">${!es.length?'Registre as refeições para acompanhar o saldo.':margin>50?`O consumo registrado está <b>${fmt(margin)} kcal abaixo</b> do gasto do dia.`:margin< -50?`Para ficar abaixo do gasto estimado, o consumo total do dia teria de ser <b>mais de ${fmt(-margin)} kcal menor</b>.`:'O consumo registrado está a até 50 kcal do gasto estimado.'}</p><p class="textline">${d.closed?'Dia fechado. Saldo baseado nos registros.':'Dia aberto. O saldo muda a cada registro e não confirma um déficit real.'}</p>`:`<p class="textline">${esc(t?.reason||'Cadastre seu perfil para comparar o consumo com o gasto diário estimado.')}</p>${button('Abrir metas','data-page="goals"','text','right')}`;
  return heading('Registros diários','Diário alimentar','Acompanhe as refeições e o saldo calórico do dia.',headerActions)+`
    <div class="datebar">${iconButton('Dia anterior','data-date-shift="-1"','left')}<label>${ico('calendar')}<input aria-label="Data do diário" type="date" id="diary-date" max="${localDate()}" value="${selectedDate}"></label>${iconButton('Dia seguinte','data-date-shift="1"','right',selectedDate>=localDate()?'disabled':'')}${selectedDate===localDate()?'<span class="badge">Hoje</span>':button('Hoje','data-today','text')}</div>
    ${renderDailyBudgets(n,t,{goal:objective,usesCurrentProfile:d.usesCurrentProfile})}
    <section class="card balance diary-balance" aria-label="Saldo calórico"><div class="eyebrow">SEU GASTO DE ENERGIA ESTIMADO</div><h2>Consumo e gasto do dia</h2>${badge(b)}${balanceDetails}</section>
    <section class="section"><div class="section-head"><div><h2>Refeições</h2><small class="muted">${dateText(selectedDate,true)}</small></div>${d.closed?button('Reabrir dia','data-day="open"','outline','pencil'):button('Fechar dia','data-day="close"','outline','check',es.length?'':'disabled')}</div>
    ${MEALS.map((meal,i)=>{const list=es.filter(e=>e.meal===meal),m=total(list);return `<article class="card meal"><div class="meal-icon">${ico(mealIcons[i])}</div><div><h3>${meal}</h3>${list.length?`<small>${list.length} ${list.length===1?'alimento':'alimentos'}</small>`:'<small>Nenhum alimento registrado</small>'}</div><div class="meal-right"><span>${fmt(m.calories)} kcal</span>${iconButton(`Adicionar em ${meal}`,`data-add="manual" data-meal="${meal}"`,'plus')}</div>${list.length?`<div class="entrylist">${list.map(e=>`<div class="entry"><div><strong>${esc(e.food.name)}</strong><small>${fmt(e.grams,1)} g${e.viaPhoto?' · foto revisada':''}</small></div><b>${fmt(portion(e.food,e.grams).calories)} kcal</b><div>${iconButton('Editar registro',`data-edit="${esc(e.id)}"`,'pencil')}${iconButton('Excluir registro',`data-remove="${esc(e.id)}"`,'trash')}</div></div>`).join('')}</div>`:''}</article>`;}).join('')}</section>
    <div class="daily-foot"><span>Estimativas para acompanhamento. O gasto real, o preparo e os pesos podem variar.</span>${button('Ver histórico','data-page="history"','text','chart')}</div>`;
}
function foodsView(){const cats=[...new Set(catalog.map(f=>f.category))].sort((a,b)=>a.localeCompare(b,'pt-BR'));return heading('Catálogo nutricional','Alimentos','Encontre um alimento ou cadastre os dados do rótulo.',button('Cadastrar alimento','data-custom','primary','plus'))+`<section class="card"><div class="section-head"><div><h2>Buscar na TACO</h2><small class="muted">${catalog.length} alimentos brasileiros · dados por 100 g</small></div></div><div class="formgrid"><label class="field">Nome do alimento<input type="search" id="food-query" placeholder="Ex.: arroz, banana ou frango" value="${esc(foodQuery)}"></label><label class="field">Categoria<select id="food-category"><option value="">Todas as categorias</option><option ${foodCategory==='Meus alimentos'?'selected':''}>Meus alimentos</option>${cats.map(c=>`<option ${c===foodCategory?'selected':''}>${esc(c)}</option>`).join('')}</select></label></div><div id="catalog-results"></div><p class="sources">Base: <a href="https://nepa.unicamp.br/publicacoes/tabela-taco-excel/" target="_blank" rel="noreferrer">TACO / NEPA-Unicamp, 4ª edição (2011)</a> · <a href="https://github.com/brolesi/taco" target="_blank" rel="noreferrer">Conversão JSON de Fabio F. Brolesi</a></p></section>`;}
function allFoods(){return [...state.customFoods,...catalog];}
function searchFoods(q,collection,limit=Infinity){const tokens=normalize(q).split(' ').filter(Boolean);return collection.filter(f=>{const name=normalize(f.name);return tokens.every(t=>name.includes(t));}).slice(0,limit);}
function foodRow(f){return `<div class="result"><div><strong>${esc(f.name)}</strong><small>${f.complete===false?'Dados incompletos na TACO. Cadastre pelo rótulo.':`${fmt(f.calories)} kcal · P ${fmt(f.protein,1)} g · C ${fmt(f.carbs,1)} g · G ${fmt(f.fat,1)} g por 100 g`}</small></div>${f.complete===false?'':iconButton('Registrar alimento',`data-use-food="${esc(f.id)}"`,'plus')}</div>`;}
function renderFoods(){
  const results=searchFoods(foodQuery,allFoods().filter(f=>!foodCategory||f.category===foodCategory));
  const max=Math.max(0,Math.ceil(results.length/24)-1);foodPage=Math.min(foodPage,max);
  $('#catalog-results').innerHTML=`<p class="hint top-gap">${results.length} ${results.length===1?'resultado':'resultados'}</p><div class="result-list">${results.slice(foodPage*24,foodPage*24+24).map(foodRow).join('')||'<p class="empty">Nenhum alimento encontrado.</p>'}</div>${max?`<div class="form-actions">${iconButton('Página anterior','data-food-page="-1"','left',foodPage?'':'disabled')}<small>Página ${foodPage+1} de ${max+1}</small>${iconButton('Próxima página','data-food-page="1"','right',foodPage<max?'':'disabled')}</div>`:''}`;
}
function historyView(){
  const dates=[...new Set([...state.entries.map(e=>e.date),...Object.keys(state.days).filter(d=>state.days[d].closed)])].sort().reverse();
  const week=Array.from({length:7},(_,i)=>shift(localDate(),i-6));
  const amounts=week.map(d=>total(entriesFor(d)).calories),high=Math.max(1,...amounts);
  return heading('Evolução','Histórico','Consulte calorias, metas e saldo de cada dia.')+`<section class="card"><div class="section-head"><h2>Últimos 7 dias</h2><small class="muted">Consumo registrado</small></div><div class="graph">${week.map((d,i)=>`<div class="graph-col"><b>${fmt(amounts[i])}</b><button class="${amounts[i]===0?'zero':''}" style="--h:${Math.max(4,amounts[i]/high*78)}%" data-open-date="${d}" aria-label="${dateText(d)}: ${fmt(amounts[i])} kcal" title="${fmt(amounts[i])} kcal"></button><span>${new Date(d+'T12:00:00').getDate()}</span></div>`).join('')}</div></section><section class="section"><div class="section-head"><h2>Registros diários</h2></div><div class="history-list">${dates.map(date=>{const e=entriesFor(date),d=dayInfo(date),t=d.profile?calculateTargets(d.profile):null,n=total(e).calories,b=dailyBalance(n,t,d.closed,e.length>0);return `<div class="card history-row"><div><strong>${dateText(date,true)}</strong><small>${d.closed?'Dia fechado':'Dia aberto'} · ${e.length} ${e.length===1?'alimento':'alimentos'}</small></div><div><strong>${fmt(n)} kcal</strong><small>${t&&!t.blocked?`Meta: ${fmt(t.calories)} kcal`:'Sem meta'}</small></div><div>${badge(b)}${b.difference!==undefined?`<small>${fmt(Math.abs(b.difference))} kcal ${b.difference<0?'abaixo':'acima'} do gasto estimado</small>`:''}</div>${iconButton('Abrir dia',`data-open-date="${date}"`,'right')}</div>`;}).join('')||'<div class="card empty">Os dias aparecem aqui conforme você registra as refeições.</div>'}</div></section>`;
}

function readProfileForm(form){const values=Object.fromEntries(new FormData(form));values.specialCare=form.elements.specialCare?.checked===true;return profileFromValues(values);}
function profilePreview(profile){
  if(!profile)return '<h2>Suas metas diárias</h2><p class="hint top-gap">Complete os campos. O cálculo aparece aqui e é salvo automaticamente.</p>';
  const t=calculateTargets(profile);
  return `<h2>Suas metas diárias</h2>${t.reason?`<p class="notice top-gap">${esc(t.reason)}</p>`:''}<div class="measure"><span>Calorias para ${GOALS[profile.goal].toLowerCase()}</span><strong>${fmt(t.calories)} kcal</strong></div>${macroInfo.map(([key,label])=>`<div class="measure"><span>${label}</span><strong>${fmt(t[key],1)} g</strong></div>`).join('')}<div class="measure"><span>Gasto em repouso estimado</span><strong>${fmt(t.resting)} kcal</strong></div><div class="measure"><span>Gasto diário estimado</span><strong>${fmt(t.expenditure)} kcal</strong></div><div class="guide"><b>${GOALS[profile.goal]}</b><p>${goalGuide[profile.goal]}</p></div>`;
}
let profileTimer,profileRevision=0;
function previewAndSaveProfile(form){
  clearTimeout(profileTimer);const revision=++profileRevision;
  const status=$('#profile-save-status');let profile;
  try{
    profile=readProfileForm(form);
    $('#profile-preview').innerHTML=profilePreview(profile);
    if(status)status.textContent='Metas calculadas. Salvando seu perfil…';
    if($('#profile-error'))$('#profile-error').textContent='';
  }catch(error){
    if(status)status.textContent='Complete os campos para calcular e salvar automaticamente.';
    return;
  }
  profileTimer=setTimeout(async()=>{
    try{
      await mutate(s=>saveProfileToState(s,profile,localDate()),false);
      if(revision!==profileRevision)return;
      if(page==='goals'&&$('#profile-save-status'))$('#profile-save-status').textContent='Perfil e metas salvos automaticamente.';
      else render();
    }catch(error){
      if(page==='goals'&&$('#profile-error'))$('#profile-error').textContent=error.message;
      else notify(error.message);
    }
  },300);
}
function goalsView(){
  const p=state.profile||{};
  return heading('Perfil e objetivos','Minhas metas','Preencha seu perfil. As metas são calculadas e salvas automaticamente.')+`<div class="two-col"><section class="card"><div class="section-head"><h2>Seu perfil</h2><small class="muted">A partir de 18 anos</small></div><form id="profile-form"><div class="formgrid"><label class="field full">Nome (opcional)<input name="name" maxlength="60" autocomplete="off" value="${esc(p.name)}" placeholder="Como podemos chamar você?"></label><label class="field">Idade<input type="text" inputmode="numeric" name="age" required maxlength="3" value="${p.age??''}" placeholder="Anos"></label><label class="field">Sexo para a fórmula<select name="sex" required><option value="">Selecione</option><option value="female" ${p.sex==='female'?'selected':''}>Feminino</option><option value="male" ${p.sex==='male'?'selected':''}>Masculino</option></select></label><label class="field">Peso (kg)<input name="weight" type="text" inputmode="decimal" maxlength="8" required value="${p.weight??''}" placeholder="Ex.: 75,5"></label><label class="field">Altura (cm ou m)<input name="height" type="text" inputmode="decimal" maxlength="8" required value="${p.height??''}" placeholder="Ex.: 175 ou 1,75"></label><label class="field full">Nível de atividade<select name="activity" required><option value="">Selecione</option>${Object.entries(ACTIVITY).map(([key,a])=>`<option value="${key}" ${key===p.activity?'selected':''}>${a.label} · ${a.detail}</option>`).join('')}</select></label><label class="field full">Objetivo<select name="goal" required><option value="">Selecione</option>${Object.entries(GOALS).map(([key,label])=>`<option value="${key}" ${key===p.goal?'selected':''}>${label}</option>`).join('')}</select></label><label class="check field full"><input name="specialCare" type="checkbox" ${p.specialCare?'checked':''}> Estou em gestação ou amamentação, tenho histórico de transtorno alimentar ou sigo uma dieta por orientação clínica.</label></div><p id="profile-save-status" class="hint top-gap" role="status">${state.profile?'Perfil salvo. As alterações serão calculadas automaticamente.':'Complete os campos para calcular e salvar automaticamente.'}</p><div class="form-actions"><button type="submit" class="btn primary">${ico('target')}Salvar e ver meu resumo</button></div><p id="profile-error" class="messages" role="alert"></p></form></section><aside class="card" id="profile-preview" aria-live="polite">${profilePreview(state.profile)}</aside></div>`;
}

function settingsView(){
  if(config.local!==false)return localSettingsView();
  const customKey=localStorage.getItem('nutra_gemini_key')||'';
  const status=config.configured?'Fotos habilitadas':'Sem chave';
  return heading('Privacidade e acesso','Ajustes','Seu diário fica salvo neste navegador. Exporte uma cópia para guardar ou transferir.')+`<div class="two-col"><section class="card"><div class="section-head"><h2>Análise de fotos</h2><span class="badge ${config.configured?'deficit':''}">${status}</span></div><p class="hint">A análise de fotos funciona sem senha. Escolha uma foto e autorize o envio ao Gemini. O app já inclui a chave padrão conectada ao Google.</p><form id="cloud-config-form" class="top-gap"><div class="formgrid"><label class="field full">Chave personalizada do Gemini (opcional)<input name="key" type="password" autocomplete="off" value="${esc(customKey)}" placeholder="${config.configured?'Chave padrão do servidor ativa (ou cole sua própria)':'Cole sua chave do Google AI Studio'}"></label></div><div class="form-actions"><button class="btn primary" type="submit">Salvar preferência</button><a class="btn text" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">Obter chave no AI Studio</a></div><p class="messages" id="cloud-config-status" role="alert"></p></form><p class="hint top-gap">No plano gratuito, o Google pode usar as imagens para melhorar os serviços. Envie somente a comida.</p></section><section class="card"><div class="section-head"><h2>Histórico e backup</h2></div><p class="hint">Os registros persistem neste navegador. Exporte uma cópia para transferir o diário para outro aparelho.</p><div class="form-actions">${button('Exportar meus dados','data-export','outline','download')}${button('Restaurar cópia','data-import','outline')}</div><input class="hidden" type="file" id="backup-input" accept=".json,application/json"></section></div>`;
}
function localSettingsView(){return heading('Privacidade e configuração','Ajustes','Gerencie a análise de fotos e faça uma cópia dos seus dados.')+`<div class="two-col"><section class="card"><div class="section-head"><h2>Análise de fotos</h2><span class="badge ${config.configured?'deficit':''}">${config.configured?'Chave configurada':'Sem chave'}</span></div><p class="hint">Cada análise exige sua autorização para enviar a imagem ao Gemini. O Google pode usar entradas do plano gratuito para melhorar seus serviços. Envie apenas fotos do prato, sem pessoas ou dados pessoais.</p><form id="config-form" class="top-gap"><div class="formgrid"><label class="field full">Chave da API<input name="key" type="password" required minlength="10" autocomplete="off" placeholder="${config.configured?'Digite uma nova chave para substituir':'Cole sua chave do Google AI Studio'}"></label><label class="field full">Modelo<input name="model" value="${esc(config.model||'gemini-3.1-flash-lite')}" required></label></div><div class="form-actions"><button class="btn primary" type="submit">Salvar chave</button><a class="btn text" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">Abrir AI Studio</a></div><p class="messages" id="config-error" role="alert"></p></form></section><section class="card"><div class="section-head"><h2>Dados locais</h2></div><p class="hint">Suas refeições, seu perfil e os alimentos personalizados ficam neste computador. A exportação JSON permite recuperar o histórico em outra instalação do Nutra.</p><div class="form-actions">${button('Exportar meus dados','data-export','outline','download')}${button('Restaurar cópia','data-import','outline')}</div><input class="hidden" type="file" id="backup-input" accept=".json,application/json"></section></div>`;}

function openModal(title,body,{wide=false}={}){dialog.classList.toggle('wide',wide);dialog.innerHTML=`<div class="dialog-head"><h2 id="dialog-title">${title}</h2>${iconButton('Fechar janela','data-close','close')}</div><div class="dialog-body">${body}</div>`;if(!dialog.open)dialog.showModal();}
function addModal(mode='manual',meal='Almoço',foodId='',entry=null,keepPhoto=false){
  if(mode==='photo'&&!keepPhoto){resetPhoto();}
  const tabs=entry?'':`<div class="tabs"><button type="button" data-tab="manual" data-meal="${meal}" class="${mode==='manual'?'active':''}">Busca manual</button><button type="button" data-tab="photo" data-meal="${meal}" class="${mode==='photo'?'active':''}">Analisar foto</button></div>`;
  if(mode==='photo'){
    openModal('Registrar refeição',tabs+`<div class="privacy">A foto vai ao Google somente quando você autorizar o envio. Confira alimentos, pesos e preparo antes de salvar.</div><label class="filepick">Tire uma foto ou escolha um arquivo<input id="photo-file" type="file" accept="image/*" aria-label="Escolher foto da refeição"></label><label class="filepick">Usar câmera traseira no celular<input id="photo-camera" type="file" accept="image/*" capture="environment" aria-label="Tirar foto da refeição"></label><div id="photo-preview"></div><div class="formgrid"><label class="field">Refeição<select id="photo-meal">${mealOptions(meal)}</select></label></div><div class="form-actions"><label class="check"><input type="checkbox" id="photo-consent"> Autorizo o envio desta foto ao Gemini.</label>${button('Analisar foto','data-analyze','primary','camera')}</div><p id="photo-error" class="messages" role="alert"></p><div id="photo-results"></div>`,{wide:true});
    updatePhoto(); return;
  }
  const chosen=entry?.food||allFoods().find(f=>f.id===foodId&&f.complete!==false);
  openModal(entry?'Editar registro':'Registrar alimento',tabs+`<form id="add-form" ${entry?`data-id="${esc(entry.id)}"`:''}><div class="formgrid"><label class="field">Refeição<select name="meal">${mealOptions(entry?.meal||meal)}</select></label><label class="field">Quantidade (g)<input name="grams" type="number" min="0.1" max="5000" step=".1" required value="${entry?.grams??100}"></label></div>${entry?'':`<div class="separator"><label class="field">Buscar alimento<input type="search" id="add-query" placeholder="Digite o nome ou o preparo" autocomplete="off"></label><div class="result-list" id="add-results"></div></div>`}<input name="foodId" type="hidden" value="${esc(chosen?.id)}"><div id="portion-preview"></div><div class="form-actions"><button class="btn primary" id="add-submit" ${chosen?'':'disabled'} type="submit">${ico('check')}${entry?'Salvar alterações':'Salvar no diário'}</button>${entry?'':button('Cadastrar pelo rótulo','data-custom','text','plus')}</div><p class="messages" id="add-error" role="alert"></p></form>`);
  if(!entry)renderAddResults();updatePortion();
}
function renderAddResults(){const q=$('#add-query')?.value||'';const list=searchFoods(q,allFoods().filter(f=>f.complete!==false),q?13:5);$('#add-results').innerHTML=list.map(f=>`<div class="result"><div><strong>${esc(f.name)}</strong><small>${fmt(f.calories)} kcal por 100 g</small></div>${button('Selecionar',`data-select-food="${esc(f.id)}"`,'outline')}</div>`).join('')||'<p class="empty">Nenhum alimento encontrado. Cadastre os valores pelo rótulo.</p>';}
function updatePortion(){const form=$('#add-form');if(!form)return;const e=state.entries.find(e=>e.id===form.dataset.id),food=e?.food||allFoods().find(f=>f.id===form.elements.foodId.value);if(!food){$('#portion-preview').innerHTML='';$('#add-submit').disabled=true;return;}$('#add-submit').disabled=false;let desc='';try{const v=portion(food,form.elements.grams.valueAsNumber);desc=`${fmt(v.calories)} kcal · P ${fmt(v.protein,1)} g · C ${fmt(v.carbs,1)} g · G ${fmt(v.fat,1)} g`;}catch{}$('#portion-preview').innerHTML=`<div class="notice top-gap"><b>${esc(food.name)}</b><div>${desc}</div></div>`;}
function customModal(){openModal('Cadastrar alimento',`<form id="custom-form"><p class="hint">Use os valores por 100 g do rótulo. Depois você escolhe quantos gramas comeu.</p><div class="formgrid top-gap"><label class="field full">Nome<input name="name" required maxlength="150" placeholder="Ex.: Iogurte natural da marca X"></label>${[['calories','Calorias (kcal)',1000],['protein','Proteínas (g)',100],['carbs','Carboidratos (g)',100],['fat','Gorduras (g)',100]].map(([k,label,max])=>`<label class="field">${label}<input name="${k}" type="number" min="0" max="${max}" step=".01" required></label>`).join('')}</div><div class="form-actions"><button class="btn primary" type="submit">Salvar alimento</button></div><p class="messages" id="custom-error" role="alert"></p></form>`);}
function resetPhoto(){photoLoadId++;if(photoUrl)URL.revokeObjectURL(photoUrl);photoUrl='';photoFile=null;photoItems=[];}
function updatePhoto(){if($('#photo-preview'))$('#photo-preview').innerHTML=photoUrl?`<img class="photo-preview" src="${photoUrl}" alt="Prévia da refeição para análise">`:'';renderPhotoItems();}
function makeFoodFromAi(item){
  const g=(typeof item.grams==='number'&&item.grams>0)?item.grams:100;
  const factor=100/g;
  let cal=(item.calories!=null&&item.calories>0)?item.calories*factor:0;
  let pro=(item.protein!=null&&item.protein>0)?item.protein*factor:0;
  let car=(item.carbs!=null&&item.carbs>0)?item.carbs*factor:0;
  let fat=(item.fat!=null&&item.fat>0)?item.fat*factor:0;
  if(cal===0&&pro===0&&car===0&&fat===0){
    const matches=matchFoods(item.name,allFoods().filter(f=>f.complete!==false));
    if(matches&&matches.length>0){
      const best=matches[0];
      return {id:'ai-'+crypto.randomUUID(),name:item.name||best.name,category:'Identificado por IA',source:'Estimativa por foto',calories:best.calories,protein:best.protein,carbs:best.carbs,fat:best.fat,fiber:best.fiber??null};
    }
    cal=120;car=15;pro=5;fat=2;
  }
  let calories=Math.min(1000,Math.max(0,Math.round(cal)));
  let protein=Math.min(100,Math.max(0,Math.round(pro*10)/10));
  let carbs=Math.min(100,Math.max(0,Math.round(car*10)/10));
  let fatVal=Math.min(100,Math.max(0,Math.round(fat*10)/10));
  const sum=protein+carbs+fatVal;
  if(sum>100){
    protein=Math.round((protein/sum)*95*10)/10;
    carbs=Math.round((carbs/sum)*95*10)/10;
    fatVal=Math.round((fatVal/sum)*95*10)/10;
  }
  if(calories===0)calories=Math.round(protein*4+carbs*4+fatVal*9);
  return validateFood({id:'ai-'+crypto.randomUUID(),name:String(item.name||'Alimento').trim().slice(0,150),category:'Identificado por IA',source:'Estimativa por foto',calories,protein,carbs,fat:fatVal,fiber:null});
}
function renderPhotoItems(notes=''){
  const out=$('#photo-results');if(!out)return;if(!photoItems.length){out.innerHTML=notes?`<p class="notice top-gap">${esc(notes)}</p>`:'';return;}
  out.innerHTML=`<section class="separator"><h3>Confira os alimentos e as quantidades</h3><p class="hint top-gap">Os alimentos, porções e valores nutricionais foram medidos e calculados pela IA com base na foto. Você pode ajustar o nome ou os gramas antes de salvar.</p>${notes?`<p class="notice top-gap">${esc(notes)}</p>`:''}<form id="photo-review">${photoItems.map((item,i)=>`<div class="photo-row" data-photo-row="${i}"><div class="detected">${esc(item.food.name)} <span class="badge">Confiança ${({high:'alta',medium:'média',low:'baixa'})[item.confidence]||'média'}</span></div><label class="field">Alimento<input type="text" name="n${i}" required maxlength="150" value="${esc(item.food.name)}"></label><label class="field">Gramas<input type="number" name="g${i}" required min=".1" max="5000" step=".1" value="${item.grams}"></label>${iconButton('Remover da revisão',`data-photo-remove="${i}"`,'trash')}${item.notes?`<p class="hint">${esc(item.notes)}</p>`:''}<p class="hint" data-photo-macros="${i}"></p></div>`).join('')}<div class="form-actions"><button class="btn primary" type="submit">${ico('check')}Salvar refeição no diário</button></div></form></section>`;photoItems.forEach((_,i)=>showPhotoMacros(i));
}
function showPhotoMacros(i){const item=photoItems[i],el=$(`[data-photo-macros="${i}"]`);if(!el||!item||!item.food)return;try{const n=portion(item.food,item.grams);el.textContent=`${fmt(n.calories)} kcal · P ${fmt(n.protein,1)} g · C ${fmt(n.carbs,1)} g · G ${fmt(n.fat,1)} g`;}catch{el.textContent='Informe um peso válido.';}}
async function handleAnalysis(btn){
  const error=$('#photo-error');error.textContent='';
  if(!config.configured){error.textContent='Configure o Gemini em Ajustes para analisar fotos.';return;}
  if(!photoFile){error.textContent='Escolha uma foto primeiro.';return;}
  if(!$('#photo-consent').checked){error.textContent='Autorize o envio da foto para continuar.';return;}
  const id=++photoLoadId;btn.disabled=true;btn.textContent='Analisando…';
  try{
    const customKey=localStorage.getItem('nutra_gemini_key')||'';
    const headers=customKey?{'x-gemini-key':customKey}:{};
    const data=await api('/api/analyze','POST',{image:await preparePhotoImage(photoFile),mimeType:'image/jpeg',consent:true},headers);
    if(id!==photoLoadId||!dialog.open)return;
    photoItems=data.items.map(x=>({...x,food:makeFoodFromAi(x)}));
    renderPhotoItems(data.notes||(!photoItems.length?'A IA não identificou alimentos na foto. Tente outra imagem.':''));
  }catch(e){
    if(id===photoLoadId&&dialog.open)error.textContent=e.message;
  }finally{
    if(id===photoLoadId&&dialog.open){btn.disabled=false;btn.innerHTML=ico('camera')+'Analisar foto';}
  }
}
function showConfirmation(title,text,action,label){openModal(title,`<p class="hint">${esc(text)}</p><div class="form-actions">${button(label,action,'primary','check')}${button('Cancelar','data-close','outline')}</div>`);}
function closeModal(){dialog.close();resetPhoto();}
function reopenIfEdited(next,date){snapshot(next,date).closed=false;}
function setPage(p){
  if(page==='goals'){
    const f=$('#profile-form');
    if(f){
      try{
        const prof=readProfileForm(f);
        saveProfileToState(state,prof,localDate());
        api('/api/state','PUT',state).catch(()=>{});
      }catch{}
    }
  }
  page=p;render();window.scrollTo(0,0);
}
document.addEventListener('click',async e=>{
  const b=e.target.closest('button');if(!b)return;const d=b.dataset;
  try{
    if(d.page){if(dialog.open)closeModal();setPage(d.page);}
    else if('close'in d)closeModal();
    else if(d.add)addModal(d.add,d.meal);
    else if(d.tab)addModal(d.tab,d.meal);
    else if('custom'in d)customModal();
    else if(d.dateShift){selectedDate=shift(selectedDate,Number(d.dateShift));render();}
    else if('today'in d){selectedDate=localDate();render();}
    else if(d.openDate){selectedDate=d.openDate;setPage('diary');}
    else if(d.foodPage){foodPage+=Number(d.foodPage);renderFoods();}
    else if(d.useFood){if(page==='foods')selectedDate=localDate();addModal('manual','Almoço',d.useFood);}
    else if(d.selectFood){$('#add-form').elements.foodId.value=d.selectFood;updatePortion();$('#add-form').elements.grams.focus();}
    else if(d.edit){const en=state.entries.find(x=>x.id===d.edit);if(en)addModal('manual',en.meal,'',en);}
    else if(d.remove)showConfirmation('Excluir registro?','O alimento será retirado dos totais do dia.',`data-confirm-remove="${esc(d.remove)}"`,'Excluir registro');
    else if(d.confirmRemove){const day=selectedDate;await mutate(s=>{s.entries=s.entries.filter(x=>x.id!==d.confirmRemove);reopenIfEdited(s,day);});closeModal();notify('Registro excluído.');}
    else if(d.day==='close')showConfirmation('Fechar o dia?','O saldo final usa apenas os alimentos registrados. Você pode reabrir o dia para fazer correções.','data-confirm-day','Fechar dia');
    else if('confirmDay'in d){const day=selectedDate;await mutate(s=>{snapshot(s,day).closed=true;});closeModal();notify('Dia fechado e salvo no histórico.');}
    else if(d.day==='open'){const day=selectedDate;await mutate(s=>{snapshot(s,day).closed=false;});notify('Dia reaberto.');}
    else if('analyze'in d)await handleAnalysis(b);
    else if('logout'in d){await api('/api/session','DELETE');config=await api('/api/config');render();notify('Acesso às fotos encerrado.');}
    else if('photoRemove'in d){photoItems.splice(Number(d.photoRemove),1);renderPhotoItems();}
    else if('export'in d){const href=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));Object.assign(document.createElement('a'),{href,download:`nutra-backup-${localDate()}.json`}).click();setTimeout(()=>URL.revokeObjectURL(href),500);notify('Cópia baixada.');}
    else if('import'in d)$('#backup-input').click();
  }catch(err){notify(err.message);}
});
document.addEventListener('input',e=>{
  const x=e.target;
  if(x.closest('#profile-form'))previewAndSaveProfile(x.closest('#profile-form'));
  if(x.id==='food-query'){foodQuery=x.value;foodPage=0;renderFoods();}
  if(x.id==='add-query')renderAddResults();
  if(x.name==='grams'&&x.closest('#add-form'))updatePortion();
  if(x.closest('#photo-review')&&/^g\d+$/.test(x.name)){const i=Number(x.name.slice(1));photoItems[i].grams=x.valueAsNumber;showPhotoMacros(i);}
  if(x.closest('#photo-review')&&/^n\d+$/.test(x.name)){const i=Number(x.name.slice(1));if(photoItems[i]?.food){photoItems[i].food.name=x.value.trim()||photoItems[i].food.name;}}
});
document.addEventListener('change',async e=>{
  const x=e.target;
  if(x.closest('#profile-form'))previewAndSaveProfile(x.closest('#profile-form'));
  if(x.id==='diary-date'&&normalizeDates(x.value)){selectedDate=x.value;render();}
  if(x.id==='food-category'){foodCategory=x.value;foodPage=0;renderFoods();}
  if(['photo-file','photo-camera'].includes(x.id)&&x.files[0]){resetPhoto();photoFile=x.files[0];photoUrl=URL.createObjectURL(photoFile);$('#photo-error').textContent='';updatePhoto();const b=$('[data-analyze]');b.disabled=false;b.innerHTML=ico('camera')+'Analisar foto';}
  if(x.id==='backup-input'&&x.files[0]){try{if(x.files[0].size>8*1024*1024)throw new Error('Cópia acima de 8 MB.');const restored=validateState(JSON.parse(await x.files[0].text()));if(!window.confirm('Substituir os dados locais pelo conteúdo desta cópia?'))return;await mutate(s=>Object.assign(s,restored));notify('Cópia restaurada.');}catch(err){notify(err.message);}finally{x.value='';}}
});
document.addEventListener('submit',async e=>{
  e.preventDefault();const f=e.target;const v=new FormData(f);const submit=$('[type="submit"]',f);if(submit)submit.disabled=true;
  try{
    if(f.id==='session-form'){await api('/api/session','POST',{password:v.get('password')});config=await api('/api/config');render();notify('Análise de fotos liberada.');}
    else if(f.id==='profile-form'){
      clearTimeout(profileTimer);profileRevision++;const p=readProfileForm(f);
      const targets=calculateTargets(p);await mutate(s=>saveProfileToState(s,p,localDate()));selectedDate=localDate();setPage('diary');notify(targets.reason?'Perfil salvo. Confira a orientação sobre sua meta.':'Perfil salvo. Suas metas já foram calculadas.');
    }else if(f.id==='cloud-config-form'){
      const key=String(v.get('key')||'').trim();
      if(key)localStorage.setItem('nutra_gemini_key',key);
      else localStorage.removeItem('nutra_gemini_key');
      render();notify('Chave salva no navegador.');
    }else if(f.id==='config-form'){
      config=await api('/api/config','POST',{key:v.get('key'),model:String(v.get('model')).trim()});render();notify('Chave salva localmente.');
    }else if(f.id==='custom-form'){
      const item=validateFood({id:'custom-'+crypto.randomUUID(),name:v.get('name'),calories:f.elements.calories.valueAsNumber,protein:f.elements.protein.valueAsNumber,carbs:f.elements.carbs.valueAsNumber,fat:f.elements.fat.valueAsNumber});await mutate(s=>s.customFoods.unshift(item));if(page==='foods')selectedDate=localDate();addModal('manual','Almoço',item.id);notify('Alimento cadastrado.');
    }else if(f.id==='add-form'){
      const date=selectedDate,original=state.entries.find(e=>e.id===f.dataset.id),food=original?.food||allFoods().find(x=>x.id===v.get('foodId')&&x.complete!==false);
      if(!food)throw new Error('Selecione um alimento.');const grams=f.elements.grams.valueAsNumber;portion(food,grams);const item={id:original?.id||crypto.randomUUID(),date:original?.date||date,meal:v.get('meal'),food,grams,viaPhoto:original?.viaPhoto||false};
      await mutate(s=>{if(original)s.entries=s.entries.map(e=>e.id===item.id?item:e);else s.entries.push(item);reopenIfEdited(s,item.date);});closeModal();setPage('diary');notify(original?'Registro atualizado.':'Alimento registrado.');
    }else if(f.id==='photo-review'){
      const meal=$('#photo-meal').value,date=selectedDate;
      if(!photoItems.length)throw new Error('Nenhum alimento na lista.');
      const items=photoItems.map((p,i)=>{
        const nameVal=f.elements['n'+i]?.value?.trim();
        if(nameVal)p.food.name=nameVal.slice(0,150);
        const grams=f.elements['g'+i]?.valueAsNumber||p.grams;
        const food=validateFood(p.food);
        portion(food,grams);
        return {id:crypto.randomUUID(),date,meal,food,grams,viaPhoto:true};
      });
      await mutate(s=>{s.entries.push(...items);reopenIfEdited(s,date);});closeModal();setPage('diary');notify('Refeição salva no diário.');
    }
  }catch(err){const element=$('.messages',f)||$('#photo-error');if(element)element.textContent=err.message;else notify(err.message);}
  finally{if(submit)submit.disabled=false;}
});
dialog.addEventListener('close',()=>{if(page!=='diary'||!$('#photo-results'))resetPhoto();});
try{config=await api('/api/config');const [s,catalogData]=await Promise.all([api('/api/state'),api('/data/foods.json')]);state=s;catalog=catalogData.foods;render();}catch(e){view.innerHTML=`<div class="notice">Não foi possível abrir o Nutra. ${esc(e.message)}</div>`;}
