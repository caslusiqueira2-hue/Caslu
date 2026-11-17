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
