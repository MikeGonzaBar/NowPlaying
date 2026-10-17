import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    // Unit tests live in src/. `e2e/` holds Playwright specs that must run
    // under `npx playwright test`, not vitest.
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
