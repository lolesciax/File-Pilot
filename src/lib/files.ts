import { z } from "zod";
import type { Options } from "../types";
export const MAX_FILE = 100 * 1024 * 1024;
export const MAX_TOTAL = 300 * 1024 * 1024;
export function formatSize(n: number) {
  return n < 1024
    ? `${n} B`
    : n < 1024 ** 2
      ? `${(n / 1024).toFixed(1)} KB`
      : `${(n / 1024 ** 2).toFixed(1)} MB`;
}
export function safeName(name: string) {
  const cleaned = name
    .normalize("NFKC")
    .replace(/[\x00-\x1f\x7f<>:"/\\|?*]/g, "_")
    .replace(/\.{2,}/g, "_")
    .replace(/^[. ]+|[. ]+$/g, "")
    .slice(0, 180);
  return /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(cleaned)
    ? `_${cleaned}`
    : cleaned || "file";
}
export function uniqueNames(names: string[]) {
  const used = new Set<string>();
  return names.map((n) => {
    const clean = safeName(n);
    const dot = clean.lastIndexOf(".");
    const base = dot > 0 ? clean.slice(0, dot) : clean;
    const ext = dot > 0 ? clean.slice(dot) : "";
    let out = clean,
      i = 2;
    while (used.has(out.toLowerCase())) out = `${base} (${i++})${ext}`;
    used.add(out.toLowerCase());
    return out;
  });
}
export function renameFiles(names: string[], o: Options) {
  return uniqueNames(
    names.map((name, i) => {
      const dot = name.lastIndexOf(".");
      const ext = dot > 0 ? name.slice(dot) : "";
      let stem = dot > 0 ? name.slice(0, dot) : name;
      if (o.find) stem = stem.split(o.find).join(o.replace);
      const pieces = [
        o.prefix,
        o.keepName ? stem : "",
        o.numbering ? String(o.start + i).padStart(3, "0") : "",
        o.suffix,
      ].filter(Boolean);
      stem = pieces.join(o.separator);
      if (o.nameCase === "lower") stem = stem.toLowerCase();
      if (o.nameCase === "upper") stem = stem.toUpperCase();
      return stem + ext;
    }),
  );
}
export function parseRanges(value: string, count: number): number[] {
  if (!value.trim()) return Array.from({ length: count }, (_, i) => i);
  const out: number[] = [];
  for (const token of value.split(",")) {
    const m = token.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!m) throw new Error("Use page numbers and ranges, for example 1-3, 5.");
    const start = Number(m[1]),
      end = Number(m[2] ?? m[1]);
    if (start < 1 || end > count || end < start)
      throw new Error(
        `Page ranges must be between 1 and ${count}, in ascending order.`,
      );
    for (let p = start; p <= end; p++) out.push(p - 1);
    if (out.length > 2000) throw new Error("Select at most 2,000 pages.");
  }
  return out;
}
export async function validateFile(file: File, kind: "pdf" | "image" | "any") {
  if (!file.size) throw new Error(`${file.name}: the file is empty.`);
  if (file.size > MAX_FILE)
    throw new Error(`${file.name}: maximum file size is 100 MB.`);
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const pdf = String.fromCharCode(...b.slice(0, 5)) === "%PDF-";
  const png = b[0] === 137 && b[1] === 80 && b[2] === 78 && b[3] === 71;
  const jpg = b[0] === 255 && b[1] === 216 && b[2] === 255;
  const webp =
    String.fromCharCode(...b.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...b.slice(8, 12)) === "WEBP";
  if (kind === "pdf" && !pdf)
    throw new Error(`${file.name}: this is not a valid PDF file.`);
  if (kind === "image" && !(png || jpg || webp))
    throw new Error(
      `${file.name}: choose a JPEG, PNG, or WebP image. SVG, HEIC, and GIF are not supported.`,
    );
}
export const dimensionSchema = z.number().int().min(1).max(8192);
export function checkPixels(w: number, h: number) {
  dimensionSchema.parse(w);
  dimensionSchema.parse(h);
  if (w * h > 32_000_000)
    throw new Error("Image exceeds the 32 megapixel processing limit.");
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = safeName(name);
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
export function abort(signal: AbortSignal) {
  if (signal.aborted)
    throw new DOMException("Processing cancelled", "AbortError");
}
