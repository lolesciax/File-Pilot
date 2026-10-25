import { test, expect, type Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { tools } from "../../src/lib/catalog";
import {
  wordFixture,
  excelFixture,
  powerpointFixture,
} from "../fixtures/office";
import { officeMime } from "../../src/lib/officeTools";

const viewports = [
  { width: 320, height: 640 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 560, height: 780 },
  { width: 561, height: 780 },
  { width: 768, height: 1024 },
  { width: 800, height: 600 },
  { width: 801, height: 600 },
  { width: 820, height: 1180 },
  { width: 1024, height: 768 },
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
  { width: 844, height: 390 },
];
const routes = [
  "/",
  "/tools",
  "/tools/pdf",
  "/tools/image",
  "/tools/batch",
  "/workspace",
  "/settings",
  "/privacy",
  ...tools.map((tool) => `/tool/${tool.id}`),
];
async function noOverflow(page: Page) {
  const report = await page.evaluate(() => ({
    width: innerWidth,
    route: location.pathname,
    outside: [...document.querySelectorAll("main *")]
      .filter((element) => {
        const r = element.getBoundingClientRect();
        return (
          r.width && r.height && (r.right > innerWidth + 0.5 || r.left < -0.5)
        );
      })
      .slice(0, 8)
      .map((element) => ({
        class: element.className,
        left: element.getBoundingClientRect().left,
        right: element.getBoundingClientRect().right,
      })),
    scroll: document.documentElement.scrollWidth,
    overflow: [
      ...document.querySelectorAll(
        "main button,main input,main select,.header-actions,.desktop-nav",
      ),
    ]
      .filter((element) => {
        const r = element.getBoundingClientRect();
        return (
          r.width && r.height && (r.left < -0.5 || r.right > innerWidth + 0.5)
        );
      })
      .map((element) => ({
        text:
          element.getAttribute("aria-label") ??
          element.textContent?.slice(0, 60),
        left: element.getBoundingClientRect().left,
        right: element.getBoundingClientRect().right,
      })),
  }));
  expect(report.scroll, JSON.stringify(report)).toBeLessThanOrEqual(
    report.width,
  );
  expect(report.overflow, JSON.stringify(report)).toEqual([]);
}
async function pdf() {
  const doc = await PDFDocument.create();
  for (let i = 0; i < 4; i++)
    doc.addPage([612, 792]).drawText(`Page ${i + 1}`, { x: 40, y: 700 });
  return Buffer.from(await doc.save());
}
async function image(page: Page) {
  return Buffer.from(
    await page.evaluate(() => {
      const c = document.createElement("canvas");
      c.width = 320;
      c.height = 160;
      c.getContext("2d")!.fillRect(0, 0, 320, 160);
      return c.toDataURL().split(",")[1];
    }),
    "base64",
  );
}

for (const viewport of viewports)
  test(`all routes fit ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      await noOverflow(page);
    }
  });

for (const width of [320, 390, 561, 768, 1024, 1366, 1920])
  test(`populated tool workspaces fit ${width}px with long filenames`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    const pdfBytes = await pdf();
    for (const tool of tools) {
      await page.goto(`/tool/${tool.id}`);
      await expect(page.locator("h1")).toBeVisible();
      const ext =
        tool.input ??
        (tool.category === "pdf"
          ? "pdf"
          : tool.id === "batch-rename"
            ? "txt"
            : "png");
      const bytes =
        ext === "docx"
          ? wordFixture()
          : ext === "xlsx"
            ? excelFixture()
            : ext === "pptx"
              ? powerpointFixture()
              : ext === "pdf"
                ? pdfBytes
                : ext === "txt"
                  ? Buffer.from("rename fixture")
                  : await image(page);
      const name = `Research-report_with_a_very_long_filename_${"2026_final_".repeat(8)}.${ext}`;
      await page.getByLabel("Select files", { exact: true }).setInputFiles({
        name,
        mimeType: tool.input
          ? officeMime[tool.input]
          : ext === "pdf"
            ? "application/pdf"
            : ext === "txt"
              ? "text/plain"
              : "image/png",
        buffer: Buffer.from(bytes),
      });
      await expect(page.locator(".file-row")).toHaveCount(1, {
        timeout: 30000,
      });
      await noOverflow(page);
      if (tool.id === "organize-pdf") {
        await expect(page.locator(".page-card")).toHaveCount(4);
        const overlaps = await page
          .locator(".page-actions")
          .first()
          .evaluate((element) => {
            const buttons = [...element.querySelectorAll("button")];
            return buttons.some((button, i) =>
              buttons.slice(i + 1).some((other) => {
                const a = button.getBoundingClientRect(),
                  b = other.getBoundingClientRect();
                return (
                  Math.min(a.right, b.right) > Math.max(a.left, b.left) + 0.5 &&
                  Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top) + 0.5
                );
              }),
            );
          });
        expect(overlaps).toBe(false);
      }
    }
  });
