import { zipSync, strToU8 } from "fflate";
export const xml = (text: string) =>
  text
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g, "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
const declaration = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const relNs = "http://schemas.openxmlformats.org/package/2006/relationships";
const officeRel =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
export function relationships(
  items: { id: string; type: string; target: string }[],
) {
  return `${declaration}<Relationships xmlns="${relNs}">${items.map((item) => `<Relationship Id="${xml(item.id)}" Type="${officeRel}/${item.type}" Target="${xml(item.target)}"/>`).join("")}</Relationships>`;
}
export function officePackage(files: Record<string, string | Uint8Array>) {
  return zipSync(
    Object.fromEntries(
      Object.entries(files).map(([name, data]) => [
        name,
        typeof data === "string" ? strToU8(data) : data,
      ]),
    ),
    { level: 6 },
  );
}
export function createWorkbook(
  sheets: { name: string; rows: string[][] }[],
): Uint8Array {
  const ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
  function columnName(index: number) {
    let result = "";
    for (let n = index + 1; n; n = Math.floor((n - 1) / 26))
      result = String.fromCharCode(65 + ((n - 1) % 26)) + result;
    return result;
  }
  const files: Record<string, string> = {
    "_rels/.rels": relationships([
      { id: "rId1", type: "officeDocument", target: "xl/workbook.xml" },
    ]),
    "[Content_Types].xml": `${declaration}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`,
    "xl/workbook.xml": `${declaration}<workbook xmlns="${ns}" xmlns:r="${officeRel}"><sheets>${sheets.map((sheet, i) => `<sheet name="${xml(sheet.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": relationships(
      sheets.map((_, i) => ({
        id: `rId${i + 1}`,
        type: "worksheet",
        target: `worksheets/sheet${i + 1}.xml`,
      })),
    ),
  };
  let count = 0;
  sheets.forEach((sheet, i) => {
    files[`xl/worksheets/sheet${i + 1}.xml`] =
      `${declaration}<worksheet xmlns="${ns}"><sheetData>${sheet.rows
        .map(
          (row, r) =>
            `<row r="${r + 1}">${row
              .map((value, c) => {
                if (++count > 100000 || c >= 512 || r >= 100000)
                  throw new Error(
                    "Spreadsheet extraction exceeds the 100,000-cell or 512-column limit. Select fewer PDF pages.",
                  );
                if (value.length > 32767)
                  throw new Error(
                    "A text cell exceeds Excel’s 32,767-character limit. Select a smaller range.",
                  );
                return `<c r="${columnName(c)}${r + 1}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
              })
              .join("")}</row>`,
        )
        .join("")}</sheetData></worksheet>`;
  });
  return officePackage(files);
}
export function createPresentation(
  slides: { image: Uint8Array; label: string }[],
  widthPt: number,
  heightPt: number,
): Uint8Array {
  if (
    !Number.isFinite(widthPt) ||
    !Number.isFinite(heightPt) ||
    Math.min(widthPt, heightPt) < 72 ||
    Math.max(widthPt, heightPt) > 4032
  )
    throw new Error(
      "PowerPoint slide dimensions must be between 1 and 56 inches. This PDF page size is unsupported.",
    );
  const p = "http://schemas.openxmlformats.org/presentationml/2006/main",
    a = "http://schemas.openxmlformats.org/drawingml/2006/main";
  const w = Math.round(widthPt * 12700),
    h = Math.round(heightPt * 12700);
  const tree = `<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>`;
  const files: Record<string, string | Uint8Array> = {
    "_rels/.rels": relationships([
      { id: "rId1", type: "officeDocument", target: "ppt/presentation.xml" },
    ]),
    "[Content_Types].xml": `${declaration}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>${slides.map((_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join("")}</Types>`,
    "ppt/presentation.xml": `${declaration}<p:presentation xmlns:p="${p}" xmlns:a="${a}" xmlns:r="${officeRel}"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rIdMaster"/></p:sldMasterIdLst><p:sldIdLst>${slides.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 1}"/>`).join("")}</p:sldIdLst><p:sldSz cx="${w}" cy="${h}" type="custom"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`,
    "ppt/_rels/presentation.xml.rels": relationships([
      {
        id: "rIdMaster",
        type: "slideMaster",
        target: "slideMasters/slideMaster1.xml",
      },
      ...slides.map((_, i) => ({
        id: `rId${i + 1}`,
        type: "slide",
        target: `slides/slide${i + 1}.xml`,
      })),
    ]),
    "ppt/slideMasters/slideMaster1.xml": `${declaration}<p:sldMaster xmlns:p="${p}" xmlns:a="${a}" xmlns:r="${officeRel}"><p:cSld><p:spTree>${tree}</p:spTree></p:cSld><p:clrMap accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" bg1="lt1" bg2="lt2" folHlink="folHlink" hlink="hlink" tx1="dk1" tx2="dk2"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rIdLayout"/></p:sldLayoutIdLst><p:txStyles/></p:sldMaster>`,
    "ppt/slideMasters/_rels/slideMaster1.xml.rels": relationships([
      {
        id: "rIdLayout",
        type: "slideLayout",
        target: "../slideLayouts/slideLayout1.xml",
      },
      { id: "rIdTheme", type: "theme", target: "../theme/theme1.xml" },
    ]),
    "ppt/slideLayouts/slideLayout1.xml": `${declaration}<p:sldLayout xmlns:p="${p}" xmlns:a="${a}" xmlns:r="${officeRel}" type="blank" preserve="1"><p:cSld name="Blank"><p:spTree>${tree}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`,
    "ppt/slideLayouts/_rels/slideLayout1.xml.rels": relationships([
      {
        id: "rIdMaster",
        type: "slideMaster",
        target: "../slideMasters/slideMaster1.xml",
      },
    ]),
    "ppt/theme/theme1.xml": `${declaration}<a:theme xmlns:a="${a}" name="FilePilot"><a:themeElements><a:clrScheme name="FilePilot"><a:dk1><a:srgbClr val="10213B"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="59677B"/></a:dk2><a:lt2><a:srgbClr val="F6F8FA"/></a:lt2>${["087F75", "3669AD", "BB4E3C", "866719", "6E56A9", "087368"].map((color, i) => `<a:accent${i + 1}><a:srgbClr val="${color}"/></a:accent${i + 1}>`).join("")}<a:hlink><a:srgbClr val="087F75"/></a:hlink><a:folHlink><a:srgbClr val="6E56A9"/></a:folHlink></a:clrScheme><a:fontScheme name="FilePilot"><a:majorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="FilePilot"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst>${[6350, 12700, 19050].map((width) => `<a:ln w="${width}"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>`).join("")}</a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`,
  };
  slides.forEach((slide, i) => {
    files[`ppt/media/page${i + 1}.png`] = slide.image;
    files[`ppt/slides/_rels/slide${i + 1}.xml.rels`] = relationships([
      { id: "rIdImage", type: "image", target: `../media/page${i + 1}.png` },
      {
        id: "rIdLayout",
        type: "slideLayout",
        target: "../slideLayouts/slideLayout1.xml",
      },
    ]);
    files[`ppt/slides/slide${i + 1}.xml`] =
      `${declaration}<p:sld xmlns:p="${p}" xmlns:a="${a}" xmlns:r="${officeRel}"><p:cSld><p:spTree>${tree}<p:pic><p:nvPicPr><p:cNvPr id="2" name="PDF page ${i + 1}" descr="${xml(slide.label)}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rIdImage"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${w}" cy="${h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
  });
  return officePackage(files);
}
