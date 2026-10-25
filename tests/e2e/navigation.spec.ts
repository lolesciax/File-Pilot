import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { tools } from "../../src/lib/catalog";

test("Convert dropdown groups real converters and closes after navigation", async ({
  page,
}) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  const home = nav.getByRole("link", { name: "Home", exact: true });
  await expect(home).toHaveAttribute("href", "/");
  await expect(home).toHaveAttribute("aria-current", "page");
  const trigger = nav.getByRole("button", { name: "Convert", exact: true });
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  const panel = page.locator("#navigation-convert");
  await expect(
    panel.getByRole("heading", { name: "Convert to PDF" }),
  ).toBeVisible();
  await expect(
    panel.getByRole("heading", { name: "Convert from PDF" }),
  ).toBeVisible();
  await expect(panel.getByRole("link")).toHaveCount(9);
  await expect(
    panel.getByRole("link", { name: "Word to PDF", exact: true }),
  ).toHaveAttribute("href", "/tool/word-to-pdf");
  await panel.getByRole("link", { name: "Images to PDF", exact: true }).click();
  await expect(page).toHaveURL(/tool\/images-to-pdf/);
  await expect(panel).toHaveCount(0);
  await expect(home).not.toHaveAttribute("aria-current", "page");
  await home.click();
  await expect(page).toHaveURL("/");
  await expect(home).toHaveAttribute("aria-current", "page");
});
test("All tools mega menu contains every supported tool and dismisses on outside click", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "All tools", exact: true }).click();
  const panel = page.locator("#navigation-all");
  await expect(panel.locator(".mega-tool-link")).toHaveCount(tools.length);
  await expect(panel.getByRole("heading")).toHaveCount(4);
  const bounds = (await panel.boundingBox())!;
  await page.mouse.click(Math.max(1, bounds.x / 2), bounds.y + 20);
  await expect(panel).toHaveCount(0);
});
test("dropdown supports hover, keyboard opening, Escape and focus restoration", async ({
  page,
}) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Convert", exact: true });
  await trigger.hover();
  await expect(page.locator("#navigation-convert")).toBeVisible();
  await page.mouse.move(2, 300);
  await expect(page.locator("#navigation-convert")).toHaveCount(0);
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("link", { name: "Images to PDF", exact: true }).first(),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(
    page.locator("#navigation-convert .mega-tool-link").first(),
  ).toBeFocused();
});
test("open menus fit desktop and tablet sizes, support dark theme and pass axe scans", async ({
  page,
}) => {
  for (const width of [801, 820, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const brand = (await page.locator("header .brand").boundingBox())!;
    const navigation = (await page.locator(".desktop-nav").boundingBox())!;
    const actions = (await page.locator(".header-actions").boundingBox())!;
    expect(brand.x + brand.width).toBeLessThanOrEqual(navigation.x);
    expect(navigation.x + navigation.width).toBeLessThanOrEqual(actions.x);
    expect(actions.x + actions.width).toBeLessThanOrEqual(width);
    for (const name of ["Convert", "All tools"]) {
      await page.getByRole("button", { name, exact: true }).click();
      const panel = page.locator(".mega-panel");
      await expect(panel).toBeVisible();
      const box = (await panel.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      await page.keyboard.press("Escape");
    }
  }
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "All tools", exact: true }).click();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
test("mobile drawer lists grouped tools and navigates to a tool", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation" }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "Convert files" }),
  ).toBeVisible();
  await dialog
    .getByRole("link", { name: "PDF to images", exact: true })
    .click();
  await expect(page).toHaveURL(/tool\/pdf-to-images/);
  await expect(dialog).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("capture grouped navigation", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/");
  await page.getByRole("button", { name: "Convert", exact: true }).click();
  await page.screenshot({
    path: "output/playwright/navigation-convert.png",
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "All tools", exact: true }).click();
  await page.screenshot({
    path: "output/playwright/navigation-all.png",
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await page.screenshot({
    path: "output/playwright/home-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
});
