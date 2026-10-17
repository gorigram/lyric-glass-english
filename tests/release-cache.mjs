import assert from 'node:assert/strict';
import worker from '../worker/index.js';

const origin = 'https://lyric-glass.test';
const release = '?release=5ec20cb6-r1';
const fetchAsset = (path, env = {}) => worker.fetch(new Request(`${origin}${path}`), env);

const htmlResponse = await fetchAsset('/');
assert.equal(htmlResponse.status, 200);
assert.equal(htmlResponse.headers.get('cache-control'), 'no-store');
const html = await htmlResponse.text();
assert.ok(html.includes(`/styles.css${release}`));
assert.ok(html.includes(`/app.js${release}`));

for (const path of [`/app.js${release}`, `/answer-format.mjs${release}`, `/styles.css${release}`, `/sw.js${release}`, '/manifest.webmanifest']) {
  const response = await fetchAsset(path);
  assert.equal(response.status, 200, `${path} is bundled`);
  assert.equal(response.headers.get('cache-control'), 'no-store', `${path} is revalidated`);
}

const staleAssets = { ASSETS: { async fetch() { return new Response('stale', { headers: { 'cache-control': 'public, max-age=3600' } }); } } };
const wrapped = await fetchAsset(`/app.js${release}`, staleAssets);
assert.equal(wrapped.headers.get('cache-control'), 'no-store', 'Cloudflare ASSETS cache headers are overridden');
const wrappedRoot = await fetchAsset('/', staleAssets);
assert.equal(wrappedRoot.headers.get('cache-control'), 'no-store', 'root document cache headers are overridden');

const appResponse = await fetchAsset(`/app.js${release}`);
const app = await appResponse.text();
assert.ok(app.includes(`./answer-format.mjs${release}`));
assert.ok(app.includes(`/sw.js${release}`));
assert.ok(app.includes("updateViaCache:'none'"));

const sw = await (await fetchAsset(`/sw.js${release}`)).text();
assert.ok(sw.includes('lyric-glass-shell-v4'));
assert.ok(sw.includes(`'/app.js${release}'`));
assert.ok(sw.includes("new Request(event.request,{cache:'no-store'})"));

console.log('release-cache: 22 checks passed');
