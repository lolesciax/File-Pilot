import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { Ream } from "reamkit";
import { unzipSync, strFromU8 } from "fflate";
import {
  wordFixture,
  excelFixture,
  powerpointFixture,
} from "../fixtures/office";
import { officeMime } from "../../src/lib/officeTools";
import { inspectOfficePackage } from "../../src/processing/office/package";
import AxeBuilder from "@axe-core/playwright";

async function download(page: Page, action: string) {
  await page.getByRole("button", { name: action, exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your files are ready" }),
  ).toBeVisible({ timeout: 30000 });
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: /^Download / })
    .first()
    .click();
  const result = await pending;
  return {
    bytes: new Uint8Array(await readFile((await result.path())!)),
    name: result.suggestedFilename(),
  };
}
async function upload(
  page: Page,
  name: string,
  mime: string,
  bytes: Uint8Array,
) {
  await page
    .getByLabel("Select files", { exact: true })
    .setInputFiles({ name, mimeType: mime, buffer: Buffer.from(bytes) });
  await expect(page.locator(".file-row")).toHaveCount(1, { timeout: 30000 });
}
async function textPDF() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  page.drawText("Item", { x: 30, y: 700, size: 14 });
  page.drawText("Quantity", { x: 240, y: 700, size: 14 });
  page.drawText("Apples", { x: 30, y: 670, size: 14 });
  page.drawText("12", { x: 240, y: 670, size: 14 });
  doc
    .addPage([612, 792])
    .drawText("Second page content", { x: 30, y: 700, size: 14 });
  return doc.save();
}

for (const [id, ext, fixture, action, text] of [
  ["word-to-pdf", "docx", wordFixture, "Convert Word to PDF", "Word fixture"],
  ["excel-to-pdf", "xlsx", excelFixture, "Convert Excel to PDF", "Apples"],
  [
    "powerpoint-to-pdf",
    "pptx",
    powerpointFixture,
    "Convert PowerPoint to PDF",
    "presentation fixture",
  ],
] as const) {
  test(`${id} downloads a PDF with actual Office text and no upload requests`, async ({
    page,
  }) => {
    const outgoing: string[] = [];
    page.on("request", (request) => {
      if (
        ["POST", "PUT", "PATCH"].includes(request.method()) ||
        !new URL(request.url()).hostname.match(/^(127\.0\.0\.1|localhost)$/)
      )
        outgoing.push(request.url());
    });
    await page.goto(`/tool/${id}`);
    await expect(page.locator(".conversion-notice")).toBeVisible();
    await upload(page, `source.${ext}`, officeMime[ext], fixture());
    const { bytes, name } = await download(page, action);
    expect(name).toMatch(/\.pdf$/);
    expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(0);
    expect(
      new TextDecoder().decode(await Ream.parse(bytes).convert("md")),
    ).toContain(text);
    await page.getByText(/Review conversion notes/).click();
    await expect(page.locator(".conversion-warnings")).toContainText(
      "Liberation Sans",
    );
    if (id === "word-to-pdf") {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: "output/playwright/office-word-pdf.png",
        fullPage: true,
        animations: "disabled",
      });
      const scan = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(scan.violations).toEqual([]);
    }
    expect(outgoing).toEqual([]);
  });
}

test("PDF to Word generates editable DOCX text from selected pages", async ({
  page,
}) => {
  await page.goto("/tool/pdf-to-word");
  await upload(page, "text.pdf", "application/pdf", await textPDF());
  await page.getByLabel("Page ranges").fill("2");
  const { bytes } = await download(page, "Convert PDF to Word");
  const parts = inspectOfficePackage(bytes, "docx");
  const content = strFromU8(parts["word/document.xml"]);
  expect(content).toContain("Second");
  expect(content).not.toContain("Apples");
  await page.locator(".conversion-warnings summary").click();
  await expect(page.locator(".conversion-warnings")).toContainText(
    "editable DOCX",
  );
});

test("PDF to Excel writes selectable PDF text into separate editable cells and sheets", async ({
  page,
}) => {
  await page.goto("/tool/pdf-to-excel");
  await upload(page, "table.pdf", "application/pdf", await textPDF());
  const { bytes, name } = await download(page, "Convert PDF to Excel");
  expect(name).toMatch(/\.xlsx$/);
  const parts = inspectOfficePackage(bytes, "xlsx");
  expect(strFromU8(parts["xl/workbook.xml"])).toContain("Page 2");
  const cells = strFromU8(parts["xl/worksheets/sheet1.xml"]);
  expect(cells).toContain('r="A1"');
  expect(cells).toContain('r="B1"');
  expect(cells).toContain("Item");
  expect(cells).toContain("Quantity");
  expect(cells).toContain("Apples");
  expect(cells).not.toContain("<f>");
  expect(
    new TextDecoder().decode(await Ream.parse(bytes).convert("md")),
  ).toContain("Apples");
});

test("PDF to PowerPoint produces ordered image-based slides with valid relationships", async ({
  page,
}) => {
  await page.goto("/tool/pdf-to-powerpoint");
  await upload(page, "pages.pdf", "application/pdf", await textPDF());
  await page.getByLabel("Page ranges").fill("2,1");
  const { bytes, name } = await download(page, "Convert PDF to PowerPoint");
  expect(name).toMatch(/\.pptx$/);
  const parts = inspectOfficePackage(bytes, "pptx");
  expect(
    Object.keys(parts).filter((key) =>
      /^ppt\/slides\/slide\d+\.xml$/.test(key),
    ),
  ).toHaveLength(2);
  expect(strFromU8(parts["ppt/slides/slide1.xml"])).toContain(
    "Source PDF page 2",
  );
  expect(strFromU8(parts["ppt/slides/slide2.xml"])).toContain(
    "Source PDF page 1",
  );
  expect([...parts["ppt/media/page1.png"].slice(0, 4)]).toEqual([
    137, 80, 78, 71,
  ]);
  const fonts = {
    regular: new Uint8Array(
      await readFile(
        "node_modules/pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf",
      ),
    ),
  };
  const rebuilt = await Ream.parse(bytes).convert("pdf", { fonts });
  expect((await PDFDocument.load(rebuilt)).getPageCount()).toBe(2);
});

test("invalid Office input and scanned PDF extraction fail with clear errors", async ({
  page,
}) => {
  await page.goto("/tool/word-to-pdf");
  await page.getByLabel("Select files", { exact: true }).setInputFiles({
    name: "broken.docx",
    mimeType: officeMime.docx,
    buffer: Buffer.from("not a ZIP"),
  });
  await expect(page.getByRole("alert")).toContainText(
    "Invalid Office ZIP package",
  );
  await page.getByLabel("Select files", { exact: true }).setInputFiles({
    name: "old.doc",
    mimeType: "application/msword",
    buffer: Buffer.from("legacy"),
  });
  await expect(page.getByRole("alert")).toContainText("Choose a .docx");
  const blank = await PDFDocument.create();
  blank.addPage();
  await page.goto("/tool/pdf-to-excel");
  await upload(page, "scan.pdf", "application/pdf", await blank.save());
  await page
    .getByRole("button", { name: "Convert PDF to Excel", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("No selectable text");
  await expect(page.locator(".result-row")).toHaveCount(0);
});

test("Office screens remain usable on mobile and disclose conversion limits", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  for (const id of [
    "word-to-pdf",
    "pdf-to-word",
    "excel-to-pdf",
    "pdf-to-excel",
    "powerpoint-to-pdf",
    "pdf-to-powerpoint",
  ]) {
    await page.goto(`/tool/${id}`);
    await expect(page.locator(".conversion-notice")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
