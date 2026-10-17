import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(root, '../public');
const source = await readFile(join(root, 'src/index.js'), 'utf8');
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.webmanifest':'application/manifest+json; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png' };
const files = ['index.html','styles.css','app.js','manifest.webmanifest','icon.svg','sw.js'];
const assets = {};
for (const file of files) {
  const ext = file.slice(file.lastIndexOf('.'));
  assets['/'+file] = { type: types[ext] || 'application/octet-stream', body: await readFile(join(publicDir, file), 'utf8') };
}
if (!source.includes('const ASSETS = {};')) throw new Error('Could not find the asset marker in worker/src/index.js');
const bundled = source.replace('const ASSETS = {};', `const ASSETS = ${JSON.stringify(assets)};`);
await writeFile(join(root, 'index.js'), bundled, 'utf8');
console.log(`Generated worker/index.js with ${files.length} static files.`);
