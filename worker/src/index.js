const MODEL = '@cf/qwen/qwen3-30b-a3b-fp8';
const ASSETS = {};
const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
const rateBuckets = new Map();

function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS }); }
function asset(request) {
  const path = new URL(request.url).pathname;
  const key = path === '/' ? '/index.html' : path;
  const file = ASSETS[key];
  if (!file) return new Response('Not found', { status: 404 });
  return new Response(file.body, { headers: { 'content-type': file.type, 'cache-control': key === '/index.html' ? 'no-cache' : 'public, max-age=3600' } });
}
function extract(result) {
  let output = typeof result === 'string' ? result : result?.response || result?.result?.response || result?.generated_text || result?.output_text || '';
  if (typeof output !== 'string') return '';
  while (output.includes('<think>') || output.includes('</think>')) {
    const start = output.indexOf('<think>');
    const end = output.indexOf('</think>');
    if (start < 0 || end < start) return '';
    output = output.slice(0, start) + output.slice(end + '</think>'.length);
  }
  return output.trim();
}
async function explain(request, env) {
  if (request.method !== 'POST') return json({ error: 'POSTで質問を送ってください。' }, 405);
  if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'この画面から送信された質問だけを受け付けます。ページを再読み込みしてお試しください。' }, 403);
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return json({ error: '質問データの形式が正しくありません。' }, 415);
  const length = Number(request.headers.get('content-length') || 0);
  if (length > 32768) return json({ error: '質問データが大きすぎます。' }, 413);
  const now = Date.now();
  const client = request.headers.get('cf-connecting-ip') || 'unknown';
  const bucket = rateBuckets.get(client) || { start: now, count: 0 };
  if (now - bucket.start >= 60_000) { bucket.start = now; bucket.count = 0; }
  if (bucket.count >= 6) return json({ error: '質問が続いています。1分ほど待ってから再度お試しください。' }, 429);
  bucket.count += 1; rateBuckets.set(client, bucket);
  if (rateBuckets.size > 500) for (const [ip, item] of rateBuckets) if (now - item.start > 120_000) rateBuckets.delete(ip);
  let input;
  try {
    if (!request.body) return json({ error: '質問の内容がありません。' }, 400);
    const reader = request.body.getReader(); const chunks = []; let size = 0;
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 32768) { await reader.cancel(); return json({ error: '質問データが大きすぎます。' }, 413); } chunks.push(value); }
    const body = new Uint8Array(size); let offset = 0; for (const part of chunks) { body.set(part, offset); offset += part.byteLength; }
    input = JSON.parse(new TextDecoder().decode(body));
  } catch { return json({ error: '質問の形式を読み取れません。' }, 400); }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return json({ error: '質問の形式が正しくありません。' }, 400);
  const phrase = typeof input.phrase === 'string' ? input.phrase.trim() : '';
  const question = typeof input.question === 'string' ? input.question.trim() : '';
  const songTitle = typeof input.song?.title === 'string' ? input.song.title.slice(0, 120) : '';
  if (!phrase || !question) return json({ error: '語句と質問の両方を入力してください。' }, 400);
  if (phrase.length > 200 || question.length > 300 || phrase.split(/\s+/).length > 30) return json({ error: '語句は200文字・30語、質問は300文字以内で入力してください。' }, 413);
  const system = 'あなたは日本人向けの英語学習コーチです。利用者が入力した短い英語表現について、日本語で簡潔に語彙・文法・自然なニュアンスを説明し、必要なら短い自作例文を1つ付けてください。著作権のある歌詞の未入力部分を提供・推測・続きを再現してはいけません。長い歌詞や既存作品の長文翻訳の依頼は断り、選択された短い表現の学習解説に誘導してください。\n/no_think';
  const user = `曲名: ${songTitle || '指定なし'}\n学習する表現: ${phrase}\n質問: ${question}\n日本語で学習者にわかりやすく回答してください。`;
  const modelInput = { messages: [{ role: 'system', content: system }, { role: 'user', content: user }], max_tokens: 700, temperature: 0.7, top_p: 0.8, top_k: 20 };
  try {
    let result;
    if (env.AI?.run) {
      result = await env.AI.run(MODEL, modelInput);
    } else if (env.CF_ACCOUNT_ID && env.CLOUDFLARE_API_TOKEN) {
      const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(env.CF_ACCOUNT_ID)}/ai/run/${MODEL}`, {
        method: 'POST', headers: { authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`, 'content-type': 'application/json' },
        body: JSON.stringify(modelInput)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success === false) return json({ error: 'Cloudflare Workers AIへの接続に失敗しました。Workerのアカウント設定とAIトークンを確認してください。' }, 502);
      result = data.result;
    } else {
      return json({ error: 'Workers AIはまだ接続されていません。Cloudflare WorkerにAI binding（AI）を設定するか、SitesのランタイムsecretにCF_ACCOUNT_IDとCLOUDFLARE_API_TOKENを設定してください。' }, 503);
    }
    const answer = extract(result).trim();
    if (!answer) return json({ error: 'Workers AIから解説を受け取れませんでした。少し時間をおいて再度お試しください。' }, 502);
    return json({ answer, model: MODEL });
  } catch (error) {
    return json({ error: 'Workers AIの処理に失敗しました。モデルへのアクセス権と利用上限を確認してください。' }, 502);
  }
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/explain') return explain(request, env);
    return env.ASSETS?.fetch ? env.ASSETS.fetch(request) : asset(request);
  }
};
