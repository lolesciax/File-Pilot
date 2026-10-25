# Verification record

Vercel release preparation: Node.js 22, Vite/dist build settings, SPA deep links and the existing security policy are defined in vercel.json. The shared privacy notice now describes Vercel hosting. Production build/TypeScript, all 45 unit/component tests and 48 local production browser checks passed (58.3 seconds), covering completion, Office/PDF/image/ZIP outputs, privacy, CSP/worker/font behavior, responsive layout and accessibility. `FILEPILOT_BASE_URL` can point these browser checks at an HTTPS deployment without starting the local preview server. Live release verification is recorded separately after deployment.

Home navbar link: production build/TypeScript and all six scoped Chromium navigation checks passed (6.2 seconds). Checks include Home's route/active state, existing dropdown/mobile behavior, dark-theme axe scan and non-overlapping header controls at 801/820/1024/1440px. Compact laptop spacing accommodates the added link; mobile retains its existing Home entry.

Light-mode card colors: production build/TypeScript passed. Three scoped Chromium checks passed (10.7 seconds): the eight-width overflow/theme/navigation check, six representative axe scans, and visual capture. Light cards use existing palette tokens for subtle backgrounds, borders, matching icons and hover/focus accents. Word/PowerPoint badges now override the generic teal icon background. Dark styles are unchanged. Evidence: `screenshot-light-tool-cards.png`. Processing tests were not rerun for this visual-only change.

Final dedicated-completion regression: all 102 production Chromium tests passed in 4.1 minutes after the two legacy assertions were updated. This includes all 18 processing tools, real downloaded output verification, partial-success retries and ZIP contents, cancellation, saved-result navigation/cleanup, seven completion widths and the broader 26-route responsive audit. Production build/TypeScript, 45 unit/component tests, formatting, 20 focused Firefox checks and 20 focused WebKit checks also passed. No tests are left failing in these executed suites.

Dedicated completion-screen follow-up (25 October 2026): the production build/TypeScript check, all 45 unit/component tests and formatting checks passed. Firefox passed all 20 focused production checks (42.4 seconds); WebKit passed the same 20 (43.6 seconds). The 14 completion scenarios verify all seven requested widths (320/375/390/768/1024/1440/1920px), light/dark themes, full editor removal, visible success icon/download/Process Another controls, heading focus and live status, actual DOCX contents, associated notes, a 20-file ZIP and bounded keyboard-accessible individual list, three repeated conversions, preference retention with source-range reset, review/navigation without result loss, validation failure recovery, rejection of empty/missing generated output, and image-preview URL release. The other six focused cases cover existing touch controls, crop, drawer, short laptop and landscape navigation behavior.

The initial full run exposed two assertions against intentionally removed editor elements after completion. They were updated to verify the source thumbnail before conversion and its removal afterward, and to read the editable-DOCX disclosure from the completion notes. Both corrected tests passed their targeted recheck; no conversion algorithm changes were required. Saved evidence: `screenshot-completion-small-mobile.png`, `screenshot-completion-mobile.png` and `screenshot-completion-desktop.png`. Physical iOS/Android devices remain unverified. Earlier contextual-panel/bar records below describe the superseded interface.

Contextual results follow-up (25 October 2026): the production build/TypeScript check and all 44 unit/component tests passed. The full Chromium production suite passed 96/96 (4.8 minutes), including every converter, PDF/image/rename output checks, partial retries, cancellation, saved downloads, 26-route responsive matrices and accessibility scans. Four new state tests verify batch replacement, retained other-tool results, retry deduplication/naming, atomic memory-limit rejection and cleanup. The eight contextual-result browser scenarios verify PDF-to-Word downloads at 320/390/820/1280px, filename/format/size and notes, no completion scrolling or unrelated focus stealing, deliberate View results, keyboard batch expansion/downloads, exact ZIP contents, three repeated conversions without suffix accumulation, and failed conversion recovery.

The Firefox verification initially timed out in axe's temporary-page cleanup after a successful download. A trace isolated the blocked `Page.close`; the current test uses axe's same-page mode in Firefox (the app has no cross-origin frames), with the same accessibility tags. No application workaround or disabled accessibility rule was added. Final targeted results and screenshot references are recorded below.

Final follow-up after correcting the workflow-step numeral contrast with the existing teal-text token: the production build and formatting checks passed. All 14 focused checks passed in Chromium (24.5 seconds) and Firefox (35.0 seconds), including keyboard Process again focus restoration. WebKit passed all eight contextual-result scenarios and five other interaction checks (13/14 overall); its landscape menu tap did not navigate in that run, but passed an isolated traced recheck (0.9 seconds). A prior WebKit targeted run passed 14/14; the intermittent navigation check is recorded as such. The strengthened partial-retry test passed separately and inspected the actual ZIP: exactly two uniquely named outputs, matching the displayed count and retained success. Full processing regression remains Chromium coverage; physical iOS/Android devices are unverified.

Final evidence: `screenshot-contextual-results-desktop.png`, `screenshot-contextual-results-mobile.png` and `screenshot-contextual-floating-mobile.png`. Historical download screenshots below describe the superseded top-of-page results implementation.

Final responsive verification: TypeScript/production build, all 40 unit/component tests and formatting checks passed. The full production Chromium suite passed 93/93 tests (4.6 minutes); Firefox passed 29/29 responsive checks (4.7 minutes). WebKit passed 28/29 in its initial run (5.1 minutes); the 320×640 route matrix exceeded the 60-second test budget while showing the lazy-load status. That exact case passed independently in 12 seconds with failure tracing enabled, so all 29 WebKit scenarios have a passing execution, with the initial timeout recorded rather than treated as a clean full-suite pass. Physical-device testing remains outstanding.

Responsive audit (25 October 2026): `responsive.spec.ts` covers all 26 routes at 16 viewports from 320×640 to 2560×1440, including 560/561px and 800/801px breakpoint boundaries and 844×390 landscape. It also loads every tool at seven widths with long filenames and checks page-control overlap. `responsive-interactions.spec.ts` exercises 44px touch targets, PDF selection/rotation/duplication, portrait crop proportions, mobile input font sizes, drawer dismissal after scrolling, short-screen options/download visibility and touch navigation in landscape. The browser engine can be selected with `FILEPILOT_BROWSER=chromium|firefox|webkit`; `FILEPILOT_PORT` supports independent local servers. Physical iOS/Android devices are outside this emulated viewport audit.

Download visibility follow-up: all 64 production browser tests passed (1.2 minutes), all 40 unit/component tests passed, and TypeScript/production build passed. Five new scenarios verify actual Download buttons without manual scrolling at 1280×720, 390×844 and 320×640; heading focus on completion; results before the workspace; primary actions and readable labels; accessible dark/mobile results; latest-result prioritization with preserved/collapsed history; and current-batch ZIP downloads with valid PDF contents. Desktop/mobile evidence is saved in `screenshot-download-ready-desktop.png` and `screenshot-download-ready-mobile.png`.

Privacy-notice follow-up: TypeScript, the production build and all 40 unit/component tests passed. Three targeted production browser tests passed (7.0 seconds), covering footer/Settings/mobile entry points, direct navigation and reload, section anchors, notice date, the localStorage disclosure, safe external links, four responsive widths, dark mode and an axe scan. The root `PRIVACY.md` and `/privacy` page share `src/content/privacy.json`. The Vercel hosting paragraph was checked against Vercel's published privacy notice; live deployment configuration and log retention remain unverified.

Office extension final verification: all 56 production Chromium tests passed in 54.4 seconds, including all six converters, existing tools, nine paper sizes in both orientations, navigation, responsive layouts and accessibility scans. Forty unit/component tests passed across three files. TypeScript and the production build passed, and the registry dependency audit reported zero known vulnerabilities. Office tests inspect actual PDF/DOCX/XLSX/PPTX bytes, selected page order, preserved source text, literal worksheet cells, PNG slide images, package relationships and a PPTX→PDF reader round-trip. Worker-based Office→PDF browser tests also confirm there were no document upload requests or cross-origin asset requests. Macro/traversal/entity/compression-limit rejections and textless extraction errors are covered. Microsoft desktop Office interoperability remains unverified.

Environment: Windows, Node.js 22.20, installed Playwright Chromium. Test date: 25 October 2026 (Asia/Singapore). Controlled PDFs are generated with pdf-lib; image fixtures are generated with canvas. Downloaded outputs are read and checked, rather than accepting UI success messages as proof.

| Check                          | Result                                                                    |
| ------------------------------ | ------------------------------------------------------------------------- |
| TypeScript strict checking     | Passed                                                                    |
| Production build               | Passed; harmless upstream Zod comment annotation warnings                 |
| Vitest unit/component suites   | 40 tests passed across 3 files                                            |
| Chromium development workflows | 16-test core suite passed before production hardening                     |
| Chromium production workflows  | 56 tests passed against built assets with security headers (54.4 s)       |
| npm registry security audit    | Zero known vulnerabilities across production and development dependencies |

Unit tests cover ordered/invalid PDF ranges, real merge/split/group/extract/organize/rotation outputs, cancellation, malformed PDFs, dimension calculations, aspect ratio, unsafe sizes, signature checks, empty files, safe filenames, case-insensitive collisions, rename patterns, actual ZIP name/content mapping and Zustand transitions. Component tests cover tool search, file picker/drop, persistent theme selection and a confirmation dialog.

Production browser scenarios cover all eighteen tools, actual downloaded PDF page widths/order/rotation/count, JPEG/PNG/WebP signatures and image dimensions, JPEG transparency flattening, split ZIP contents, custom crop ratios/zoom/keyboard movement, batch partial success/retry, result retention, clear confirmation, invalid files/ranges, empty visual selection, cancellation/retry and no POST/PUT/PATCH requests during the tested PDF workflow. Production preview also applies the configured security headers.

Responsive checks: home, resize tool and settings at 320, 375, 390, 768, 1024, 1280, 1440 and 1920 pixels, asserting no horizontal overflow. Mobile navigation is tested at 390px. Light/dark persistence is tested. Axe scans check home, empty merge workspace and dark settings against WCAG A/AA tags. These are representative automated checks, not full WCAG certification or a complete assistive-technology assessment.

Screenshots are generated under ignored `output/playwright/`; selected documentation screenshots are retained in `docs/`. The UI was compared visually with the built-in image-generated reference in `docs/design-concept.png`.

Not verified: Firefox/Safari, real mobile hardware, full manual keyboard/screen-reader coverage, every tool at every viewport/theme combination, maximum-capacity file stress tests, exotic PDF font/color/image formats, corrupt/encrypted PDF variants beyond explicit parser handling, and a live Cloudflare deployment. No performance claim is based on maximum-size documents.

## Commands

Grouped-navigation follow-up: TypeScript and production build passed, and all 30 unit/component tests passed. Eight production browser checks passed (12.9 seconds): converter grouping/navigation, all twelve links in the mega menu, outside dismissal, hover and keyboard controls/Escape focus restoration, menu bounds at 820/1024/1440px, dark menu axe scan, mobile drawer navigation, visual captures, and the existing eight-width responsive and six-scan accessibility checks. No processing algorithms were changed in this follow-up.

Print-size expansion verification: TypeScript and production build passed; all 30 existing unit/component tests passed. A separate production Chromium suite (`paper-sizes.spec.ts`) passed 19 tests in 19.2 seconds: nine paper sizes in both orientations, actual downloaded PDF dimensions, matching preview aspect ratios, and rejection of margins that consume an A6 page. This is additional scoped verification; the earlier full-suite results above refer to the original release verification.

Final accessibility follow-up: the audit was expanded to desktop (1,280px) and mobile (390px) home, merge workspace and settings, and rerun against the final production build. All six scans passed with no axe violations. This caught and corrected missing mobile icon-link naming and transient contrast during theme restoration. The production build was rerun successfully after these final corrections.

```sh
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

For built assets and security headers, set `FILEPILOT_PRODUCTION=1` before `npm run test:e2e`. In PowerShell: `$env:FILEPILOT_PRODUCTION='1'; npm run test:e2e`. The test server stops after Playwright completes. In development mode, the production-header assertion is intentionally skipped.

For the additional responsive engine checks, install `npx playwright install firefox webkit`, then run the following in PowerShell (use `webkit` for the other engine):

```powershell
$env:FILEPILOT_PRODUCTION='1'
$env:FILEPILOT_BROWSER='firefox'
npm run test:e2e -- responsive.spec.ts responsive-interactions.spec.ts
```

Responsive screenshots are retained in `screenshot-responsive-mobile.png`, `screenshot-responsive-tablet.png` and `screenshot-responsive-laptop.png`. The viewport tests verify bounds and interactions rather than photographic device fidelity or performance on physical hardware.
