# Cloudflare Pages deployment

The user's selected future hosting target is Vercel, with pushing/deployment deferred. The following Cloudflare instructions are retained from the initial implementation. Before publishing to any host, review `/privacy` and `PRIVACY.md`: confirm the operator/contact route, provider, hosting logs/security configuration and whether analytics or any new data use has been enabled. Update the shared notice text in `src/content/privacy.json` and run `npm run privacy:sync`; the current notice explicitly describes Vercel as planned and the project as not yet deployed. Vercel does not apply Cloudflare `_headers`/`_redirects` automatically, so equivalent deployment configuration must be prepared at that stage.

This is a static SPA. No account service, database, secrets or backend are needed. Use Node.js 22.12+ (tested with 22.20).

1. Push this directory to your own Git repository.
2. In Cloudflare Pages, connect that repository.
3. Choose build command `npm run build`, output directory `dist`, project root this directory.
4. Deploy. Set `NODE_VERSION` to 22 if the hosting build uses an older runtime.

`public/_redirects` serves index.html for application routes. `public/_headers` sets CSP, nosniff, referrer restrictions, framing restrictions and disabled browser permissions. Vite copies both files into dist. Processing code, fonts and PDF.js worker assets are bundled locally. Base URL is `/`; a subpath host requires Vite base and Router basename adjustments.

Local production verification: `npm run build`, then `npm run preview -- --port 4173`. Open `http://127.0.0.1:4173` and test direct navigation to `/tool/merge-pdf`. A Vite preview plugin applies the same global policy from `public/_headers`, allowing tests to exercise CSP and worker behavior. Verify headers again on the deployed Pages URL. No actual deployment has been performed by this implementation task.

The predev/prebuild script copies PDF.js CMaps, standard fonts, ICC resources, decoder WASM and licensing from the installed package into generated `public/pdfjs/`. These files are included in dist; do not deploy just index.html and its JS. The CSP allows WebAssembly compilation for local PDF decoders without allowing arbitrary JavaScript eval.

CI runs type checking, unit/component tests, build and Chromium workflows. Install browsers with `npx playwright install chromium` for local browser testing.
