# FilePilot implementation plan

Dedicated completion screen follow-up: supersedes the contextual panel/bar below. Replace the editor after valid processing with a shared completion screen and typed operation-specific messages/download labels. Keep single-file metadata/notes and bounded batch lists/ZIP exports. Preserve partial/cancelled outcomes across navigation; reject missing/empty generated output. Process Another clears current inputs/results/page ranges, preserves preferences and focuses upload; Review files and settings retains results. Verify seven completion widths, actual downloaded content, keyboard reset, preview URL release and all existing tools. Executed results are recorded in TESTING.md.

Contextual results follow-up: shared workflow-panel states and downloads, offscreen primary-action bar without automatic scrolling, filename/format/size, accessible batch expansion and conversion notes, and explicit latest-batch retention per tool. New runs replace current outputs; failed-file retries merge successes into the same batch. New state and browser checks cover repeated PDF-to-Word runs, real DOCX/ZIP downloads, failures, retries, counts, focus and responsive visibility. See TESTING.md for the executed verification record.

Repository inspection: empty directory; no existing application, Git repository, or local instructions. Stack: React, TypeScript strict, Vite, Tailwind v4, shadcn-style Radix primitives, Zustand, Zod, pdf-lib, PDF.js, fflate. No backend or document persistence.

| Phase          | Priority | Dependencies | Tasks and acceptance criteria                                                             | Status   |
| -------------- | -------- | ------------ | ----------------------------------------------------------------------------------------- | -------- |
| 0 Architecture | P0       | Inspection   | Document boundaries, routes, design tokens, browser limits                                | Complete |
| 1 Foundation   | P0       | 0            | Responsive home/catalog, navigation, themes, shared uploader, error boundary              | Complete |
| 2 PDF          | P0       | 1            | Merge, split, organize, rotate, extract; validate real outputs and page order             | Complete |
| 3 Images       | P0       | 1            | Resize, crop, convert, compress, images to PDF, PDF to images; verify formats/dimensions  | Complete |
| 4 Batch        | P0       | 1            | Rename preview, unique safe ZIP paths, sequential queue, cancellation and partial results | Complete |
| 5 Workspace    | P1       | 2–4          | In-memory files/results, progress, downloads, explicit cleanup                            | Complete |
| 6 Hardening    | P0       | 2–5          | Limits, validation, lazy libraries, resource cleanup, accessibility, security headers     | Complete |
| 7 Release      | P0       | All          | Unit/integration/E2E checks, responsive/theme review, production build, Cloudflare docs   | Complete |

Every advertised tool must generate real downloadable outputs. Never mark unexecuted checks as passed. Advanced parity gaps must be recorded in KNOWN_LIMITATIONS.md. No deployment is requested; prepare static output and instructions.

## Delivered and follow-up scope

Download visibility follow-up delivered: move results above both tool and standalone workspaces, reveal/focus newly completed downloads automatically, emphasize single-file and ZIP actions, retain visible Download labels on mobile, and collapse older operations behind Previous results. Dedicated production tests verify actual downloads without manual scrolling at 1280/390/320px, repeated conversion history and current-batch ZIP contents.

## Office conversion extension

Status: complete for the documented browser-local scope. Six routes are implemented and listed in the menus. Acceptance checks passed: 40 unit/component tests, 56 full production browser tests, TypeScript, build and dependency audit. Layout reconstruction, extracted cells and image-based slides are described explicitly in the interface. No backend or paid provider was introduced.

P0: add six genuine browser-local conversions: DOCX→PDF, XLSX→PDF, PPTX→PDF, PDF→DOCX, PDF→XLSX and PDF→PPTX. Use a lazy worker for Office parsing/reconstruction, bundled local fonts, strict OOXML ZIP limits and an explicit per-tool fidelity description. PDF→XLSX extracts positioned text into editable cells; PDF→PPTX creates image-based slides. Never claim restored formulas, OCR or editable slide objects. Add navigation entries only with working processing, validate generated packages/PDFs with controlled fixtures, test downloads and invalid input, audit dependencies, update limitations and deployment documentation. Preserve all existing tools and defer pushing/deployment.

Navigation follow-up delivered: reference-inspired Convert and All Tools dropdowns, grouped colored tool links, hover/click/keyboard support, focus restoration and dismissal, and matching grouped mobile navigation. Verified by eight targeted production browser checks plus all 30 existing unit/component tests and the production build.

Print-size follow-up delivered: shared presets for A3/A4/A5/A6, Short/Letter, Long/Folio, Legal, Tabloid and Executive; correct portrait/landscape dimensions; shared preview/export placement; explicit Long versus Legal labels. Acceptance verified through 19 additional production browser tests that inspect downloaded PDF dimensions and preview proportions.

Phases 0–6 are implemented for the documented core release. Phase 7 has a production build, unit/component suites, real-output browser workflows, responsive checks, representative axe scans, security-audit results, CI and static-host deployment files. The final verification record is in TESTING.md.

Responsive follow-up: scale the home illustration to its actual column, improve mobile card/file layouts, enlarge touch targets, preserve portrait crop proportions, keep navigation dismissal reachable and disable sticky options when they exceed the visible viewport. Regression coverage spans all 26 routes, all 18 populated tools, breakpoint boundaries, phone landscape and Chromium/Firefox/WebKit engines. See TESTING.md for results and device limits.

Release follow-up remains: Vercel deployment (the user's selected target), live header verification, physical Safari/iOS/Android testing, broader Firefox/WebKit processing verification, full assistive-technology audit, and representative large-document performance profiling. These are not recorded as passed. Optional future features (OCR, advanced PNG optimization, saved workspaces, PWA and watermarking) are not advertised as available. Pushing and deployment remain deferred at the user's request.
