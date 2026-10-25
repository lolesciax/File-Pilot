import { abort, MAX_TOTAL, parseRanges, safeName } from "../../lib/files";
import { officeMime, officeNotices } from "../../lib/officeTools";
import { createWorkbook, createPresentation } from "./ooxml";
import type { Options, OutputFile, JobContext } from "../../types";

export interface PositionedText {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
export function textRows(items: PositionedText[]): string[][] {
  const rows: { y: number; height: number; items: PositionedText[] }[] = [];
  for (const item of [...items]
    .filter((item) => item.text.trim())
    .sort((a, b) => a.y - b.y || a.x - b.x)) {
    const row = rows.at(-1);
    if (
      row &&
      Math.abs(row.y - item.y) <=
        Math.max(2, Math.min(row.height, item.height) * 0.35)
    )
      row.items.push(item);
    else rows.push({ y: item.y, height: item.height, items: [item] });
  }
  return rows
    .sort((a, b) => a.y - b.y)
    .map((row) => {
      const cells: string[] = [];
      let end = -Infinity;
      for (const item of row.items.sort((a, b) => a.x - b.x)) {
        const gap = item.x - end;
        if (!cells.length || gap > Math.max(12, item.height * 0.8))
          cells.push(item.text);
        else cells[cells.length - 1] += (gap > 1 ? " " : "") + item.text;
        end = item.x + item.width;
      }
      return cells;
    });
}
export async function exportPDFOffice(
  id: "pdf-to-excel" | "pdf-to-powerpoint",
  file: File,
  o: Options,
  ctx: JobContext,
): Promise<OutputFile> {
  const { openRenderer, renderPage } = await import("../render");
  const doc = await openRenderer(file);
  const canvas = document.createElement("canvas");
  try {
    const indices = parseRanges(o.ranges, doc.numPages);
    if (indices.length > 200)
      throw new Error("Office exports are limited to 200 selected pages.");
    const sheets: { name: string; rows: string[][] }[] = [],
      slides: { image: Uint8Array; label: string }[] = [];
    let total = 0,
      textCount = 0,
      textLength = 0;
    const first = await doc.getPage(indices[0] + 1);
    const slideSize = first.getViewport({ scale: 1 });
    first.cleanup();
    for (let i = 0; i < indices.length; i++) {
      abort(ctx.signal);
      const index = indices[i];
      if (id === "pdf-to-excel") {
        const page = await doc.getPage(index + 1),
          viewport = page.getViewport({ scale: 1 }),
          content = await page.getTextContent();
        const items = content.items
          .filter((item) => "str" in item)
          .map((item) => {
            const [x, y] = viewport.convertToViewportPoint(
              item.transform[4],
              item.transform[5],
            );
            return {
              text: item.str,
              x,
              y,
              width: item.width,
              height: Math.max(1, item.height),
            };
          });
        if (items.length > 50000)
          throw new Error(
            "This page contains too many text fragments to extract safely.",
          );
        const rows = textRows(items);
        textLength += rows.reduce(
          (n, row) => n + row.reduce((sum, cell) => sum + cell.length, 0),
          0,
        );
        if (textLength > 10_000_000)
          throw new Error(
            "Extracted text exceeds 10 million characters. Select fewer pages.",
          );
        textCount += rows.reduce((n, row) => n + row.length, 0);
        if (textCount > 100000)
          throw new Error(
            "Select fewer pages: extraction is limited to 100,000 cells.",
          );
        sheets.push({
          name: `Page ${index + 1}${indices.slice(0, i).includes(index) ? ` (${i + 1})` : ""}`,
          rows,
        });
        page.cleanup();
      } else {
        await renderPage(doc, index, o.scale, canvas);
        // PowerPoint uses one slide size per deck. Contain mixed page sizes without stretching.
        const fitted = document.createElement("canvas");
        fitted.width = Math.ceil(slideSize.width * o.scale);
        fitted.height = Math.ceil(slideSize.height * o.scale);
        try {
          const draw = fitted.getContext("2d")!;
          draw.fillStyle = "#ffffff";
          draw.fillRect(0, 0, fitted.width, fitted.height);
          const scale = Math.min(
              fitted.width / canvas.width,
              fitted.height / canvas.height,
            ),
            w = canvas.width * scale,
            h = canvas.height * scale;
          draw.drawImage(
            canvas,
            (fitted.width - w) / 2,
            (fitted.height - h) / 2,
            w,
            h,
          );
          const blob = await new Promise<Blob>((resolve, reject) =>
            fitted.toBlob(
              (blob) =>
                blob
                  ? resolve(blob)
                  : reject(new Error("Slide rendering failed.")),
              "image/png",
            ),
          );
          total += blob.size;
          if (total > 60 * 1024 * 1024)
            throw new Error(
              "Rendered slides exceed 60 MB. Select fewer pages or a lower scale.",
            );
          slides.push({
            image: new Uint8Array(await blob.arrayBuffer()),
            label: `Source PDF page ${index + 1}`,
          });
        } finally {
          fitted.width = 0;
          fitted.height = 0;
        }
      }
      ctx.progress(i + 1, indices.length, `Page ${index + 1}`);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    abort(ctx.signal);
    if (id === "pdf-to-excel" && !textCount)
      throw new Error(
        "No selectable text found. Scanned PDFs need OCR, which is not supported.",
      );
    const ext = id === "pdf-to-excel" ? "xlsx" : "pptx",
      bytes =
        id === "pdf-to-excel"
          ? createWorkbook(sheets)
          : createPresentation(slides, slideSize.width, slideSize.height);
    if (!bytes.length || bytes.length > MAX_TOTAL)
      throw new Error("Office output exceeds 300 MB.");
    return {
      id: crypto.randomUUID(),
      name: `${safeName(o.name)}.${ext}`,
      blob: new Blob([new Uint8Array(bytes)], { type: officeMime[ext] }),
      warnings: [
        officeNotices[id]!,
        ...(id === "pdf-to-excel" && sheets.some((sheet) => !sheet.rows.length)
          ? [
              "Some selected pages had no selectable text; their worksheets are empty.",
            ]
          : []),
      ],
    };
  } finally {
    canvas.width = 0;
    canvas.height = 0;
    await doc.loadingTask.destroy();
  }
}
