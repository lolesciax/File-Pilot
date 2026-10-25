import type { ToolId } from "../types";
import { tools } from "./catalog";

export const toolGroups: { title: string; ids: ToolId[] }[] = [
  {
    title: "Organize PDF",
    ids: [
      "merge-pdf",
      "split-pdf",
      "organize-pdf",
      "extract-pdf",
      "rotate-pdf",
    ],
  },
  {
    title: "Convert files",
    ids: [
      "images-to-pdf",
      "word-to-pdf",
      "excel-to-pdf",
      "powerpoint-to-pdf",
      "pdf-to-images",
      "pdf-to-word",
      "pdf-to-excel",
      "pdf-to-powerpoint",
      "convert-images",
    ],
  },
  {
    title: "Edit images",
    ids: ["resize-images", "crop-image", "compress-images"],
  },
  { title: "Batch tools", ids: ["batch-rename"] },
];
export const conversionGroups: { title: string; ids: ToolId[] }[] = [
  {
    title: "Convert to PDF",
    ids: ["images-to-pdf", "word-to-pdf", "powerpoint-to-pdf", "excel-to-pdf"],
  },
  {
    title: "Convert from PDF",
    ids: ["pdf-to-images", "pdf-to-word", "pdf-to-powerpoint", "pdf-to-excel"],
  },
];
export function navigationTool(id: ToolId) {
  return tools.find((tool) => tool.id === id)!;
}
