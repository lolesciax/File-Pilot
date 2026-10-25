# Feature specification

All operations use local File/Blob data. Originals are never modified. Tools provide an accepted-format hint, validated file selection, options, processing feedback and downloadable output. Browser encoding support is checked rather than silently substituting another image type.

After processing, downloads appear above the tool workspace and are automatically brought into view with keyboard focus on the results heading. The newest operation's files are shown first; older results remain downloadable inside Previous results. ZIP export on the current batch packages that batch, while previous batches can be exported separately. Download labels remain visible on mobile. Clearing the workspace still removes all session outputs.

| Tool            | Implemented behavior                                                                                                                                      |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Merge PDF       | Multiple inputs, signature/parser validation, page counts, thumbnails, drag and keyboard ordering, real merged PDF                                        |
| Split PDF       | Page ranges, separate pages, semicolon-separated custom groups, individual outputs and ZIP                                                                |
| Organize PDF    | Visible thumbnails, drag and button ordering, selected rotation/removal, duplication                                                                      |
| Extract PDF     | Visual/range selection, combined or individual PDFs and ZIP download                                                                                      |
| Rotate PDF      | Selected/all pages, clockwise/counterclockwise, reset, non-destructive output                                                                             |
| PDF to images   | Selected pages, JPEG/PNG, 1–3× rendering, ZIP                                                                                                             |
| Images to PDF   | Ordered JPEG/PNG/WebP inputs, A3/A4/A5/A6, Short/Letter, Long/Folio, Legal, Tabloid and Executive, orientation, margins, alignment, contained proportions |
| Resize images   | Box, width, height, percentage, presets, aspect ratio lock, contain/cover/explicit stretch                                                                |
| Crop image      | Pointer/touch movement, corner resize, fixed/custom ratios, zoom, numeric/keyboard adjustment and live preview                                            |
| Convert images  | JPEG/PNG/WebP, checked encoder MIME, lossy quality, transparency flattening for JPEG                                                                      |
| Compress images | Re-encode JPEG/WebP, optional width reduction, accurate byte comparison, retain original when no improvement                                              |
| Batch rename    | Prefix/suffix, literal find/replace, numbering, start, separator, case, cleanup, live preview, safe unique ZIP names                                      |

Theme settings support light/dark/system; only theme persists. Active files/results are in-memory. No database, authentication or conversion service is required. See KNOWN_LIMITATIONS.md for scope and release qualifications.

## Office converters

The catalog and converter menus include six additional tools: Word→PDF (DOCX), Excel→PDF (XLSX), PowerPoint→PDF (PPTX), PDF→Word (DOCX reconstruction), PDF→Excel (XLSX selectable-text extraction), and PDF→PowerPoint (PPTX image-based slides). All run locally. Modern Office packages are validated for expected parts, compression limits, macros and XML declarations. PDF-source tools allow ordered page ranges and visual selection. Font substitutions and reader-reported conversion losses appear with the output. Office sources retain their own page/print/slide layout rather than applying the Images-to-PDF paper presets. See KNOWN_LIMITATIONS.md for supported scope and safety limits.

## Print page sizes

Images to PDF offers A3 (297 × 420 mm), A4 (210 × 297 mm), A5 (148 × 210 mm), A6 (105 × 148 mm), Short/Letter (8.5 × 11 in), Long/Folio (8.5 × 13 in), Legal (8.5 × 14 in), Tabloid (11 × 17 in), and Executive (7.25 × 10.5 in). Every size supports portrait and landscape. Long and Legal are distinct presets. The shared paper-size catalog converts physical dimensions to PDF points at 72 points per inch. The preview and export share page dimensions, margin validation and aspect-preserving image placement. Existing PDFs keep their original page sizes in merge/split/organize operations.
