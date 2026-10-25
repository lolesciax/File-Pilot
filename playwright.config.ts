import { defineConfig } from "@playwright/test";
const requestedPort = Number(process.env.FILEPILOT_PORT ?? 4173);
const port =
  Number.isInteger(requestedPort) &&
  requestedPort >= 1024 &&
  requestedPort <= 65535
    ? requestedPort
    : 4173;
const externalURL = process.env.FILEPILOT_BASE_URL;
if (externalURL && new URL(externalURL).protocol !== "https:")
  throw new Error("FILEPILOT_BASE_URL must use HTTPS.");
const baseURL = externalURL ?? `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: {
    browserName:
      process.env.FILEPILOT_BROWSER === "firefox"
        ? "firefox"
        : process.env.FILEPILOT_BROWSER === "webkit"
          ? "webkit"
          : "chromium",
    baseURL,
    headless: true,
    acceptDownloads: true,
  },
  webServer: externalURL
    ? undefined
    : {
        command:
          process.env.FILEPILOT_PRODUCTION === "1"
            ? `npm run preview -- --port ${port}`
            : `npm run dev -- --port ${port}`,
        url: baseURL,
        reuseExistingServer:
          !process.env.CI && process.env.FILEPILOT_PRODUCTION !== "1",
      },
  reporter: "list",
});
