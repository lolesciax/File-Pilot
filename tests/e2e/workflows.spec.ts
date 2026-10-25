import { test, expect, type Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { readFile } from "node:fs/promises";
import { unzipSync } from "fflate";
import AxeBuilder from "@axe-core/playwright";
async function pdf(widths: number[]) {
  const doc = await PDFDocument.create();
  widths.forEach((w) => doc.addPage([w, 400]));
  return Buffer.from(await doc.save());
}
async function upload(
  page: Page,
  name: string,
  buffer: Buffer,
  mimeType: string,
) {
  await page
    .getByLabel("Select files", { exact: true })
    .setInputFiles({ name, mimeType, buffer });
  await expect(page.locator(".file-row")).toHaveCount(1);
}
async function image(page: Page, width = 320, height = 160) {
  const data = await page.evaluate(
    ({ width, height }) => {
      const c = document.createElement("canvas");
      c.width = width;
      c.height = height;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#087f75";
      ctx.fillRect(0, 0, 160, 160);
      return c.toDataURL("image/png").split(",")[1];
    },
    { width, height },
  );
  return Buffer.from(data, "base64");
}
async function processDownload(page: Page, action: string) {
  await page.getByRole("button", { name: action, exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your files are ready" }),
  ).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: /^Download / })
    .first()
    .click();
  const dl = await downloadPromise;
  return {
    buffer: await readFile((await dl.path())!),
    name: dl.suggestedFilename(),
  };
}
async function imageInfo(page: Page, buffer: Buffer) {
  return page.evaluate(async (data) => {
    const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    const img = await createImageBitmap(new Blob([bytes]));
    const result = { width: img.width, height: img.height };
    img.close();
    return result;
  }, buffer.toString("base64"));
}
test("merge reordered PDF files and download valid page order", async ({
  page,
}) => {
  await page.goto("/tool/merge-pdf");
  await page.getByLabel("Select files", { exact: true }).setInputFiles([
    {
      name: "first.pdf",
      mimeType: "application/pdf",
      buffer: await pdf([200, 210]),
    },
    {
      name: "second.pdf",
      mimeType: "application/pdf",
      buffer: await pdf([300]),
    },
  ]);
  await expect(page.locator(".file-row")).toHaveCount(2);
  await page.getByRole("button", { name: "Move second.pdf up" }).click();
  const { buffer } = await processDownload(page, "Merge PDFs");
  const doc = await PDFDocument.load(buffer);
  expect(doc.getPages().map((p) => p.getWidth())).toEqual([300, 200, 210]);
});
test("resize preserves chosen dimensions and real JPEG encoding", async ({
  page,
}) => {
  await page.goto("/tool/resize-images");
  await upload(page, "image.png", await image(page), "image/png");
  await page.getByLabel("Lock aspect ratio").uncheck();
  await page.getByLabel("Width (px)", { exact: true }).fill("80");
  await page.getByLabel("Height (px)", { exact: true }).fill("40");
  const { buffer } = await processDownload(page, "Resize images");
  expect(buffer[0]).toBe(255);
  expect(buffer[1]).toBe(216);
  expect(await imageInfo(page, buffer)).toEqual({ width: 80, height: 40 });
});
test("PNG to JPEG flattens transparency on chosen background", async ({
  page,
}) => {
  await page.goto("/tool/convert-images");
  await upload(page, "transparent.png", await image(page), "image/png");
  await page.getByLabel("JPEG background").fill("#ff0000");
  const { buffer } = await processDownload(page, "Convert images");
  expect(buffer.slice(0, 3)).toEqual(Buffer.from([255, 216, 255]));
  const rgba = await page.evaluate(async (data) => {
    const b = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    const img = await createImageBitmap(new Blob([b]));
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    return Array.from(ctx.getImageData(300, 80, 1, 1).data);
  }, buffer.toString("base64"));
  expect(rgba[0]).toBeGreaterThan(240);
  expect(rgba[1]).toBeLessThan(15);
  expect(rgba[3]).toBe(255);
});
test("rename exports safe unique ZIP names and identical source bytes", async ({
  page,
}) => {
  await page.goto("/tool/batch-rename");
  await page.getByLabel("Select files", { exact: true }).setInputFiles([
    { name: "one.txt", mimeType: "text/plain", buffer: Buffer.from("one") },
    { name: "two.txt", mimeType: "text/plain", buffer: Buffer.from("two") },
  ]);
  await expect(page.locator(".file-row")).toHaveCount(2);
  await page.getByLabel("Prefix", { exact: true }).fill("Portfolio");
  await page.getByLabel("Keep original base name").uncheck();
  await expect(page.locator(".rename-preview")).toContainText(
    "Portfolio_001.txt",
  );
  const { buffer } = await processDownload(page, "Export renamed ZIP");
  const zip = unzipSync(buffer);
  expect(Object.keys(zip)).toEqual(["Portfolio_001.txt", "Portfolio_002.txt"]);
  expect(new TextDecoder().decode(zip["Portfolio_002.txt"])).toBe("two");
});
test("split groups produces ordered valid PDFs with ZIP download", async ({
  page,
}) => {
  await page.goto("/tool/split-pdf");
  await upload(
    page,
    "pages.pdf",
    await pdf([200, 210, 220]),
    "application/pdf",
  );
  await page.getByLabel("Split mode").selectOption("groups");
  await page.getByLabel("Page groups").fill("3,1; 2");
  await page.getByRole("button", { name: "Split PDF", exact: true }).click();
  await expect(page.locator(".result-row")).toHaveCount(2);
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download all as ZIP" }).click();
  const zip = unzipSync(await readFile((await (await dl).path())!));
  const entries = Object.values(zip);
  expect(
    (await PDFDocument.load(entries[0])).getPages().map((p) => p.getWidth()),
  ).toEqual([220, 200]);
  expect((await PDFDocument.load(entries[1])).getPageCount()).toBe(1);
});
test("organize duplicates and reorders PDF pages", async ({ page }) => {
  await page.goto("/tool/organize-pdf");
  await upload(page, "pages.pdf", await pdf([200, 210]), "application/pdf");
  await page
    .getByRole("button", { name: "Duplicate page 2", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Move page 3 left", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Move page 2 left", exact: true })
    .click();
  const { buffer } = await processDownload(page, "Export PDF");
  expect(
    (await PDFDocument.load(buffer)).getPages().map((p) => p.getWidth()),
  ).toEqual([210, 200, 210]);
});
test("rotation selects one page and preserves the other", async ({ page }) => {
  await page.goto("/tool/rotate-pdf");
  await upload(page, "pages.pdf", await pdf([200, 210]), "application/pdf");
  await page.getByRole("checkbox", { name: "Page 1", exact: true }).check();
  await page.getByRole("button", { name: "Rotate right", exact: true }).click();
  const { buffer } = await processDownload(page, "Export rotated PDF");
  expect(
    (await PDFDocument.load(buffer))
      .getPages()
      .map((p) => p.getRotation().angle),
  ).toEqual([90, 0]);
});
test("extract selection produces one requested page", async ({ page }) => {
  await page.goto("/tool/extract-pdf");
  await upload(page, "pages.pdf", await pdf([200, 210]), "application/pdf");
  await page.getByRole("checkbox", { name: "Page 2", exact: true }).check();
  const { buffer } = await processDownload(page, "Extract pages");
  expect(
    (await PDFDocument.load(buffer)).getPages().map((p) => p.getWidth()),
  ).toEqual([210]);
});
test("PDF rendering downloads real PNG at requested scale", async ({
  page,
}) => {
  await page.goto("/tool/pdf-to-images");
  await upload(page, "page.pdf", await pdf([200]), "application/pdf");
  await page.getByLabel("Output format").selectOption("image/png");
  await page.getByLabel("Render scale").selectOption("2");
  await expect(page.locator(".pdf-thumbnail canvas").first()).toHaveJSProperty(
    "width",
    48,
  );
  const { buffer } = await processDownload(page, "Convert pages");
  expect(buffer.subarray(0, 4)).toEqual(Buffer.from([137, 80, 78, 71]));
  expect(await imageInfo(page, buffer)).toEqual({ width: 400, height: 800 });
  await expect(page.locator(".pdf-thumbnail")).toHaveCount(0);
});
test("images to PDF creates selected page size", async ({ page }) => {
  await page.goto("/tool/images-to-pdf");
  await upload(page, "image.png", await image(page), "image/png");
  await page.getByLabel("Page size").selectOption("Letter");
  await page.getByLabel("Orientation").selectOption("landscape");
  const { buffer } = await processDownload(page, "Create PDF");
  const doc = await PDFDocument.load(buffer);
  expect(doc.getPageCount()).toBe(1);
  expect(doc.getPage(0).getSize()).toEqual({ width: 792, height: 612 });
});
test("interactive crop maps percentages to original pixels", async ({
  page,
}) => {
  await page.goto("/tool/crop-image");
  await upload(page, "image.png", await image(page), "image/png");
  await page
    .getByText("width (%)", { exact: true })
    .locator("..")
    .getByRole("spinbutton")
    .fill("50");
  await page
    .getByText("height (%)", { exact: true })
    .locator("..")
    .getByRole("spinbutton")
    .fill("50");
  const { buffer } = await processDownload(page, "Crop image");
  expect(await imageInfo(page, buffer)).toEqual({ width: 160, height: 80 });
});
test("compression produces decoded WebP with accurate size feedback", async ({
  page,
}) => {
  await page.goto("/tool/compress-images");
  await upload(page, "image.png", await image(page), "image/png");
  await page.getByLabel("Output format").selectOption("image/webp");
  await page.getByLabel("Keep original if result is not smaller").uncheck();
  await page.getByLabel("Maximum width").fill("160");
  const { buffer } = await processDownload(page, "Compress images");
  expect(buffer.toString("ascii", 0, 4)).toBe("RIFF");
  expect(buffer.toString("ascii", 8, 12)).toBe("WEBP");
  expect(await imageInfo(page, buffer)).toEqual({ width: 160, height: 80 });
  await expect(page.locator(".result-row")).toContainText(/smaller|larger/);
});
test("corrupt files, empty selection and invalid ranges produce clear errors", async ({
  page,
}) => {
  await page.goto("/tool/merge-pdf");
  await expect(
    page.getByRole("button", { name: "Merge PDFs", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Select files", { exact: true }).setInputFiles({
    name: "bad.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("broken"),
  });
  await expect(page.getByRole("alert")).toContainText("not a valid PDF");
  await page.goto("/tool/extract-pdf");
  await upload(page, "pages.pdf", await pdf([200]), "application/pdf");
  await page.getByLabel("Page ranges").fill("9");
  await page
    .getByRole("button", { name: "Extract pages", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("between 1 and 1");
});
test("all representative viewport widths avoid overflow; dark mode and mobile menu work", async ({
  page,
}) => {
  for (const width of [320, 375, 390, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/", "/tool/resize-images", "/settings"]) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${route} at ${width}px`,
      ).toBe(true);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/settings");
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "PDF tools", exact: true })
    .click();
  await expect(page).toHaveURL(/tools\/pdf/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
test("accessibility audit of home, tool and dark settings", async ({
  page,
}) => {
  for (const [route, width] of [
    ["/", 1280],
    ["/tool/merge-pdf", 1280],
    ["/settings", 1280],
    ["/", 390],
    ["/tool/merge-pdf", 390],
    ["/settings", 390],
  ] as const) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(route);
    if (route === "/settings")
      await page.getByRole("button", { name: "Dark", exact: true }).click();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      results.violations,
      JSON.stringify(results.violations, null, 2),
    ).toEqual([]);
  }
});
test("captures desktop home and mobile workspace", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1150 });
  await page.goto("/");
  await expect(page.locator(".tool-card").last()).toBeVisible();
  await page.screenshot({
    path: "output/playwright/home-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tool/merge-pdf");
  await expect(
    page.getByRole("heading", { name: "Merge PDF", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "output/playwright/tool-mobile.png",
    fullPage: true,
  });
});

test("batch partial success retains results and retries only failed items", async ({
  page,
}) => {
  await page.goto("/tool/resize-images");
  await page.getByLabel("Select files", { exact: true }).setInputFiles([
    {
      name: "wide.png",
      mimeType: "image/png",
      buffer: await image(page, 320, 2),
    },
    {
      name: "square.png",
      mimeType: "image/png",
      buffer: await image(page, 320, 320),
    },
  ]);
  await expect(page.locator(".file-row")).toHaveCount(2);
  await page.getByLabel("Resize by").selectOption("width");
  await page.getByLabel("Width (px)", { exact: true }).fill("6000");
  await page
    .getByRole("button", { name: "Resize images", exact: true })
    .click();
  await expect(page.locator(".result-row")).toHaveCount(1);
  await expect(page.getByRole("alert")).toContainText("32 megapixel");
  await expect(
    page.getByRole("heading", { name: "Some files are ready" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Review files and settings", exact: true })
    .click();
  await expect(page.locator(".status-failed")).toHaveCount(1);
  await expect(page.locator(".status-completed")).toHaveCount(1);
  await page.getByLabel("Width (px)", { exact: true }).fill("120");
  await page
    .getByRole("button", { name: "Retry failed files", exact: true })
    .click();
  await expect(page.locator(".result-row")).toHaveCount(2);
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.locator(".result-count")).toHaveText("2 files ready");
  const retryDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download all as ZIP", exact: true })
    .click();
  const retryParts = unzipSync(
    await readFile((await (await retryDownload).path())!),
  );
  expect(Object.keys(retryParts).sort()).toEqual([
    "square-processed.jpg",
    "wide-processed.jpg",
  ]);
});

test("crop custom ratio, zoom and keyboard controls map to pixels", async ({
  page,
}) => {
  await page.goto("/tool/crop-image");
  await upload(page, "image.png", await image(page), "image/png");
  await page.getByLabel("Aspect ratio").selectOption("custom");
  await page.getByLabel("Ratio width", { exact: true }).fill("2");
  await page.getByLabel("Ratio height", { exact: true }).fill("1");
  await page.getByLabel(/Crop zoom/).fill("2");
  const crop = page.getByRole("group", { name: /Crop selection/ });
  await crop.focus();
  await page.keyboard.press("ArrowRight");
  const { buffer } = await processDownload(page, "Crop image");
  expect(await imageInfo(page, buffer)).toEqual({ width: 160, height: 80 });
});

test("results survive tool changes and clear dialog restores an empty workspace", async ({
  page,
}) => {
  await page.goto("/tool/merge-pdf");
  await upload(page, "source.pdf", await pdf([200]), "application/pdf");
  await processDownload(page, "Merge PDFs");
  await page
    .getByRole("link", { name: "All tools", exact: true })
    .last()
    .click();
  await page.getByRole("link", { name: /Convert images/ }).click();
  await expect(
    page.getByRole("link", { name: "Saved downloads from other tools (1)" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Saved downloads from other tools (1)" })
    .click();
  await expect(page.locator(".result-row")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Clear workspace", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("button", { name: "Clear workspace", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".result-row")).toHaveCount(0);
});

test("cancels a queued PDF worker and can retry; no document upload requests occur", async ({
  page,
}) => {
  const uploads: string[] = [];
  page.on("request", (request) => {
    if (["POST", "PUT", "PATCH"].includes(request.method()))
      uploads.push(request.url());
  });
  await page.route(/pdf\.worker(?:-|\.ts)/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 350));
    await route.continue().catch(() => {});
  });
  await page.goto("/tool/merge-pdf");
  await upload(page, "source.pdf", await pdf([200, 210]), "application/pdf");
  await page.getByRole("button", { name: "Merge PDFs", exact: true }).click();
  await page
    .getByRole("button", { name: "Cancel processing", exact: true })
    .click();
  await expect(page.locator(".process-action .processing-state")).toHaveText(
    "Cancelled",
  );
  await expect(
    page.getByRole("button", { name: "Merge PDFs", exact: true }),
  ).toBeEnabled();
  const { buffer } = await processDownload(page, "Merge PDFs");
  expect((await PDFDocument.load(buffer)).getPageCount()).toBe(2);
  expect(uploads).toEqual([]);
});
