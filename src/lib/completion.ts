import type { ToolId, OutputFile } from "../types";

export const completionMessages: Record<ToolId, string> = {
  "word-to-pdf": "Your Word document has been converted to PDF.",
  "excel-to-pdf": "Your Excel workbook has been converted to PDF.",
  "powerpoint-to-pdf":
    "Your PowerPoint presentation has been converted to PDF.",
  "pdf-to-word": "Your PDF has been converted to a Word document.",
  "pdf-to-excel": "Your PDF text has been exported to an Excel workbook.",
  "pdf-to-powerpoint": "Your PDF pages are ready as PowerPoint slides.",
  "merge-pdf": "Your PDFs have been merged.",
  "split-pdf": "Your PDF has been split into the requested files.",
  "organize-pdf": "Your PDF pages have been organized.",
  "rotate-pdf": "Your PDF pages have been rotated.",
  "extract-pdf": "Your selected PDF pages have been extracted.",
  "pdf-to-images": "Your PDF pages have been converted to images.",
  "images-to-pdf": "Your images have been combined into a PDF.",
  "resize-images": "Your images have been resized.",
  "compress-images":
    "Your images have been processed. Review the file sizes below.",
  "convert-images": "Your images have been converted.",
  "crop-image": "Your cropped image is ready.",
  "batch-rename": "Your renamed files are ready in a ZIP archive.",
};
export function downloadLabel(output: OutputFile) {
  const extension = output.name.split(".").pop()?.toLowerCase();
  const labels: Record<string, string> = {
    pdf: "Download PDF",
    docx: "Download Word",
    xlsx: "Download Excel",
    pptx: "Download PowerPoint",
    zip: "Download ZIP",
    jpg: "Download image",
    jpeg: "Download image",
    png: "Download image",
    webp: "Download image",
  };
  return labels[extension ?? ""] ?? "Download file";
}
