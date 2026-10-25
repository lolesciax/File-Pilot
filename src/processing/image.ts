import { PDFDocument } from "pdf-lib";
import { getPageDimensions, getImagePlacement } from "../lib/paperSizes";
import {
  abort,
  checkPixels,
  MAX_TOTAL,
  parseRanges,
  safeName,
} from "../lib/files";
import type {
  InputFile,
  JobContext,
  Options,
  OutputFile,
  ToolId,
} from "../types";
export async function decodeImage(blob: Blob): Promise<ImageBitmap> {
  try {
    const img = await createImageBitmap(blob);
    if (img.width * img.height > 50_000_000) {
      img.close();
      throw new Error("Source images are limited to 50 megapixels.");
    }
    return img;
  } catch (e) {
    throw new Error(
      e instanceof Error && e.message.includes("megapixels")
        ? e.message
        : "This image cannot be decoded. Choose a valid JPEG, PNG, or WebP file.",
    );
  }
}
export function dimensions(w: number, h: number, o: Options): [number, number] {
  if (o.dimensionMode === "percent")
    return [
      Math.max(1, Math.round((w * o.percent) / 100)),
      Math.max(1, Math.round((h * o.percent) / 100)),
    ];
  if (o.dimensionMode === "width")
    return [o.width, Math.max(1, Math.round((h * o.width) / w))];
  if (o.dimensionMode === "height")
    return [Math.max(1, Math.round((w * o.height) / h)), o.height];
  return [o.width, o.height];
}
export function drawFit(
  ctx: CanvasRenderingContext2D,
  img: ImageBitmap,
  w: number,
  h: number,
  mode: Options["resizeMode"],
) {
  if (mode === "stretch") {
    ctx.drawImage(img, 0, 0, w, h);
    return;
  }
  const scale =
    mode === "cover"
      ? Math.max(w / img.width, h / img.height)
      : Math.min(w / img.width, h / img.height);
  const dw = img.width * scale,
    dh = img.height * scale;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}
export async function encodeCanvas(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, quality),
  );
  if (!blob || blob.type !== type)
    throw new Error(
      `Your browser does not support ${type.split("/")[1]} encoding. Choose another format.`,
    );
  return blob;
}
export async function transformImage(
  file: File,
  id: ToolId,
  o: Options,
): Promise<Blob> {
  const img = await decodeImage(file);
  const canvas = document.createElement("canvas");
  try {
    let [w, h] =
      id === "resize-images"
        ? dimensions(img.width, img.height, o)
        : [img.width, img.height];
    if (id === "compress-images" && o.width < img.width) {
      w = o.width;
      h = Math.max(1, Math.round((img.height * w) / img.width));
    }
    if (id === "crop-image") {
      w = Math.max(1, Math.round((img.width * o.crop.width) / 100));
      h = Math.max(1, Math.round((img.height * o.crop.height) / 100));
    }
    checkPixels(w, h);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is unavailable in this browser.");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    if (o.format === "image/jpeg") {
      ctx.fillStyle = o.background;
      ctx.fillRect(0, 0, w, h);
    }
    if (id === "crop-image") {
      const c = o.crop;
      ctx.drawImage(
        img,
        (img.width * c.x) / 100,
        (img.height * c.y) / 100,
        (img.width * c.width) / 100,
        (img.height * c.height) / 100,
        0,
        0,
        w,
        h,
      );
    } else if (id === "resize-images") drawFit(ctx, img, w, h, o.resizeMode);
    else ctx.drawImage(img, 0, 0, w, h);
    return await encodeCanvas(canvas, o.format, o.quality);
  } finally {
    img.close();
    canvas.width = 0;
    canvas.height = 0;
  }
}
export async function imagesToPDF(
  files: InputFile[],
  o: Options,
  ctx: JobContext,
): Promise<OutputFile[]> {
  const pdf = await PDFDocument.create();
  const pageSize = getPageDimensions(o.pageSize, o.orientation);
  for (let i = 0; i < files.length; i++) {
    abort(ctx.signal);
    const png = await transformImage(files[i].file, "convert-images", {
      ...o,
      format: "image/png",
    });
    const image = await pdf.embedPng(await png.arrayBuffer());
    const page = pdf.addPage([pageSize.width, pageSize.height]);
    page.drawImage(
      image,
      getImagePlacement(pageSize, image, o.margin, o.alignment),
    );
    ctx.progress(i + 1, files.length, files[i].file.name);
  }
  const bytes = await pdf.save();
  await PDFDocument.load(bytes);
  return [
    {
      id: crypto.randomUUID(),
      name: safeName(o.name) + ".pdf",
      blob: new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
    },
  ];
}
export async function pdfToImages(
  file: File,
  o: Options,
  ctx: JobContext,
): Promise<OutputFile[]> {
  const { openRenderer, renderPage } = await import("./render");
  const doc = await openRenderer(file);
  const canvas = document.createElement("canvas");
  const results: OutputFile[] = [];
  try {
    let totalBytes = 0;
    const indices = parseRanges(o.ranges, doc.numPages);
    for (let i = 0; i < indices.length; i++) {
      abort(ctx.signal);
      await renderPage(doc, indices[i], o.scale, canvas);
      const blob = await encodeCanvas(canvas, o.format, o.quality);
      totalBytes += blob.size;
      if (totalBytes > MAX_TOTAL)
        throw new Error(
          "Rendered output exceeds 300 MB. Select fewer pages or a lower scale.",
        );
      results.push({
        id: crypto.randomUUID(),
        name: `${safeName(o.name)}-page-${indices[i] + 1}.${o.format === "image/jpeg" ? "jpg" : "png"}`,
        blob,
      });
      ctx.progress(i + 1, indices.length, `Page ${indices[i] + 1}`);
    }
    return results;
  } finally {
    canvas.width = 0;
    canvas.height = 0;
    await doc.loadingTask.destroy();
  }
}
