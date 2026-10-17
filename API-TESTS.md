# Workers API contract check

2026-10-18に、最終生成済み `worker/index.js` をNode.jsから直接importし、`fetch()`へHTTP Requestを渡して契約を確認しました。アプリのソースは変更していません。

| 確認項目 | 期待結果 | 結果 |
|---|---:|---|
| GETで質問APIを呼び出す | 405 | PASS |
| 別Originから呼び出す | 403 | PASS |
| `text/plain`で送る | 415 | PASS |
| 不正JSON | 400 | PASS |
| JSON `null` | 400 | PASS |
| 必須項目の不足 | 400 | PASS |
| 表現が200文字を超える | 413 | PASS |
| 本文が32KBを超える（Content-Lengthなしのstreaming経路） | 413 | PASS |
| AI binding / REST credentialsなしで有効な質問を送る | 503 | PASS |
| `env.AI.run()`をstubして正常回答を返す | 200と`{answer, model}` | PASS |
| `env.AI.run()`の回答が空 | 502 | PASS |

stub確認では、想定model ID、700 max tokens、質問内容の渡し方、応答JSONのキーを確認しました。stubによる200応答はWorkerのAPI契約確認だけを示し、Cloudflare Workers AIの実接続を示しません。Cloudflare Sitesの本番runtime envは未設定のため、実AI接続・生成結果・本番推論は未検証です。

一時実行scriptは `work/api-contract.mjs` に置いています。Cloudflareへの推論リクエストは行っていません。
