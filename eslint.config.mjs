import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  {
    ...js.configs.recommended,
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      globals: globals.node,
    },
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ...config.languageOptions,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  })),
  ...nextVitals,
  ...nextTypeScript,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
    },
  },
  {
    rules: {
      "@next/next/no-html-link-for-pages": "off",
    },
    settings: {
      next: {
        rootDir: "apps/web/",
      },
      react: {
        version: "19.2",
      },
    },
  },
  globalIgnores([
    "**/.next/**",
    "**/coverage/**",
    "**/dist/**",
    "**/src/generated/**",
    "**/node_modules/**",
    "**/playwright-report/**",
    "**/test-results/**",
    "**/*.tsbuildinfo",
  ]),
]);
