import { test, expect } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
test("clearing visual extraction selection never silently exports all pages", async ({
  page,
}) => {
  const doc = await PDFDocument.create();
  doc.addPage();
  await page.goto("/tool/extract-pdf");
  await page.getByLabel("Select files", { exact: true }).setInputFiles({
    name: "source.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(await doc.save()),
  });
  await expect(page.locator(".page-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Select all", exact: true }).click();
  await page
    .getByRole("button", { name: "Clear selection", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Extract pages", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("No pages selected");
  await page.getByLabel("Page ranges").fill("1");
  await expect(
    page.getByRole("checkbox", { name: "Page 1", exact: true }),
  ).toBeChecked();
});
test("production responses apply the configured security policy", async ({
  request,
}) => {
  test.skip(
    process.env.FILEPILOT_PRODUCTION !== "1",
    "Security headers apply on production preview and Vercel.",
  );
  const response = await request.get("/tool/merge-pdf");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-security-policy"]).toContain(
    "object-src 'none'",
  );
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
});

test("PDF text rasterization uses local fonts and produces visible text", async ({
  page,
}) => {
  const doc = await PDFDocument.create();
  const pdfPage = doc.addPage([300, 200]);
  pdfPage.drawText("FilePilot", { x: 30, y: 100, size: 32 });
  await page.goto("/tool/pdf-to-images");
  await page.getByLabel("Select files", { exact: true }).setInputFiles({
    name: "text.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(await doc.save()),
  });
  await expect(page.locator(".file-row")).toHaveCount(1);
  await page.getByLabel("Output format").selectOption("image/png");
  await page
    .getByRole("button", { name: "Convert pages", exact: true })
    .click();
  const result = page.locator(".result-thumb");
  await expect(result).toBeVisible();
  const ink = await result.evaluate(async (element) => {
    const img = element as HTMLImageElement;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let dark = 0;
    for (let i = 0; i < pixels.length; i += 4)
      if (
        pixels[i] < 100 &&
        pixels[i + 1] < 100 &&
        pixels[i + 2] < 100 &&
        pixels[i + 3] > 200
      )
        dark++;
    return dark;
  });
  expect(ink).toBeGreaterThan(300);
});
