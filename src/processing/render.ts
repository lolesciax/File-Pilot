import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { checkPixels } from "../lib/files";
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
export async function openRenderer(file: Blob) {
  return pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    cMapUrl: `${import.meta.env.BASE_URL}pdfjs/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${import.meta.env.BASE_URL}pdfjs/standard_fonts/`,
    wasmUrl: `${import.meta.env.BASE_URL}pdfjs/wasm/`,
  }).promise;
}
type Renderer = Awaited<ReturnType<typeof openRenderer>>;
const thumbnails = new WeakMap<File, Map<string, Promise<Blob>>>();
export function getThumbnail(
  file: File,
  index: number,
  rotation: number,
): Promise<Blob> {
  let cache = thumbnails.get(file);
  if (!cache) {
    cache = new Map();
    thumbnails.set(file, cache);
  }
  const key = `${index}:${rotation}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const promise = (async () => {
    const lease = acquirePreview(file);
    const canvas = document.createElement("canvas");
    try {
      await renderPage(await lease.document, index, 0.24, canvas, rotation);
      return await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (blob) =>
            blob
              ? resolve(blob)
              : reject(new Error("Preview encoding failed.")),
          "image/png",
        ),
      );
    } finally {
      lease.release();
      canvas.width = 0;
      canvas.height = 0;
    }
  })();
  cache.set(key, promise);
  if (cache.size > 120) cache.delete(cache.keys().next().value!);
  void promise.catch(() => cache?.delete(key));
  return promise;
}
const previews = new WeakMap<
  File,
  {
    promise: Promise<Renderer>;
    refs: number;
    timer?: ReturnType<typeof setTimeout>;
  }
>();
export function acquirePreview(file: File) {
  let entry = previews.get(file);
  if (!entry) {
    entry = { promise: openRenderer(file), refs: 0 };
    previews.set(file, entry);
  }
  if (entry.timer) clearTimeout(entry.timer);
  entry.refs++;
  const current = entry;
  let released = false;
  return {
    document: current.promise,
    release: () => {
      if (released) return;
      released = true;
      current.refs--;
      if (current.refs === 0)
        current.timer = setTimeout(() => {
          if (current.refs === 0) {
            previews.delete(file);
            void current.promise
              .then((doc) => doc.loadingTask.destroy())
              .catch(() => {});
          }
        }, 250);
    },
  };
}
export async function renderPage(
  doc: pdfjs.PDFDocumentProxy,
  index: number,
  scale: number,
  canvas: HTMLCanvasElement,
  rotation?: number,
) {
  const page = await doc.getPage(index + 1);
  const viewport = page.getViewport({
    scale,
    rotation: rotation === undefined ? page.rotate : page.rotate + rotation,
  });
  checkPixels(Math.ceil(viewport.width), Math.ceil(viewport.height));
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  await page.render({ canvas, viewport }).promise;
  page.cleanup();
}
