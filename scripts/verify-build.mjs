import { readFile, stat } from 'node:fs/promises';
const files=['public/index.html','public/responsive.css','public/viewport.mjs','public/manifest.webmanifest','public/icons/apple-touch-icon.png','public/icons/icon-192.png','public/icons/icon-512.png','public/icons/icon-1024.png','public/icons/favicon-32.png','public/app.mjs','public/style.css','public/nutrition.mjs','public/browser-storage.mjs','public/data/foods.json','api/analyze.js','api/config.js','api/session.js','gemini.mjs','lib/cloud-api.mjs'];
for(const name of files) {if(!(await stat(new URL('../'+name,import.meta.url))).isFile())throw new Error('Arquivo ausente: '+name);}
const catalog=JSON.parse(await readFile(new URL('../public/data/foods.json',import.meta.url),'utf8'));
if(catalog.foods.length!==597)throw new Error('O catálogo TACO deve conter 597 alimentos.');
console.log('Nutra pronto: arquivos estáticos em public e funções em api.');
