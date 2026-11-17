export function normalizeApiKey(value){
  let key=String(value??'').trim().replace(/^GEMINI_API_KEY\s*=\s*/i,'').trim();
  if((key.startsWith('"')&&key.endsWith('"'))||(key.startsWith("'")&&key.endsWith("'")))key=key.slice(1,-1).trim();
  return key;
}
export function validateImageInput(data) {
  if(data.consent !== true) throw new Error('Autorize o envio desta foto ao Google para continuar.');
  if(!['image/jpeg','image/png','image/webp'].includes(data.mimeType) || typeof data.image !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(data.image)) throw new Error('Use uma imagem JPG, PNG ou WebP válida.');
  const b=Buffer.from(data.image,'base64');
  if(b.length>5*1024*1024 || b.length<20) throw new Error('A foto deve ter até 5 MB.');
  const valid=data.mimeType==='image/jpeg'?b[0]===255&&b[1]===216:data.mimeType==='image/png'?b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP';
  if(!valid)throw new Error('O conteúdo não corresponde ao formato da imagem.');
  return {mimeType:data.mimeType,data:data.image};
}
export function cleanAnalysis(result) {
  if(!result || !Array.isArray(result.items) || result.items.length>30)throw new Error('A IA retornou uma resposta inválida. Tente outra foto.');
  const items=result.items.map(i=>{
    if(typeof i.name!=='string'||!i.name.trim()||typeof i.grams!=='number'||!Number.isFinite(i.grams)||i.grams<.1||i.grams>5000)throw new Error('A IA não estimou as porções de forma válida. Tente outra foto.');
    const grams=Math.round(i.grams*10)/10;
    const calories=typeof i.calories==='number'&&Number.isFinite(i.calories)&&i.calories>=0?Math.round(i.calories):0;
    const protein=typeof i.protein==='number'&&Number.isFinite(i.protein)&&i.protein>=0?Math.round(i.protein*10)/10:0;
    const carbs=typeof i.carbs==='number'&&Number.isFinite(i.carbs)&&i.carbs>=0?Math.round(i.carbs*10)/10:0;
    const fat=typeof i.fat==='number'&&Number.isFinite(i.fat)&&i.fat>=0?Math.round(i.fat*10)/10:0;
    return {name:i.name.trim().slice(0,120),grams,calories,protein,carbs,fat,confidence:['high','medium','low'].includes(i.confidence)?i.confidence:'medium',notes:String(i.notes||'').slice(0,300)};
  });
  return {items,notes:String(result.notes||'').slice(0,700)};
}
export async function analyze(data, { apiKey, model, fetchGemini = fetch } = {}) {
  const image=validateImageInput(data);apiKey=normalizeApiKey(apiKey);
  if(!apiKey)throw Object.assign(new Error('Configure a chave Gemini em Configurações para analisar fotos.'),{status:503});
  const schema={type:'OBJECT',properties:{items:{type:'ARRAY',items:{type:'OBJECT',properties:{name:{type:'STRING'},grams:{type:'NUMBER'},calories:{type:'NUMBER'},protein:{type:'NUMBER'},carbs:{type:'NUMBER'},fat:{type:'NUMBER'},confidence:{type:'STRING',enum:['high','medium','low']},notes:{type:'STRING'}},required:['name','grams','calories','protein','carbs','fat','confidence']}},notes:{type:'STRING'}},required:['items','notes']};
  const prompt='Analise esta foto de uma refeição. Identifique separadamente os alimentos visíveis no prato, em português brasileiro. Para cada alimento identificado: 1) Estime a massa comestível em gramas (ex: 150). 2) Estime as calorias totais (kcal) e os macronutrientes totais dessa porção: proteína (g), carboidrato (g) e gordura (g), utilizando como referência a culinária brasileira e dados da tabela TACO/IBGE. Descreva tipo e preparo se reconhecíveis (ex: arroz branco cozido, frango grelhado). Se não houver comida reconhecível, retorne items vazio e explique em notes. Responda apenas no JSON solicitado.';
  let r;
  try{r=await fetchGemini(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:'POST',headers:{'content-type':'application/json','x-goog-api-key':apiKey},body:JSON.stringify({contents:[{parts:[{text:prompt},{inline_data:{mime_type:image.mimeType,data:image.data}}]}],generationConfig:{responseMimeType:'application/json',responseSchema:schema,temperature:.1,maxOutputTokens:4096}}),signal:AbortSignal.timeout(45000)});}catch{throw Object.assign(new Error('Não foi possível conectar ao Gemini. Confira a internet e tente novamente.'),{status:502});}
  if(!r.ok){
    let provider;try{provider=await r.json();}catch{}
    const detail=String(provider?.error?.message||'');
    const invalidKey=provider?.error?.details?.some(item=>item.reason==='API_KEY_INVALID')||/API key not valid|API_KEY_INVALID|invalid api key/i.test(detail);
    const unreadableImage=/image|decode|unsupported mime/i.test(detail)&&!invalidKey;
    const messages={400:invalidKey?'A chave Gemini configurada no servidor foi recusada pelo Google. Atualize GEMINI_API_KEY na Vercel.':unreadableImage?'O Google não conseguiu ler esta foto. Tente outra imagem JPG ou use a câmera.':'O Google recusou a solicitação. Confira a chave e o modelo Gemini configurados no servidor.',401:'A chave Gemini configurada no servidor não foi aceita.',403:'A chave não tem acesso ao Gemini. Confira as permissões no Google AI Studio.',404:'O modelo Gemini não está disponível para esta chave. Confira GEMINI_MODEL na Vercel.',429:'A cota gratuita do Gemini foi atingida ou não está disponível neste projeto. Tente mais tarde ou confira os limites no AI Studio.'};
    throw Object.assign(new Error(messages[r.status]||'O Gemini está indisponível. Tente novamente mais tarde.'),{status:r.status===429?429:502});
  }
  const result=await r.json();
  const text=result.candidates?.[0]?.content?.parts?.filter(p=>!p.thought).map(p=>p.text||'').join('');
  if(!text)throw Object.assign(new Error('Não foi possível analisar esta foto. Envie uma imagem nítida da refeição.'),{status:422});
  try{return cleanAnalysis(JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g,'')));}catch(e){throw Object.assign(new Error(e.message.startsWith('A IA')?e.message:'O Gemini retornou um formato inesperado. Tente novamente.'),{status:502});}
}
