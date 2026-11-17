import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';

test('manifest e ícones de tela inicial apontam para PNGs com as dimensões declaradas', async () => {
  const base = new URL('../public/', import.meta.url);
  const manifest = JSON.parse(await readFile(new URL('manifest.webmanifest', base), 'utf8'));
  const html = await readFile(new URL('index.html', base), 'utf8');
  assert.equal(manifest.short_name, 'Nutra');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, '/');
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /rel="apple-touch-icon" sizes="180x180" href="\/icons\/apple-touch-icon\.png"/);
  for (const entry of [...manifest.icons, { src: '/icons/apple-touch-icon.png', sizes: '180x180' }]) {
    const data = await readFile(new URL(entry.src.slice(1), base));
    assert.ok(data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])));
    assert.equal(data.readUInt32BE(16) + 'x' + data.readUInt32BE(20), entry.sizes);
  }
});
