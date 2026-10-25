import { strToU8, strFromU8, unzipSync } from "fflate";
import {
  createWorkbook,
  createPresentation,
  officePackage,
  relationships,
} from "../../src/processing/office/ooxml";

export function wordFixture(text = "FilePilot Word fixture") {
  return officePackage({
    "[Content_Types].xml":
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    "_rels/.rels": relationships([
      { id: "rId1", type: "officeDocument", target: "word/document.xml" },
    ]),
    "word/document.xml": `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>${text}</w:t></w:r></w:p><w:p><w:r><w:t>Private browser conversion.</w:t></w:r></w:p><w:sectPr><w:pgSz w="12240" h="15840"/><w:pgMar top="1440" right="1440" bottom="1440" left="1440"/></w:sectPr></w:body></w:document>`,
  });
}
export function excelFixture() {
  return createWorkbook([
    {
      name: "Inventory",
      rows: [
        ["Item", "Quantity"],
        ["Apples", "12"],
        ["Pears", "8"],
      ],
    },
  ]);
}
export function powerpointFixture() {
  const base = createPresentation(
    [{ image: new Uint8Array(), label: "Fixture slide" }],
    720,
    405,
  );
  const parts = unzipSync(base);
  const slide = strFromU8(parts["ppt/slides/slide1.xml"]).replace(
    /<p:pic>[\s\S]*?<\/p:pic>/,
    "",
  );
  const text =
    '<p:sp><p:nvSpPr><p:cNvPr id="3" name="Title"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="457200" y="457200"/><a:ext cx="7315200" cy="914400"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" sz="2400"/><a:t>FilePilot presentation fixture</a:t></a:r></a:p></p:txBody></p:sp>';
  parts["ppt/slides/slide1.xml"] = strToU8(
    slide.replace("</p:spTree>", text + "</p:spTree>"),
  );
  return officePackage(parts);
}
