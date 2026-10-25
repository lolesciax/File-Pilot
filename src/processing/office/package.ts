import { unzipSync, strFromU8 } from "fflate";
export const OFFICE_MAX_FILE = 20 * 1024 * 1024;
export const OFFICE_MAX_EXPANDED = 80 * 1024 * 1024;
export type OfficeFormat = "docx" | "xlsx" | "pptx";
const mainPart = {
  docx: "word/document.xml",
  xlsx: "xl/workbook.xml",
  pptx: "ppt/presentation.xml",
};
/** Inspect central-directory limits before a ZIP library allocates decompressed buffers. */
export function checkOfficeZip(bytes: Uint8Array) {
  if (bytes.byteLength > OFFICE_MAX_FILE)
    throw new Error("Office inputs are limited to 20 MB.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let p = bytes.length - 22; p >= Math.max(0, bytes.length - 65557); p--)
    if (
      view.getUint32(p, true) === 0x06054b50 &&
      p + 22 + view.getUint16(p + 20, true) === bytes.length
    ) {
      end = p;
      break;
    }
  if (end < 0)
    throw new Error(
      "Invalid Office ZIP package. Password-protected and legacy Office files are unsupported.",
    );
  const count = view.getUint16(end + 10, true),
    offset = view.getUint32(end + 16, true),
    size = view.getUint32(end + 12, true);
  if (
    view.getUint16(end + 4, true) !== 0 ||
    view.getUint16(end + 6, true) !== 0 ||
    count !== view.getUint16(end + 8, true) ||
    count < 1 ||
    count > 2000 ||
    size === 0xffffffff ||
    offset === 0xffffffff ||
    offset + size > end
  )
    throw new Error(
      "Unsupported or oversized Office package (maximum 2,000 parts).",
    );
  let cursor = offset,
    total = 0;
  const names = new Set<string>();
  for (let i = 0; i < count; i++) {
    if (
      cursor + 46 > offset + size ||
      view.getUint32(cursor, true) !== 0x02014b50
    )
      throw new Error("Invalid Office package directory.");
    const flags = view.getUint16(cursor + 8, true),
      method = view.getUint16(cursor + 10, true),
      compressed = view.getUint32(cursor + 20, true),
      expanded = view.getUint32(cursor + 24, true),
      nameLen = view.getUint16(cursor + 28, true),
      extra = view.getUint16(cursor + 30, true),
      comment = view.getUint16(cursor + 32, true);
    if (cursor + 46 + nameLen + extra + comment > offset + size)
      throw new Error("Truncated Office package.");
    const name = strFromU8(bytes.slice(cursor + 46, cursor + 46 + nameLen));
    if (
      flags & 1 ||
      ![0, 8].includes(method) ||
      expanded === 0xffffffff ||
      name.includes("\\") ||
      name.startsWith("/") ||
      name.includes("\0") ||
      name.split("/").includes("..") ||
      names.has(name)
    )
      throw new Error("Unsafe, encrypted or unsupported Office package.");
    names.add(name);
    total += expanded;
    if (
      total > OFFICE_MAX_EXPANDED ||
      expanded / Math.max(1, compressed) > 1000
    )
      throw new Error(
        "Office package expands beyond the safe processing limit.",
      );
    cursor += 46 + nameLen + extra + comment;
  }
  if (cursor !== offset + size)
    throw new Error("Invalid Office package directory size.");
  return names;
}
export function inspectOfficePackage(
  bytes: Uint8Array,
  expected: OfficeFormat,
) {
  const names = checkOfficeZip(bytes);
  if (!names.has("[Content_Types].xml") || !names.has(mainPart[expected]))
    throw new Error(`This is not a valid ${expected.toUpperCase()} document.`);
  if ([...names].some((name) => /vbaProject\.bin$/i.test(name)))
    throw new Error(
      "Macro-enabled Office documents are unsupported. Save a macro-free copy.",
    );
  const entries = unzipSync(bytes);
  for (const [name, data] of Object.entries(entries))
    if (
      /\.(xml|rels)$/i.test(name) &&
      /<!DOCTYPE|<!ENTITY/i.test(strFromU8(data))
    )
      throw new Error(
        "XML document type and entity declarations are unsupported.",
      );
  return entries;
}
