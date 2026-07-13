import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { shouldCopyPath } from "./verify-clean-copy.mjs";

const root = resolve("D:/workspace/autobracket");

describe("clean-copy source policy", () => {
  it("keeps committed environment documentation", () => {
    expect(shouldCopyPath(resolve(root, ".env.example"), root)).toBe(true);
  });

  it.each([".env", ".env.local", "apps/web/.env.production", "debug.log"])(
    "excludes local or secret-bearing file %s",
    (path) => {
      expect(shouldCopyPath(resolve(root, path), root)).toBe(false);
    },
  );

  it.each([
    "node_modules/pkg/index.js",
    "apps/web/.next/server.js",
    "apps/web/tsconfig.tsbuildinfo",
    "packages/db/src/generated/prisma/client.ts",
    "data/local.db",
  ])("excludes generated/local path %s", (path) => {
    expect(shouldCopyPath(resolve(root, path), root)).toBe(false);
  });

  it("keeps source files", () => {
    expect(shouldCopyPath(resolve(root, "apps/web/src/app/page.tsx"), root)).toBe(true);
  });
});
