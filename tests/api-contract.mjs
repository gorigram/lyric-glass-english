import assert from 'node:assert/strict';
import worker from '../worker/index.js';

const ORIGIN = 'https://lyric-glass.test';
const results = [];
let sequence = 0;
let aiCalls = 0;
let captured;

async function check(name, { method = 'POST', body, contentType = 'application/json', origin = ORIGIN, env = {}, expectedStatus, inspect } = {}) {
  sequence += 1;
  const headers = { origin, 'cf-connecting-ip': `test-${sequence}` };
  if (contentType) headers['content-type'] = contentType;
  const init = { method, headers };
  if (body !== undefined && method !== 'GET' && method !== 'HEAD') init.body = typeof body === 'string' ? body : JSON.stringify(body);
  const response = await worker.fetch(new Request(`${ORIGIN}/api/explain`, init), env);
  assert.equal(response.status, expectedStatus, `${name}: HTTP status`);
  const payload = await response.json();
  inspect?.(payload, response);
  results.push({ name, status: response.status, result: 'PASS' });
  return payload;
}

const phrase = 'look back in anger';
const question = 'Explain the grammar and nuance in Japanese.';
const validBody = { phrase, question, song: { title: "Don't Look Back in Anger", artist: 'Oasis' } };

await check('GET is rejected', { method: 'GET', expectedStatus: 405, inspect: p => assert.ok(p.error) });
await check('cross-origin request is rejected', { origin: 'https://attacker.test', expectedStatus: 403, inspect: p => assert.ok(p.error) });
await check('non-JSON content type is rejected', { contentType: 'text/plain', body: JSON.stringify(validBody), expectedStatus: 415, inspect: p => assert.ok(p.error) });
await check('malformed JSON is rejected', { body: '{"phrase":', expectedStatus: 400, inspect: p => assert.ok(p.error) });
await check('JSON null is rejected as invalid request shape', { body: 'null', expectedStatus: 400, inspect: p => assert.ok(p.error) });
await check('missing required fields are rejected', { body: { phrase, question: '   ' }, expectedStatus: 400, inspect: p => assert.ok(p.error) });
await check('phrase over the configured bound is rejected', { body: { phrase: 'a'.repeat(201), question }, expectedStatus: 413, inspect: p => assert.ok(p.error) });
await check('request over the byte bound is rejected', { body: { phrase, question, extra: 'x'.repeat(33000) }, expectedStatus: 413, inspect: p => assert.ok(p.error) });
await check('valid input without a configured AI backend reports unavailable', { body: validBody, expectedStatus: 503, inspect: p => assert.match(p.error, /Workers AI.*接続されていません/) });
assert.equal(aiCalls, 0, 'invalid and unconfigured requests must not call AI');

const success = await check('stub AI response is returned in the documented JSON envelope', {
  body: validBody,
  env: { AI: { async run(model, input) { aiCalls += 1; captured = { model, input }; return { response: '<think>内部の推論。これは利用者へ表示しない。</think>「look back」は過去を振り返るという意味です。' }; } } },
  expectedStatus: 200,
  inspect: p => {
    assert.equal(p.answer, '「look back」は過去を振り返るという意味です。');
    assert.equal(p.model, '@cf/qwen/qwen3-30b-a3b-fp8');
    assert.deepEqual(Object.keys(p).sort(), ['answer', 'model']);
  }
});
assert.equal(aiCalls, 1);
assert.equal(captured.model, '@cf/qwen/qwen3-30b-a3b-fp8');
assert.equal(captured.input.max_tokens, 700);
assert.equal(captured.input.temperature, 0.7);
assert.equal(captured.input.top_p, 0.8);
assert.equal(captured.input.top_k, 20);
assert.equal(captured.input.messages[0].content.endsWith('/no_think'), true);
assert.equal(captured.input.messages[1].content.includes(phrase), true);
assert.equal(captured.input.messages[1].content.includes(question), true);
assert.equal(JSON.stringify(success).includes('CLOUDFLARE_API_TOKEN'), false);
results.push({ name: 'AI invocation receives bounded model request; response contains no secret fields', status: 'checked', result: 'PASS' });

await check('empty AI output is treated as an upstream failure', {
  body: validBody,
  env: { AI: { async run() { aiCalls += 1; return { response: '  ' }; } } },
  expectedStatus: 502,
  inspect: p => assert.ok(p.error)
});
assert.equal(aiCalls, 2);

await check('unclosed thinking output is rejected instead of exposed', {
  body: validBody,
  env: { AI: { async run() { aiCalls += 1; return { response: '<think>unfinished private reasoning' }; } } },
  expectedStatus: 502,
  inspect: p => assert.match(p.error, /解説を受け取れませんでした/)
});
assert.equal(aiCalls, 3);

await check('thinking output without a final explanation is rejected', {
  body: validBody,
  env: { AI: { async run() { aiCalls += 1; return { response: '<think>private reasoning</think>   ' }; } } },
  expectedStatus: 502,
  inspect: p => assert.match(p.error, /解説を受け取れませんでした/)
});
assert.equal(aiCalls, 4);

console.log(JSON.stringify({ tests: results, stubbedAIOnly: true, aiCalls }, null, 2));
