import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    exclude: [
      "**/.next/**",
      "**/*.integration.test.ts",
      "**/dist/**",
      "**/node_modules/**",
      "**/src/generated/**",
    ],
    include: ["scripts/**/*.test.ts", "packages/**/*.test.ts"],
  },
});
