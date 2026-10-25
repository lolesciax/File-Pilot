import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync } from "node:fs";
export default defineConfig({
  worker: { format: "es" },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "filepilot-preview-headers",
      configurePreviewServer(server) {
        const headers = readFileSync(
          new URL("./public/_headers", import.meta.url),
          "utf8",
        )
          .split("\n")
          .slice(1)
          .filter((line) => line.trim())
          .map((line) => {
            const colon = line.indexOf(":");
            return [line.slice(0, colon).trim(), line.slice(colon + 1).trim()];
          });
        server.middlewares.use((_req, res, next) => {
          for (const [key, value] of headers) res.setHeader(key, value);
          next();
        });
      },
    },
  ],
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.{ts,tsx}"],
    setupFiles: ["./tests/setup.ts"],
  },
});
