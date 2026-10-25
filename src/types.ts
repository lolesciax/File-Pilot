import type { PaperSizeId } from "./lib/paperSizes";
export type Category = "pdf" | "image" | "batch";
export type ToolId =
  | "merge-pdf"
  | "split-pdf"
  | "organize-pdf"
  | "rotate-pdf"
  | "extract-pdf"
  | "pdf-to-images"
  | "images-to-pdf"
  | "resize-images"
  | "crop-image"
  | "convert-images"
  | "compress-images"
  | "word-to-pdf"
  | "excel-to-pdf"
  | "powerpoint-to-pdf"
  | "pdf-to-word"
  | "pdf-to-excel"
  | "pdf-to-powerpoint"
  | "batch-rename";
export interface Tool {
  id: ToolId;
  title: string;
  description: string;
  category: Category;
  icon: string;
  action: string;
  input?: "docx" | "xlsx" | "pptx";
}
export interface InputFile {
  id: string;
  file: File;
  pages?: number;
  width?: number;
  height?: number;
}
export interface OutputFile {
  id: string;
  name: string;
  blob: Blob;
  originalSize?: number;
  warnings?: string[];
}
export interface PageEdit {
  id: string;
  index: number;
  rotation: number;
  selected: boolean;
}
export interface Options {
  name: string;
  ranges: string;
  splitMode: "combined" | "individual" | "groups";
  format: "image/png" | "image/jpeg" | "image/webp";
  quality: number;
  width: number;
  height: number;
  resizeMode: "contain" | "cover" | "stretch";
  dimensionMode: "box" | "width" | "height" | "percent";
  percent: number;
  lock: boolean;
  background: string;
  scale: number;
  pageSize: PaperSizeId;
  orientation: "portrait" | "landscape";
  margin: number;
  alignment: "center" | "start" | "end";
  prefix: string;
  suffix: string;
  find: string;
  replace: string;
  start: number;
  separator: string;
  numbering: boolean;
  nameCase: "original" | "lower" | "upper";
  keepName: boolean;
  crop: { x: number; y: number; width: number; height: number };
  keepOriginal: boolean;
}
export const defaultOptions: Options = {
  name: "filepilot-output",
  ranges: "",
  splitMode: "combined",
  format: "image/jpeg",
  quality: 0.82,
  width: 1920,
  height: 1080,
  resizeMode: "contain",
  dimensionMode: "box",
  percent: 50,
  lock: true,
  background: "#ffffff",
  scale: 1.5,
  pageSize: "A4",
  orientation: "portrait",
  margin: 24,
  alignment: "center",
  prefix: "",
  suffix: "",
  find: "",
  replace: "",
  start: 1,
  separator: "_",
  numbering: true,
  nameCase: "original",
  keepName: true,
  crop: { x: 0, y: 0, width: 100, height: 100 },
  keepOriginal: true,
};
export type FileJobStatus =
  "queued" | "processing" | "completed" | "failed" | "cancelled";
export interface JobContext {
  signal: AbortSignal;
  progress: (completed: number, total: number, detail: string) => void;
  fileStatus?: (id: string, status: FileJobStatus) => void;
}
