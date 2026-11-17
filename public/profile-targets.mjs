import { validateProfile } from './nutrition.mjs';
export function resolveDayInfo(state,date,today){
  const saved=state.days[date];
  const useCurrent=date===today||!saved?.profile;
  return {closed:saved?.closed??false,profile:(useCurrent?state.profile:saved.profile)??saved?.profile??null,usesCurrentProfile:date!==today&&Boolean(useCurrent&&state.profile)};
}
export function saveProfileToState(state,input,today){
  const profile=validateProfile(input);
  state.profile=profile;
  state.days[today]={profile,closed:state.days[today]?.closed??false};
  return profile;
}

export function profileFromValues(values){
  const number=(value,label)=>{
    const text=String(value??'').trim().replace(',','.');
    if(!text||!/^\d+(?:\.\d+)?$/.test(text))throw new Error(label+': informe um número válido.');
    return Number(text);
  };
  let height=number(values.height,'Altura');
  if(height>=1.2&&height<=2.3)height=Math.round(height*1000)/10;
  return validateProfile({name:values.name,age:number(values.age,'Idade'),weight:number(values.weight,'Peso'),height,sex:values.sex,activity:values.activity,goal:values.goal,specialCare:values.specialCare===true});
}
