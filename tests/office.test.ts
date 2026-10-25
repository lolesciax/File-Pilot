// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { Ream } from "reamkit";
import { strFromU8, unzipSync } from "fflate";
import { defaultOptions, type ToolId } from "../src/types";
import { convertOfficeBytes } from "../src/processing/office/core";
import { inspectOfficePackage } from "../src/processing/office/package";
import { createWorkbook, officePackage } from "../src/processing/office/ooxml";
import { textRows } from "../src/processing/office/pdfExports";
import {
  wordFixture,
  excelFixture,
  powerpointFixture,
} from "./fixtures/office";
async function fonts() {
  return {
    regular: new Uint8Array(
      await readFile(
        "node_modules/pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf",
      ),
    ),
    bold: new Uint8Array(
      await readFile(
        "node_modules/pdfjs-dist/standard_fonts/LiberationSans-Bold.ttf",
      ),
    ),
  };
}
describe("real Office conversions", () => {
  it.each([
    ["word-to-pdf", wordFixture, "Word fixture"],
    ["excel-to-pdf", excelFixture, "Apples"],
    ["powerpoint-to-pdf", powerpointFixture, "presentation fixture"],
  ] as const)(
    "%s generates a readable PDF with source text",
    async (id, fixture, text) => {
      const result = await convertOfficeBytes(
        id as ToolId,
        fixture(),
        defaultOptions,
        await fonts(),
      );
      const bytes = new Uint8Array(await result.blob.arrayBuffer());
      const pdf = await PDFDocument.load(bytes);
      expect(pdf.getPageCount()).toBeGreaterThan(0);
      expect(
        new TextDecoder().decode(await Ream.parse(bytes).convert("md")),
      ).toContain(text);
      if (id === "powerpoint-to-pdf")
        expect(pdf.getPage(0).getSize()).toEqual({ width: 720, height: 405 });
    },
  );
  it("PDF to DOCX creates editable document text and respects page selection", async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage().drawText("First page");
    pdf.addPage().drawText("Second page");
    const out = await convertOfficeBytes(
      "pdf-to-word",
      await pdf.save(),
      { ...defaultOptions, ranges: "2" },
      await fonts(),
    );
    const parts = inspectOfficePackage(
      new Uint8Array(await out.blob.arrayBuffer()),
      "docx",
    );
    const xml = strFromU8(parts["word/document.xml"]);
    expect(xml).toContain("Second");
    expect(xml).not.toContain("First");
  });
  it("rejects scanned PDFs instead of generating an empty editable document", async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage();
    await expect(
      convertOfficeBytes(
        "pdf-to-word",
        await pdf.save(),
        defaultOptions,
        await fonts(),
      ),
    ).rejects.toThrow("No selectable text");
  });
});
describe("Office safety and exports", () => {
  it("rejects mismatched Office package types", () =>
    expect(() => inspectOfficePackage(wordFixture(), "xlsx")).toThrow(
      "valid XLSX",
    ));
  it("rejects traversal, macros and XML entity declarations", () => {
    const parts = unzipSync(wordFixture());
    expect(() =>
      inspectOfficePackage(
        officePackage({ ...parts, "../bad.xml": "bad" }),
        "docx",
      ),
    ).toThrow("Unsafe");
    expect(() =>
      inspectOfficePackage(
        officePackage({ ...parts, "word/vbaProject.bin": "macro" }),
        "docx",
      ),
    ).toThrow("Macro");
    expect(() =>
      inspectOfficePackage(
        officePackage({
          ...parts,
          "word/document.xml": '<!DOCTYPE x [<!ENTITY x "test">]><x>&x;</x>',
        }),
        "docx",
      ),
    ).toThrow("entity");
  });
  it("rejects oversized inflated content before decompression", () => {
    const parts = unzipSync(wordFixture());
    expect(() =>
      inspectOfficePackage(
        officePackage({ ...parts, "word/huge.xml": "x".repeat(3_000_000) }),
        "docx",
      ),
    ).toThrow("expands");
  });
  it("writes extracted cells as literal text, never executable formulas", () => {
    const bytes = createWorkbook([
      {
        name: "Page 1",
        rows: [['=HYPERLINK("https://example.com")', '<data>&"']],
      },
    ]);
    const parts = inspectOfficePackage(bytes, "xlsx");
    const xml = strFromU8(parts["xl/worksheets/sheet1.xml"]);
    expect(xml).toContain('t="inlineStr"');
    expect(xml).not.toContain("<f>");
    expect(xml).toContain("&lt;data&gt;&amp;&quot;");
  });
  it("groups positioned PDF text into ordered rows and separate cells", () => {
    expect(
      textRows([
        { text: "12", x: 200, y: 50, width: 12, height: 12 },
        { text: "Apples", x: 20, y: 50, width: 40, height: 12 },
        { text: "Quantity", x: 200, y: 20, width: 50, height: 12 },
        { text: "Item", x: 20, y: 20, width: 20, height: 12 },
      ]),
    ).toEqual([
      ["Item", "Quantity"],
      ["Apples", "12"],
    ]);
  });
});
