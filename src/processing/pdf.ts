import { PDFDocument, degrees } from "pdf-lib";
import { abort, parseRanges, safeName } from "../lib/files";
import type {
  InputFile,
  JobContext,
  Options,
  OutputFile,
  PageEdit,
  ToolId,
} from "../types";
export async function loadPDF(file: Blob) {
  try {
    const doc = await PDFDocument.load(await file.arrayBuffer());
    if (doc.getPageCount() > 2000)
      throw new Error("Documents are limited to 2,000 pages.");
    return doc;
  } catch (e) {
    if (e instanceof Error && /encrypt/i.test(e.message))
      throw new Error(
        "Password-protected PDFs are unsupported. Use an unencrypted copy you are authorized to access.",
      );
    throw new Error(
      e instanceof Error && e.message.includes("2,000")
        ? e.message
        : "This PDF is damaged or cannot be read. Try another copy.",
    );
  }
}
async function result(doc: PDFDocument, name: string): Promise<OutputFile> {
  const bytes = await doc.save();
  const verified = await PDFDocument.load(bytes);
  if (!verified.getPageCount())
    throw new Error("The output PDF contains no pages.");
  return {
    id: crypto.randomUUID(),
    name: safeName(name) + ".pdf",
    blob: new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
  };
}
export async function processPDF(
  id: ToolId,
  files: InputFile[],
  o: Options,
  pages: PageEdit[],
  ctx: JobContext,
): Promise<OutputFile[]> {
  const out = await PDFDocument.create();
  if (id === "merge-pdf") {
    for (let i = 0; i < files.length; i++) {
      abort(ctx.signal);
      const source = await loadPDF(files[i].file);
      const copied = await out.copyPages(source, source.getPageIndices());
      copied.forEach((p) => out.addPage(p));
      ctx.progress(i + 1, files.length, files[i].file.name);
    }
    return [await result(out, o.name)];
  }
  const source = await loadPDF(files[0].file);
  abort(ctx.signal);
  if (id === "organize-pdf" || id === "rotate-pdf") {
    if (!pages.length) throw new Error("Keep at least one page.");
    for (let i = 0; i < pages.length; i++) {
      abort(ctx.signal);
      const edit = pages[i];
      const [p] = await out.copyPages(source, [edit.index]);
      p.setRotation(degrees((p.getRotation().angle + edit.rotation) % 360));
      out.addPage(p);
      ctx.progress(i + 1, pages.length, `Page ${i + 1}`);
    }
    return [await result(out, o.name)];
  }
  const indices = parseRanges(
    id === "split-pdf" && o.splitMode === "groups" ? "" : o.ranges,
    source.getPageCount(),
  );
  const groups =
    (id === "split-pdf" || id === "extract-pdf") && o.splitMode === "individual"
      ? indices.map((i) => [i])
      : id === "split-pdf" && o.splitMode === "groups"
        ? o.ranges.split(";").map((g) => parseRanges(g, source.getPageCount()))
        : [indices];
  const results: OutputFile[] = [];
  for (let i = 0; i < groups.length; i++) {
    abort(ctx.signal);
    const doc = await PDFDocument.create();
    const copied = await doc.copyPages(source, groups[i]);
    copied.forEach((p) => doc.addPage(p));
    results.push(
      await result(doc, `${o.name}${groups.length > 1 ? `-${i + 1}` : ""}`),
    );
    ctx.progress(i + 1, groups.length, `Document ${i + 1}`);
  }
  return results;
}
