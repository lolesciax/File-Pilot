import type {
  InputFile,
  JobContext,
  Options,
  OutputFile,
  PageEdit,
  ToolId,
} from "../types";
import {
  abort,
  MAX_TOTAL,
  renameFiles,
  safeName,
  uniqueNames,
} from "../lib/files";
import { isOfficeTool } from "../lib/officeTools";
export interface RunResult {
  outputs: OutputFile[];
  errors: string[];
  cancelled: boolean;
}
export async function runTool(
  id: ToolId,
  files: InputFile[],
  o: Options,
  pages: PageEdit[],
  ctx: JobContext,
): Promise<RunResult> {
  if (!files.length) throw new Error("Select files before processing.");
  const outputs: OutputFile[] = [];
  const errors: string[] = [];
  try {
    if (isOfficeTool(id)) {
      ctx.fileStatus?.(files[0].id, "processing");
      let output: OutputFile;
      if (id === "pdf-to-excel" || id === "pdf-to-powerpoint") {
        const { exportPDFOffice } = await import("./office/pdfExports");
        output = await exportPDFOffice(id, files[0].file, o, ctx);
      } else {
        const { officeWorker } = await import("./office/workerClient");
        output = await officeWorker(
          { type: "convert", file: files[0].file, id, options: o },
          ctx.signal,
        );
      }
      abort(ctx.signal);
      ctx.fileStatus?.(files[0].id, "completed");
      ctx.progress(1, 1, "Conversion ready");
      return { outputs: [output], errors, cancelled: false };
    }
    if (id === "batch-rename") {
      const names = renameFiles(
        files.map((f) => f.file.name),
        o,
      );
      const { archive } = await import("./archive");
      abort(ctx.signal);
      const blob = await archive(
        files.map((f, i) => ({ name: names[i], blob: f.file })),
      );
      abort(ctx.signal);
      ctx.progress(files.length, files.length, "Archive ready");
      return {
        outputs: [
          { id: crypto.randomUUID(), name: safeName(o.name) + ".zip", blob },
        ],
        errors,
        cancelled: false,
      };
    }
    if (id === "images-to-pdf") {
      const { imagesToPDF } = await import("./image");
      return {
        outputs: await imagesToPDF(files, o, ctx),
        errors,
        cancelled: false,
      };
    }
    if (id === "pdf-to-images") {
      const { pdfToImages } = await import("./image");
      return {
        outputs: await pdfToImages(files[0].file, o, ctx),
        errors,
        cancelled: false,
      };
    }
    if (id.endsWith("-pdf")) {
      const { runPDFWorker } = await import("./pdfWorker");
      return {
        outputs: await runPDFWorker(id, files, o, pages, ctx),
        errors,
        cancelled: false,
      };
    }
    const { transformImage } = await import("./image");
    const names = uniqueNames(
      files.map(
        (f) =>
          `${f.file.name.replace(/\.[^.]+$/, "")}-${id === "crop-image" ? "cropped" : "processed"}.${o.format === "image/jpeg" ? "jpg" : o.format.split("/")[1]}`,
      ),
    );
    for (let i = 0; i < files.length; i++) {
      abort(ctx.signal);
      ctx.fileStatus?.(files[i].id, "processing");
      try {
        const blob = await transformImage(files[i].file, id, o);
        abort(ctx.signal);
        const keep =
          id === "compress-images" &&
          o.keepOriginal &&
          blob.size >= files[i].file.size;
        const output = keep ? files[i].file : blob;
        if (
          outputs.reduce((n, f) => n + f.blob.size, 0) + output.size >
          MAX_TOTAL
        )
          throw new Error("Batch output exceeds 300 MB. Process fewer files.");
        outputs.push({
          id: crypto.randomUUID(),
          name: keep ? safeName(files[i].file.name) : names[i],
          blob: output,
          originalSize: files[i].file.size,
        });
        ctx.fileStatus?.(files[i].id, "completed");
      } catch (e) {
        if (ctx.signal.aborted) {
          ctx.fileStatus?.(files[i].id, "cancelled");
          throw e;
        }
        ctx.fileStatus?.(files[i].id, "failed");
        errors.push(
          `${files[i].file.name}: ${e instanceof Error ? e.message : "Processing failed."}`,
        );
      }
      ctx.progress(i + 1, files.length, files[i].file.name);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    return { outputs, errors, cancelled: false };
  } catch (e) {
    if (ctx.signal.aborted) return { outputs, errors, cancelled: true };
    throw e;
  }
}
