import { Ream, parseTtf, type FontBytesByVariant } from "reamkit";
import { PDFDocument } from "pdf-lib";
import { inspectOfficePackage, type OfficeFormat } from "./package";
import { parseRanges, safeName } from "../../lib/files";
import { officeMime, officeNotices } from "../../lib/officeTools";
import type { Options, OutputFile, ToolId } from "../../types";

function textIn(value: unknown): string {
  if (
    !value ||
    typeof value !== "object" ||
    value instanceof Uint8Array ||
    value instanceof Map
  )
    return "";
  if (Array.isArray(value)) return value.map(textIn).join("");
  return Object.entries(value)
    .map(([key, item]) =>
      key === "text" && typeof item === "string" ? item : textIn(item),
    )
    .join("");
}
export async function convertOfficeBytes(
  id: ToolId,
  bytes: Uint8Array,
  o: Options,
  fonts: FontBytesByVariant,
): Promise<OutputFile> {
  const expected: OfficeFormat | undefined =
    id === "word-to-pdf"
      ? "docx"
      : id === "excel-to-pdf"
        ? "xlsx"
        : id === "powerpoint-to-pdf"
          ? "pptx"
          : undefined;
  let input = bytes;
  if (expected) inspectOfficePackage(input, expected);
  else {
    const source = await PDFDocument.load(input);
    const indices = parseRanges(o.ranges, source.getPageCount());
    if (indices.length > 200)
      throw new Error(
        "Office conversions are limited to 200 pages. Select fewer pages.",
      );
    const selected = await PDFDocument.create();
    (await selected.copyPages(source, indices)).forEach((page) =>
      selected.addPage(page),
    );
    input = await selected.save();
  }
  const source = Ream.parse(input);
  if (source.format !== (expected ?? "pdf"))
    throw new Error(
      "The document contents do not match the selected conversion.",
    );
  const text = textIn(source.flow.body);
  if (!expected && !text.trim())
    throw new Error(
      "No selectable text found. Scanned PDFs need OCR, which is not supported.",
    );
  if (expected) {
    const font = parseTtf(fonts.regular);
    const missing = [
      ...new Set(
        [...text].filter(
          (char) =>
            !/[\s\p{Default_Ignorable_Code_Point}\u0000-\u001f]/u.test(char) &&
            font.glyphForCodepoint(char.codePointAt(0)!) === 0,
        ),
      ),
    ];
    if (missing.length)
      throw new Error(
        `This document uses characters unavailable in the bundled conversion font (${missing
          .slice(0, 5)
          .map((char) => `U+${char.codePointAt(0)!.toString(16).toUpperCase()}`)
          .join(", ")}). This conversion cannot preserve that text.`,
      );
  }
  const target = expected ? "pdf" : "docx";
  const report = await source.convertWithReport(target, {
    fonts,
    fontFetch: async () => {
      throw new Error("Remote font downloads are disabled.");
    },
  });
  if (!report.bytes.length || report.bytes.length > 300 * 1024 * 1024)
    throw new Error("Conversion output is empty or exceeds 300 MB.");
  if (target === "pdf") {
    const doc = await PDFDocument.load(report.bytes);
    if (!doc.getPageCount() || doc.getPageCount() > 200)
      throw new Error(
        "Office conversion output must contain between 1 and 200 pages.",
      );
  } else inspectOfficePackage(report.bytes, "docx");
  const losses = [
    ...new Set(report.losses.map((loss) => `${loss.severity}: ${loss.detail}`)),
  ];
  return {
    id: crypto.randomUUID(),
    name: `${safeName(o.name)}.${target}`,
    blob: new Blob([new Uint8Array(report.bytes)], {
      type: target === "pdf" ? "application/pdf" : officeMime.docx,
    }),
    warnings: [
      officeNotices[id]!,
      ...(expected
        ? [
            "Text is rendered with bundled Liberation Sans font substitutes. Review the output before printing.",
          ]
        : []),
      ...losses.slice(0, 20),
      ...(losses.length > 20
        ? [`${losses.length - 20} additional conversion notices were reported.`]
        : []),
    ],
  };
}
