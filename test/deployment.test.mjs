import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('deploy inclui o catálogo público e exclui apenas os dados locais', async (t) => {
  const tempRoot = path.resolve(os.tmpdir());
  const fixture = await mkdtemp(path.join(tempRoot, 'nutra-deploy-'));
  assert.ok(path.resolve(fixture).startsWith(tempRoot + path.sep));
  t.after(() => rm(fixture, { recursive: true, force: true }));
  const rules = await readFile(new URL('../.vercelignore', import.meta.url), 'utf8');
  await writeFile(path.join(fixture, '.gitignore'), rules);
  const included = ['public/data/foods.json', 'public/index.html', 'api/analyze.js', 'lib/cloud-api.mjs', '.env.example', 'scripts/verify-build.mjs'];
  const excluded = ['data/state.json', 'data/taco-unicamp.xlsx', '.env', '.env.production', 'test/example.test.mjs'];
  for (const file of [...included, ...excluded]) {
    await mkdir(path.dirname(path.join(fixture, file)), { recursive: true });
    await writeFile(path.join(fixture, file), 'test');
  }
  const init = spawnSync('git', ['init', '--quiet'], { cwd: fixture, encoding: 'utf8', windowsHide: true });
  assert.equal(init.status, 0, init.stderr);
  const result = spawnSync('git', ['check-ignore', '--no-index', '-z', '--stdin'], {
    cwd: fixture, encoding: 'utf8', windowsHide: true,
    input: [...included, ...excluded].join('\0') + '\0'
  });
  assert.equal(result.status, 0, result.stderr);
  const ignored = new Set(result.stdout.split('\0').filter(Boolean));
  for (const file of included) assert.ok(!ignored.has(file), file + ' deve entrar no deploy');
  for (const file of excluded) assert.ok(ignored.has(file), file + ' deve ficar fora do deploy');
});
