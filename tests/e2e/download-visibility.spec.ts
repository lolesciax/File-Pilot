import { test, expect, type Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { readFile } from "node:fs/promises";
import { unzipSync } from "fflate";
import AxeBuilder from "@axe-core/playwright";

async function upload(page: Page, pages = 8, text = true) {
  const pdf = await PDFDocument.create();
  for (let i = 0; i < pages; i++) {
    const p = pdf.addPage([612, 792]);
    if (text) p.drawText(`Document page ${i + 1}`, { x: 40, y: 700 });
  }
  await page.getByLabel("Select files", { exact: true }).setInputFiles({
    name: "document.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(await pdf.save()),
  });
  await expect(page.locator(".file-row")).toHaveCount(1);
}
async function complete(page: Page, action = "Convert PDF to Word") {
  await page.getByRole("button", { name: action, exact: true }).click();
  await expect(page.locator(".completion-screen")).toHaveAttribute(
    "data-state",
    "completed",
    { timeout: 30000 },
  );
}
for (const [width, height] of [
  [320, 640],
  [375, 667],
  [390, 844],
  [768, 1024],
  [1024, 768],
  [1440, 900],
  [1920, 1080],
]) {
  test(`dedicated PDF-to-Word completion is visible and usable at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    if (width === 390 || width === 1440)
      await page.addInitScript(() =>
        localStorage.setItem("filepilot-theme", "dark"),
      );
    await page.goto("/tool/pdf-to-word");
    await upload(page, 20);
    await complete(page);
    await expect(
      page.locator(".workspace-grid,.options-panel,.page-grid,.process-action"),
    ).toHaveCount(0);
    const heading = page.getByRole("heading", { name: "Your files are ready" });
    await expect(heading).toBeFocused();
    await expect(heading).toBeInViewport({ ratio: 1 });
    await expect(
      page.locator(".completion-screen .title-with-icon > svg"),
    ).toBeInViewport({ ratio: 1 });
    const download = page.getByRole("button", {
      name: "Download filepilot-output.docx",
      exact: true,
    });
    await expect(download).toHaveText("Download Word");
    await expect(download).toBeInViewport({ ratio: 1 });
    await expect(
      page.getByRole("button", { name: "Process Another File", exact: true }),
    ).toBeInViewport({ ratio: 1 });
    await expect(page.locator(".result-count")).toHaveText("1 file ready");
    await expect(page.locator(".completion-message")).toHaveText(
      "Your PDF has been converted to a Word document.",
    );
    await expect(page.locator(".result-row")).toContainText(/KB · DOCX/);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const pending = page.waitForEvent("download");
    await download.click();
    expect(
      unzipSync(await readFile((await (await pending).path())!))[
        "word/document.xml"
      ],
    ).toBeDefined();
    await expect(
      page.getByRole("button", { name: "Download all as ZIP" }),
    ).toHaveCount(0);
    await page.locator(".conversion-warnings summary").click();
    await expect(page.locator(".conversion-warnings ul")).toBeVisible();
    if ([320, 390, 1440].includes(width)) {
      const scan = await new AxeBuilder({ page })
        .setLegacyMode(
          page.context().browser()?.browserType().name() === "firefox",
        )
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(scan.violations).toEqual([]);
      await page.locator(".conversion-warnings summary").click();
      await page.screenshot({
        path: `output/playwright/completion-${width}.png`,
        animations: "disabled",
      });
    }
  });
}
test("a completion replaces a long workspace, announces success and moves focus to its heading", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route(/office\.worker-/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.continue();
  });
  await page.goto("/tool/pdf-to-word");
  await upload(page, 30);
  await page
    .getByRole("button", { name: "Convert PDF to Word", exact: true })
    .click();
  await expect(page.locator(".process-action")).toHaveAttribute(
    "data-state",
    "processing",
  );
  await expect(page.getByRole("button", { name: "Working…" })).toBeDisabled();
  await page.evaluate(() => scrollTo(0, 500));
  await expect(
    page.getByRole("heading", { name: "Your files are ready" }),
  ).toBeFocused({ timeout: 30000 });
  await expect(
    page.getByRole("button", { name: "Download filepilot-output.docx" }),
  ).toBeInViewport({ ratio: 1 });
  await expect(page.locator(".completion-screen [role=status]")).toContainText(
    "Processing completed. 1 file is ready",
  );
  await expect(page.locator(".workspace-grid")).toHaveCount(0);
});
test("batch completion has exact counts, a valid ZIP and a bounded keyboard-accessible list", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tool/split-pdf");
  await upload(page, 20);
  await page.getByLabel("Split mode").selectOption("individual");
  await complete(page, "Split PDF");
  await expect(page.locator(".result-count")).toHaveText("20 files ready");
  const zip = page.getByRole("button", {
    name: "Download all as ZIP",
    exact: true,
  });
  await expect(zip).toBeInViewport({ ratio: 1 });
  const pending = page.waitForEvent("download");
  await zip.click();
  const parts = unzipSync(await readFile((await (await pending).path())!));
  expect(Object.keys(parts)).toHaveLength(20);
  for (const bytes of Object.values(parts))
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  const summary = page.locator(".batch-results > summary");
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".batch-results")).toHaveJSProperty("open", true);
  await expect(page.locator(".batch-results .result-row")).toHaveCount(20);
  expect(
    (await page.locator(".batch-results .result-list").boundingBox())!.height,
  ).toBeLessThanOrEqual(360);
  const individual = page.locator(".batch-results button").last();
  const individualPending = page.waitForEvent("download");
  await individual.click();
  expect(
    (
      await PDFDocument.load(
        await readFile((await (await individualPending).path())!),
      )
    ).getPageCount(),
  ).toBe(1);
});
test("Process Another clears the selection and current results, preserves preferences and prevents duplicates", async ({
  page,
}) => {
  await page.goto("/tool/pdf-to-word");
  for (let i = 0; i < 3; i++) {
    if (i) {
      await page
        .getByRole("button", { name: "Process Another File", exact: true })
        .focus();
      await page.keyboard.press("Enter");
      await expect(page.locator(".dropzone-button")).toBeFocused();
      await expect(
        page.locator(".file-row,.result-row,.completion-screen"),
      ).toHaveCount(0);
      await expect(page.getByLabel("Output filename")).toHaveValue(
        "my-document",
      );
      await expect(page.getByLabel("Page ranges")).toHaveValue("");
    }
    await upload(page, 1);
    if (!i) {
      await page.getByLabel("Output filename").fill("my-document");
      await page.getByLabel("Page ranges").fill("1");
    }
    await complete(page);
    await expect(page.locator(".result-count")).toHaveText("1 file ready");
    await expect(
      page.getByRole("button", {
        name: "Download my-document.docx",
        exact: true,
      }),
    ).toHaveCount(1);
  }
  await page
    .getByRole("button", { name: "Review files and settings", exact: true })
    .click();
  await expect(page.locator(".file-row")).toHaveCount(1);
  await page.getByRole("link", { name: "Open workspace" }).click();
  await expect(page.locator(".results .result-count")).toHaveText(
    "1 file ready",
  );
  await page.getByRole("link", { name: /Continue PDF to Word/ }).click();
  await expect(
    page.getByRole("button", {
      name: "Download my-document.docx",
      exact: true,
    }),
  ).toHaveCount(1);
});
test("failed conversion stays in the workspace and recovers without a false success screen", async ({
  page,
}) => {
  await page.goto("/tool/pdf-to-word");
  await upload(page, 1, false);
  await page
    .getByRole("button", { name: "Convert PDF to Word", exact: true })
    .click();
  await expect(page.locator(".process-action")).toHaveAttribute(
    "data-state",
    "failed",
  );
  await expect(page.getByRole("alert")).toContainText(/text|OCR/i);
  await expect(page.locator(".completion-screen")).toHaveCount(0);
  await upload(page, 1);
  await complete(page);
  await expect(page.getByRole("alert")).toHaveCount(0);
});
for (const invalid of ["none", "empty"])
  test(`invalid ${invalid} output cannot produce a success screen`, async ({
    page,
  }) => {
    await page.route(
      /\/(?:assets\/engine-[^/]+\.js|src\/processing\/engine\.ts)(?:\?.*)?$/,
      (route) =>
        route.fulfill({
          contentType: "text/javascript",
          body: `export async function runTool(){return {outputs:${invalid === "none" ? "[]" : '[{id:"empty",name:"empty.pdf",blob:new Blob([])}]'},errors:[],cancelled:false}}`,
        }),
    );
    await page.goto("/tool/merge-pdf");
    await upload(page, 1);
    await page.getByRole("button", { name: "Merge PDFs", exact: true }).click();
    await expect(page.locator(".process-action")).toHaveAttribute(
      "data-state",
      "failed",
    );
    await expect(page.getByRole("alert")).toContainText(
      invalid === "none" ? "No files were generated" : "empty or invalid",
    );
    await expect(page.locator(".completion-screen,.result-row")).toHaveCount(0);
  });
test("image previews release object URLs on completion and Process Another", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const active = new Set<string>();
    (window as unknown as { resultUrls: Set<string> }).resultUrls = active;
    const create = URL.createObjectURL.bind(URL),
      revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      const url = create(blob);
      active.add(url);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      active.delete(url);
      revoke(url);
    };
  });
  await page.goto("/tool/convert-images");
  const base64 = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 20;
    c.height = 20;
    return c.toDataURL().split(",")[1];
  });
  await page.getByLabel("Select files", { exact: true }).setInputFiles({
    name: "source.png",
    mimeType: "image/png",
    buffer: Buffer.from(base64, "base64"),
  });
  await expect(page.locator(".file-row")).toHaveCount(1);
  await complete(page, "Convert images");
  await expect(page.locator(".result-thumb")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { resultUrls: Set<string> }).resultUrls.size,
      ),
    )
    .toBe(1);
  await page
    .getByRole("button", { name: "Process Another File", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { resultUrls: Set<string> }).resultUrls.size,
      ),
    )
    .toBe(0);
  await expect(page.locator(".file-row,.result-row")).toHaveCount(0);
});
