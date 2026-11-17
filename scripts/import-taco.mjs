import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const index = JSON.parse(await readFile(path.join(root,'data/taco-original.json'),'utf8'));
const foods = [];
for(const item of index.foods) {
  const f = JSON.parse(await readFile(path.join(root,`data/taco-extraido/foods/${item.id}.json`),'utf8'));
  const zeroOil = f.lipids_g===100 && f.energy_kcal===884;
  const complete = ['energy_kcal','protein_g','carbohydrate_g','lipids_g'].every(k=>typeof f[k]==='number') || zeroOil;
  // Some difference-based carbohydrate measurements just below zero round to zero.
  const carbs = zeroOil || (f.carbohydrate_g < 0 && f.carbohydrate_g > -0.05) ? 0 : f.carbohydrate_g;
  foods.push({id:`taco-${f.id}`,name:f.description,category:f.category,calories:f.energy_kcal,protein:zeroOil?0:f.protein_g,carbs,fat:f.lipids_g,fiber:f.dietary_fiber_g,source:'TACO / NEPA-Unicamp, 4ª edição (2011)',sourceCode:f.id,complete});
}
await mkdir(path.join(root,'public/data'),{recursive:true});
await writeFile(path.join(root,'public/data/foods.json'), JSON.stringify({source:'TACO, NEPA/Unicamp, 4ª edição revisada e ampliada, 2011. Conversão JSON: Fabio F. Brolesi.',downloadedAt:'2026-11-17',basis:'100 g da parte comestível',foods}));
console.log(`${foods.length} alimentos importados, ${foods.filter(f=>f.complete).length} com calorias e macros por 100 g.`);
