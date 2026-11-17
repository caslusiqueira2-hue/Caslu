import { validateProfile } from './nutrition.mjs';

export function resolveDayInfo(state,date,today){
  const saved=state.days?.[date];
  const useCurrent=date===today||!saved?.profile;
  const profile=(useCurrent?state.profile:saved?.profile)??saved?.profile??null;
  return {closed:saved?.closed??false,profile,usesCurrentProfile:date!==today&&Boolean(useCurrent&&state.profile)};
}

export function saveProfileToState(state,input,today){
  const profile=validateProfile(input);
  state.profile=profile;
  if(!state.days)state.days={};
  state.days[today]={profile,closed:state.days[today]?.closed??false};
  return profile;
}

export function profileFromValues(values){
  const number=(value,label)=>{
    let text=String(value??'').trim().replace(',','.').replace(/[^0-9.]/g,'');
    if(!text||isNaN(Number(text)))throw new Error(label+': informe um número válido.');
    return Number(text);
  };
  let height=number(values.height,'Altura');
  if(height>=1.0&&height<=2.5)height=Math.round(height*100);
  return validateProfile({name:values.name,age:number(values.age,'Idade'),weight:number(values.weight,'Peso'),height,sex:values.sex,activity:values.activity,goal:values.goal,specialCare:values.specialCare===true});
}
