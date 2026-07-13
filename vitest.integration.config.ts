import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    exclude: ["**/.next/**", "**/dist/**", "**/node_modules/**", "**/src/generated/**"],
    hookTimeout: 120_000,
    include: ["packages/**/*.integration.test.ts"],
    maxWorkers: 1,
    testTimeout: 120_000,
  },
});
