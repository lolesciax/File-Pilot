import { test, expect } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

test.use({ hasTouch: true });
async function image(
  page: import("@playwright/test").Page,
  width = 320,
  height = 160,
) {
  const data = await page.evaluate(
    ({ width, height }) => {
      const c = document.createElement("canvas");
      c.width = width;
      c.height = height;
      c.getContext("2d")!.fillRect(0, 0, width, height);
      return c.toDataURL().split(",")[1];
    },
    { width, height },
  );
  return Buffer.from(data, "base64");
}

test("touch PDF controls have 44px targets and remain operable at 320px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  const pdf = await PDFDocument.create();
  for (let i = 0; i < 3; i++) pdf.addPage();
  await page.goto("/tool/organize-pdf");
  await page.getByLabel("Select files", { exact: true }).setInputFiles({
    name: "source.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(await pdf.save()),
  });
  await expect(page.locator(".page-card")).toHaveCount(3);
  const sizes = await page
    .locator(".page-actions button,.file-controls button")
    .evaluateAll((elements) =>
      elements.map((element) => ({
        width: element.getBoundingClientRect().width,
        height: element.getBoundingClientRect().height,
      })),
    );
  expect(
    sizes.every((size) => size.width >= 44 && size.height >= 44),
    JSON.stringify(sizes),
  ).toBe(true);
  await page.getByRole("checkbox", { name: "Page 1", exact: true }).tap();
  await page.getByRole("button", { name: "Rotate right", exact: true }).tap();
  await expect(page.locator(".page-card").first()).toContainText("+90°");
  await page
    .getByRole("button", { name: "Duplicate page 1", exact: true })
    .tap();
  await expect(page.locator(".page-card")).toHaveCount(4);
});

test("mobile forms avoid focus zoom and portrait crop preview preserves its ratio", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tool/crop-image");
  await page.getByLabel("Select files", { exact: true }).setInputFiles({
    name: "portrait.png",
    mimeType: "image/png",
    buffer: await image(page, 300, 1200),
  });
  await expect(page.locator(".crop-area")).toBeVisible();
  const box = (await page.locator(".live-crop-preview").boundingBox())!;
  expect(box.width / box.height).toBeCloseTo(0.25, 2);
  const fonts = await page
    .locator(
      ".options-panel input:not([type=range]):not([type=checkbox]),.options-panel select",
    )
    .evaluateAll((elements) =>
      elements.map((element) => parseFloat(getComputedStyle(element).fontSize)),
    );
  expect(fonts.every((size) => size >= 16)).toBe(true);
  const handle = (await page.locator(".crop-handle").boundingBox())!;
  expect(handle.width).toBeGreaterThanOrEqual(44);
  expect(handle.height).toBeGreaterThanOrEqual(44);
});

test("mobile navigation close button stays visible after scrolling a long drawer", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 500 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation" }).tap();
  const dialog = page.getByRole("dialog");
  await dialog.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  const close = page.getByRole("button", { name: "Close navigation" });
  const bounds = (await close.boundingBox())!,
    panel = (await dialog.boundingBox())!;
  expect(bounds.y).toBeGreaterThanOrEqual(panel.y);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(panel.y + panel.height);
  await close.tap();
  await expect(dialog).toHaveCount(0);
});

test("long options do not trap the process action on short laptop screens", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 600 });
  await page.goto("/tool/batch-rename");
  await page.getByLabel("Select files", { exact: true }).setInputFiles({
    name: "example.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("file"),
  });
  await expect(page.locator(".file-row")).toHaveCount(1);
  const panel = page.locator(".options-panel");
  await expect(panel).toHaveAttribute("data-fits-viewport", "false");
  await expect(panel).toHaveCSS("position", "static");
  const action = page.getByRole("button", {
    name: "Export renamed ZIP",
    exact: true,
  });
  await action.click();
  await expect(page.locator(".completion-screen")).toHaveAttribute(
    "data-state",
    "completed",
  );
  const button = page.getByRole("button", { name: /^Download .*\.zip$/ });
  const bounds = (await button.boundingBox())!;
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(600);
});

test("landscape menus fit a short viewport and remain touch navigable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/");
  await page.getByRole("button", { name: "All tools", exact: true }).tap();
  const panel = page.locator("#navigation-all");
  const bounds = (await panel.boundingBox())!;
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(390);
  await panel.getByRole("link", { name: "PDF to Word", exact: true }).tap();
  await expect(page).toHaveURL(/tool\/pdf-to-word/);
});

test("captures representative layouts after responsive corrections", async ({
  page,
}) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 801, height: 600 },
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.locator(".document-art")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: `output/playwright/responsive-home-${viewport.width}.png`,
      animations: "disabled",
    });
  }
});
