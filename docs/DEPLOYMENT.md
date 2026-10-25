# Vercel deployment

FilePilot is a static Vite SPA deployed from `lolesciax/File-Pilot`, branch `main`. It needs no backend, database, document uploads, analytics, environment variables or application secrets.

`vercel.json` selects Vite, runs `npm run build`, publishes `dist` and rewrites application routes to `index.html`. Vercel serves existing static files before the SPA fallback. It also applies the same CSP and security headers used by the local production preview. The Node.js runtime is pinned to 22.x in package.json.

The prebuild script copies PDF.js CMaps, fonts, ICC resources, decoder WASM and licenses from the installed package into generated `public/pdfjs/`. Deploy the complete build so the locally processed PDF/Office tools have their worker and font assets. Do not deploy only index.html and JavaScript.

The Vercel project is `file-pilot` in the connected account's default team. Git integration builds future pushes; verify the intended commit and successful GitHub checks before production releases. The original Cloudflare `_headers` and `_redirects` files remain available, but Vercel uses `vercel.json` rather than those files.

Local verification: `npm test`, `npm run build`, then run production browser checks with `FILEPILOT_PRODUCTION=1`. On the live deployment, verify `/`, `/tool/pdf-to-word` and `/privacy` directly, response security headers, worker/font assets and actual downloaded outputs. Live deployment results and URLs belong in TESTING.md.

The shared privacy notice in `src/content/privacy.json` describes Vercel hosting; run `npm run privacy:sync` after changing it to regenerate PRIVACY.md. Application processing remains local. Vercel's hosting/security logs are governed by its configuration and privacy notice; no specific hosting-log retention period is promised.
