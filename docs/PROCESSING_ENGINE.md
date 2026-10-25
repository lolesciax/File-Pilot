# Processing engine

## Office extension

`processing/office` handles package validation, browser worker RPC, Ream-based DOCX/XLSX/PPTX→PDF and PDF→DOCX conversion, positioned PDF text extraction to XLSX and page-image PPTX generation. The shared lifecycle remains unchanged. Ream is lazy-loaded inside an ES module worker; font bytes come from bundled PDF.js Liberation Sans resources, and remote font fetch is disabled. Source PDFs are parsed with pdf-lib first and only selected pages are passed to DOCX reconstruction. DOCX/PDF results are reparsed before download. Raw Office file contents are never injected into HTML.

ZIP central-directory guards run before decompression, checking entry count, methods, compressed/expanded sizes, duplicate/unsafe paths and encryption. OOXML content type/main-part presence is required; macros and DTD/entity declarations are rejected. Spreadsheet outputs encode every value as an inline string, preventing extracted text from becoming a formula. Slide packages include masters/layout/theme relationships and one PNG per slide, with no active objects or external resources. Result files include human-readable conversion notes.

## Shared processing

`types.ts` defines inputs, outputs, job context, page edits and options. `lib/files.ts` validates size/signatures, parses ordered page ranges, sanitizes filenames and resolves collisions. Tool options use Zod and explicit processing checks.

The engine dispatches PDF manipulation to a dedicated module worker, image transforms to browser canvas APIs, PDF rasterization to the bundled PDF.js worker, and ZIP work to fflate's asynchronous worker API. Files are processed sequentially to bound peak decode memory. ImageBitmap, canvas buffers, PDF loading tasks and object URLs are released after use. Thumbnail documents are shared per source File and destroyed after their final mounted consumer releases them. IntersectionObserver defers offscreen thumbnails.

PDF creation uses pdf-lib. Generated documents are reparsed before download. Page rotation adds to source orientation. Range order and duplicates are preserved. Groups use `;`, ranges use commas and hyphens. Image dimensions cap at 8,192 per edge / 32 million output pixels; source decoding caps at 50 million pixels. Canvas encoder results must have the requested MIME type. JPEG explicitly fills its background. Compression can preserve original bytes when there is no size benefit.

Lifecycle: idle → validating → idle/error → processing → success/error/cancelled. Progress counts completed units, never time-based estimates. PDF worker cancellation terminates that worker. Image operations and rasterization check cancellation between files/pages; in-flight native canvas encoding cannot be interrupted. Batch failures retain successful results; errors remain visible and the selected inputs allow retry.

ZIP files contain sanitized flat names, with case-insensitive collision handling. ZIP export is limited to 300 MB of uncompressed content. No source names become executable HTML.
