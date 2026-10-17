# Cloudflare Worker

`src/index.js` is the readable Worker source. For Cloudflare Sites' Worker ESM starter, run `node build-site-bundle.mjs` from this directory first; it writes a single `worker/index.js` that embeds the static PWA files. The Sites starter build copies only this entry point into its deployment artifact.

For a standalone Cloudflare Worker, run `npm install`, then `npm run dev` in this directory. Wrangler serves `../public` through the `ASSETS` binding and gives the Worker a native `AI` binding. Deploy with `npm run deploy` after `wrangler login`.

The Worker uses `env.AI.run()` when that binding is configured. It also supports the Workers AI REST API with `CF_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` runtime values. Set the API token with `npx wrangler secret put CLOUDFLARE_API_TOKEN`; never place it in client files or source. Without either real connection, `/api/explain` returns HTTP 503 with setup guidance. The browser never fabricates an AI answer.
