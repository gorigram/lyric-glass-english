# Workers API contract check

Node.jsから生成済み `worker/index.js` を直接importし、`fetch()`へHTTP Requestを渡してAPI契約とQwen3回答処理を検証します。`outputs/lyric-glass` ディレクトリで次を実行してください。

```sh
node tests/api-contract.mjs
```

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
| `<think>...</think>`付き回答 | 思考部分を除きfinalのみ200で返す | PASS |
| `env.AI.run()`の回答が空 | 502 | PASS |
| `</think>`のない未完了思考 | 502、思考内容を返さない | PASS |
| 思考ブロック後にfinal回答が空 | 502 | PASS |

stub確認では、想定model ID、700 max tokens、`temperature: 0.7`・`top_p: 0.8`・`top_k: 20`、system prompt末尾の`/no_think`、質問内容の渡し方、応答JSONのキーを確認しました。thinkingブロックは表示結果から除去し、閉じていないブロックやfinalが空の出力は502にします。stubによる200応答はWorkerのAPI契約確認だけを示し、実AIへのリクエストは発生させません。公開版のWorkers AI bindingを使った本番質問・保存・再読込は前版で別途確認済みです。最新の回答整形変更は本番再デプロイ待ちです。

Cloudflareへの推論リクエストは行っていません。Workerの実AI bindingを使わず、stub応答を与えて出力処理を検証します。
