import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("footer and Settings open the privacy notice; direct navigation and section links work", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("contentinfo")
    .getByRole("link", { name: "Privacy", exact: true })
    .click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(
    page.getByRole("heading", { name: "Privacy notice", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveTitle("FilePilot — Privacy notice");
  await expect(page.locator("time")).toHaveAttribute("datetime", "2026-10-25");
  await page
    .getByRole("navigation", { name: "Privacy notice contents" })
    .getByRole("link", { name: "Browser storage and retention" })
    .click();
  await expect(page).toHaveURL(/#storage$/);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "2. Browser storage and retention" }),
  ).toBeVisible();
  await page.goto("/settings");
  await page
    .getByRole("link", { name: "Read the full privacy notice" })
    .click();
  await expect(page).toHaveURL(/\/privacy$/);
});

test("notice describes local files, persistent preference, host requests and safe external links", async ({
  page,
}) => {
  await page.goto("/privacy");
  await expect(page.locator("article")).toContainText("filepilot-theme");
  await expect(page.locator("#network")).toContainText(
    "has not yet been deployed",
  );
  await expect(page.locator("#storage")).toContainText(
    "does not delete original files or downloaded copies",
  );
  const vercel = page.getByRole("link", { name: /Vercel privacy notice/ });
  await expect(vercel).toHaveAttribute(
    "href",
    "https://vercel.com/legal/privacy-notice",
  );
  await expect(vercel).toHaveAttribute("rel", "noopener noreferrer");
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((key) => key !== "filepilot-theme"),
    ),
  ).toEqual([]);
});

test("privacy notice fits small and desktop screens, supports dark mode and has no axe violations", async ({
  page,
}) => {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/privacy");
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(result.violations).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "Privacy notice", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
