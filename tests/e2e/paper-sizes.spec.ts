import { test, expect } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { readFile } from "node:fs/promises";

// Independent expected dimensions in PDF points (72 points per inch).
const sizes = [
  ["A4", (210 / 25.4) * 72, (297 / 25.4) * 72],
  ["Letter", 612, 792],
  ["Long", 612, 936],
  ["Legal", 612, 1008],
  ["A3", (297 / 25.4) * 72, (420 / 25.4) * 72],
  ["A5", (148 / 25.4) * 72, (210 / 25.4) * 72],
  ["A6", (105 / 25.4) * 72, (148 / 25.4) * 72],
  ["Tabloid", 792, 1224],
  ["Executive", 522, 756],
] as const;
async function addImage(page: import("@playwright/test").Page) {
  await page.goto("/tool/images-to-pdf");
  const data = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 200;
    c.height = 100;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#087f75";
    ctx.fillRect(0, 0, 200, 100);
    return c.toDataURL().split(",")[1];
  });
  await page
    .getByLabel("Select files", { exact: true })
    .setInputFiles({
      name: "print.png",
      mimeType: "image/png",
      buffer: Buffer.from(data, "base64"),
    });
  await expect(page.locator(".paper-preview")).toBeVisible();
}
for (const [id, width, height] of sizes)
  for (const orientation of ["portrait", "landscape"] as const) {
    test(`${id} ${orientation} exports correct page dimensions and preview`, async ({
      page,
    }) => {
      await addImage(page);
      await page.getByLabel("Page size", { exact: false }).selectOption(id);
      await page.getByLabel("Orientation").selectOption(orientation);
      const expected =
        orientation === "portrait"
          ? { width, height }
          : { width: height, height: width };
      const box = await page.locator(".paper-preview").boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width / box!.height).toBeCloseTo(
        expected.width / expected.height,
        2,
      );
      await page
        .getByRole("button", { name: "Create PDF", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "Your files are ready" }),
      ).toBeVisible();
      const download = page.waitForEvent("download");
      await page
        .getByRole("button", { name: /^Download / })
        .first()
        .click();
      const doc = await PDFDocument.load(
        await readFile((await (await download).path())!),
      );
      expect(doc.getPageCount()).toBe(1);
      const size = doc.getPage(0).getSize();
      expect(size.width).toBeCloseTo(expected.width, 6);
      expect(size.height).toBeCloseTo(expected.height, 6);
    });
  }
test("small print sizes reject margins that leave no content area", async ({
  page,
}) => {
  await addImage(page);
  await page.getByLabel("Page size").selectOption("A6");
  await page.getByLabel("Margins (points)").fill("150");
  await expect(page.getByRole("alert")).toContainText("Margins leave no room");
  await page.getByRole("button", { name: "Create PDF", exact: true }).click();
  await expect(page.locator(".error-box")).toContainText(
    "Margins leave no room",
  );
  await expect(page.locator(".result-row")).toHaveCount(0);
});
