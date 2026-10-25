import type { ToolId } from "../types";
export const officeToolIds: ToolId[] = [
  "word-to-pdf",
  "excel-to-pdf",
  "powerpoint-to-pdf",
  "pdf-to-word",
  "pdf-to-excel",
  "pdf-to-powerpoint",
];
export const isOfficeTool = (id: ToolId) => officeToolIds.includes(id);
export const officeNotices: Partial<Record<ToolId, string>> = {
  "word-to-pdf":
    "DOCX only. Converts document content and supported layout. Fonts use bundled substitutes; complex formatting may change. Legacy .doc and password-protected files are not supported.",
  "excel-to-pdf":
    "XLSX only. Uses the workbook’s print layout and stored values. Unsupported formulas, charts or formatting may change. Macros, external data refresh and legacy .xls are not supported.",
  "powerpoint-to-pdf":
    "PPTX only. Converts supported slide content into static PDF pages. Animations, audio, video and some layouts or fonts may change. Legacy .ppt is not supported.",
  "pdf-to-word":
    "Creates an editable DOCX by reconstructing text and supported document structure. Layout can change. Scanned PDFs need OCR, which is not included.",
  "pdf-to-excel":
    "Extracts selectable text into editable XLSX cells, with one worksheet per selected PDF page. Rows and columns are inferred from positions. Original formulas, charts and exact table structure are not restored. No OCR.",
  "pdf-to-powerpoint":
    "Creates a PPTX with one rendered PDF page per slide. Page appearance is preserved as an image; text and shapes are not editable slide objects.",
};
export const officeMime = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
} as const;
