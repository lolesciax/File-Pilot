import { test, expect, type Page } from "@playwright/test";

async function recordMotion(page: Page) {
  await page.addInitScript(() => {
    const records: {
      target: string;
      properties: string[];
      iterations: number;
      fades: boolean;
      decorative: boolean;
    }[] = [];
    (window as unknown as { homeMotion: typeof records }).homeMotion = records;
    const native = Element.prototype.animate;
    Element.prototype.animate = function (keyframes, options) {
      records.push({
        target: this.getAttribute("href") ?? this.className.toString(),
        properties: Array.isArray(keyframes) ? Object.keys(keyframes[0]) : [],
        iterations: typeof options === "object" ? (options.iterations ?? 1) : 1,
        fades:
          Array.isArray(keyframes) && Number(keyframes[0].opacity ?? 1) < 1,
        decorative: this.closest('[aria-hidden="true"]') !== null,
      });
      return native.call(this, keyframes, options);
    };
  });
}
async function settle(page: Page) {
  await page.locator(".home-motion").evaluate(async (element) => {
    await Promise.all(
      element
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished.catch(() => {})),
    );
  });
}
test("hero motion finishes, preserves document rotations and uses only finite compositor properties", async ({
  page,
}) => {
  await recordMotion(page);
  await page.goto("/");
  await expect(page.locator(".hero h1")).toHaveAttribute(
    "data-home-revealed",
    "true",
  );
  await expect(page.locator(".art-zip")).toHaveAttribute(
    "data-home-revealed",
    "true",
  );
  await settle(page);
  await expect(page.locator(".hero h1")).toHaveCSS("opacity", "1");
  for (const sheet of [".art-pdf", ".art-image", ".art-zip"]) {
    await expect(page.locator(sheet)).not.toHaveCSS("transform", "none");
    await expect(page.locator(sheet)).toHaveCSS("opacity", "1");
  }
  const records = await page.evaluate(
    () =>
      (
        window as unknown as {
          homeMotion: {
            properties: string[];
            iterations: number;
            fades: boolean;
            decorative: boolean;
          }[];
        }
      ).homeMotion,
  );
  expect(records.length).toBeGreaterThan(5);
  expect(
    records.every(
      (entry) =>
        entry.iterations === 1 &&
        (!entry.fades || entry.decorative) &&
        entry.properties.every((property) =>
          ["opacity", "translate"].includes(property),
        ),
    ),
  ).toBe(true);
  expect(
    await page
      .locator(".home-motion")
      .evaluate((element) => element.getAnimations({ subtree: true }).length),
  ).toBe(0);
});
test("offscreen cards reveal once, remain readable and still open their tool", async ({
  page,
}) => {
  await recordMotion(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const card = page.locator(".tool-card").last();
  const href = await card.getAttribute("href");
  await expect(card).not.toHaveAttribute("data-home-revealed", "true");
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute("data-home-revealed", "true");
  await settle(page);
  await expect(card).toHaveCSS("opacity", "1");
  await page.evaluate(() => scrollTo(0, 0));
  await card.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      page.evaluate(
        (href) =>
          (
            window as unknown as { homeMotion: { target: string }[] }
          ).homeMotion.filter((record) => record.target === href).length,
        href,
      ),
    )
    .toBe(1);
  await card.click();
  await expect(page).toHaveURL(href!);
  await expect(page.locator(".dropzone-button")).toBeVisible({
    timeout: 15000,
  });
});
test("reduced-motion users get static, searchable and keyboard-accessible content", async ({
  page,
}) => {
  await recordMotion(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  expect(
    await page.evaluate(
      () => (window as unknown as { homeMotion: unknown[] }).homeMotion.length,
    ),
  ).toBe(0);
  const search = page.getByRole("searchbox", { name: "Search tools" });
  await search.focus();
  await search.fill("resize");
  await expect(page.locator(".tool-card")).toHaveCount(1);
  await expect(page.locator(".tool-card")).toHaveCSS("opacity", "1");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Clear search" }),
  ).toBeFocused();
  expect(
    await page
      .locator(".home-motion")
      .evaluate((element) => element.getAnimations({ subtree: true }).length),
  ).toBe(0);
});
test("turning on reduced motion cancels in-flight entrances", async ({
  page,
}) => {
  await page.goto("/");
  await expect
    .poll(() =>
      page
        .locator(".home-motion")
        .evaluate((element) => element.getAnimations({ subtree: true }).length),
    )
    .toBeGreaterThan(0);
  await page
    .locator(".home-motion")
    .evaluate((element) =>
      element
        .getAnimations({ subtree: true })
        .forEach((animation) => animation.pause()),
    );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() =>
      page
        .locator(".home-motion")
        .evaluate((element) => element.getAnimations({ subtree: true }).length),
    )
    .toBe(0);
  await expect(page.locator(".hero h1")).toHaveCSS("opacity", "1");
  await expect(page.locator(".hero-actions")).toHaveCSS("opacity", "1");
});
test("animated home fits mobile through desktop and filtering stays usable", async ({
  page,
}) => {
  for (const width of [320, 390, 768, 1024, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("searchbox", { name: "Search tools" }).fill("word");
    await expect(page.locator(".tool-card")).toHaveCount(2);
    await page.getByRole("button", { name: "Clear search" }).click();
    await expect(page.locator(".tool-card")).toHaveCount(18);
    await page.getByRole("searchbox", { name: "Search tools" }).focus();
    await expect(page.locator(".catalog-heading")).toHaveCSS("opacity", "1");
  }
  await settle(page);
  await page.screenshot({
    path: "output/playwright/home-motion-desktop.png",
    animations: "disabled",
    fullPage: true,
  });
});
