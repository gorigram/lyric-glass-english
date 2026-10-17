# lyric glass

歌詞を自分で入力して英語表現を選び、日本語で質問するためのモバイルファーストPWAです。初期曲は Oasis「Don't Look Back in Anger」と Florence + the Machine「Dog Days Are Over」。歌詞や音源は取得・同梱せず、タイトルとアーティストの情報、公式音楽への検索リンク、タイトルに含まれる表現の短い学習メモを用意しています。質問解説はCloudflare Workers AIが実際に応答した場合だけ表示・保存されます。

**Workers AI接続はデフォルトでは無効です。** AI bindingまたはCloudflareのランタイムsecretを設定していないCloudflare Sitesでは、質問送信に503を返して設定手順を案内します。Sitesで実AIを動かすにはランタイムに `CF_ACCOUNT_ID` と `CLOUDFLARE_API_TOKEN` を設定してください。利用者のブラウザーや成果物にAPI tokenを含めないでください。

## 使い方

- 曲を開き、自分で用意した歌詞を貼り付けて「歌詞を保存」。保存先はブラウザーのlocalStorageです。
- テキストをドラッグ選択するか、行をタップして「この語句を質問」。AI解説に失敗したときは回答をノートに保存しません。
- 曲名カードの「学習メモ」はAI生成ではない編集済みの短い参考情報です。内容を読んでノートに保存できます。
- 「曲を追加」で曲名とアーティストを登録できます。歌詞は曲ごとに自分で追加します。
- iOS Safariでは共有メニューから「ホーム画面に追加」。対応ブラウザーではヘッダーのインストールボタンを使えます。

## 技術選定

- **HTML/CSS/JavaScript（依存なし）**: 画面と操作が小さく、ビルド時に外部ライブラリを取り込まずに済みます。SitesのWorker ESM starterは `worker/index.js` だけを配置するため、`worker/build-site-bundle.mjs` がPWAファイルを単一Workerに埋め込みます。ローカルの読みやすい編集元は `public/` と `worker/src/index.js` に分かれています。
- **Cloudflare Workers**: 静的ファイルと `/api/explain` を同一オリジンで配信できるため、ブラウザーにAI資格情報を置かずに済みます。通常のWrangler構成はCloudflareのネイティブWorkers AI binding `env.AI` を使います。Sites Worker向けはAI bindingが利用できない場合にも対応できるようWorkers AI REST APIのサーバー側secret経路も実装しています。未接続時は503を返し、案内を表示します。
- **Workers AI / `@cf/qwen/qwen3-30b-a3b-fp8`**: 多言語対応の指示モデルを日本語の語彙・文法解説に使います。短い学習解説用にQwen公式の非thinking推奨sampling値を設定し、system promptの`/no_think`で回答を簡潔にします。モデルが`<think>`ブロックを返してもUIへは出さず、final解説が欠けた場合はエラーにします。[Qwen3のthinking設定](https://qwen.readthedocs.io/en/stable/getting_started/quickstart.html)。モデル名はWorker内だけにあり、ブラウザーへ秘密情報は送信しません。利用にはCloudflareアカウントのWorkers AI利用設定と、bindingまたはREST API用の実行時認証が必要です。
- **localStorage**: MVPでは利用者の歌詞、登録曲、学習ノートを端末内に保存します。アカウントやサーバー同期はありません。ブラウザーのサイトデータを消すと保存内容も消えます。
- **PWA manifest + Service Worker**: ホーム画面追加と画面シェルのオフライン再表示を可能にします。AI質問にはネットワークとWorkers AI接続が必要です。
- **素のCSSによるLiquid Glass表現**: Apple HIGに合わせ、白い歌詞・解説面は不透明で読みやすくし、浮遊するボトムナビゲーションにだけ半透明・背景ぼかしを使いました。HIGはLiquid Glassをナビゲーションやコントロールの機能レイヤーに控えめに使い、内容面には標準マテリアルを使うよう説明しています。[Apple HIG: Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
- **アクセシビリティ**: 操作面を44px以上にし、ラベル、キーボードフォーカス、ライブ回答領域を設定しています。`prefers-reduced-motion` を尊重してアニメーションを抑えます。[Apple HIG: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) [Apple HIG: Motion](https://developer.apple.com/design/human-interface-guidelines/motion)

質問APIは同一オリジンのJSON POSTだけを受け付け、入力サイズ・選択語数を制限します。Worker isolate内に簡易の送信数制限もあります。Cloudflareの複数isolate/複数拠点にまたがる厳密な利用量管理には、公開前にアカウント側のrate limiting rule等を併用してください。

## 開発

通常のWorkerとして起動する場合は `worker/` で `npm install` の後、`npm run dev`。Sites Worker ESMへ組み込む場合は `node worker/build-site-bundle.mjs` を実行してからSitesスターターのビルドを行います。AI APIトークンはWrangler secretまたはホスティング側のランタイムsecretとして設定し、ファイルやフロントエンドへ保存しないでください。必要なREST環境変数名は `CF_ACCOUNT_ID` と `CLOUDFLARE_API_TOKEN` です。

## 参考資料

- [Cloudflare Workers AI bindings](https://developers.cloudflare.com/workers-ai/configuration/bindings/)
- [Cloudflare Workers AI REST API](https://developers.cloudflare.com/workers-ai/get-started/rest-api/)
- [Cloudflare Qwen3 model](https://developers.cloudflare.com/workers-ai/models/qwen3-30b-a3b-fp8/)
- [Apple HIG: Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
- [Apple HIG: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [Apple HIG: Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
