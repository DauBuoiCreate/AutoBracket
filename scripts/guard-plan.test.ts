import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve, sep } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { inspectRepository } from "./guard-plan.mjs";
import { shouldCopyPath } from "./verify-clean-copy.mjs";

const repositoryRoot = resolve(import.meta.dirname, "..");
const temporaryRoot = resolve(tmpdir());
const fixturePrefix = "autobracket-guard-";
const fixtureTestTimeout = 15_000;
const temporaryRoots: string[] = [];

async function createRepositoryFixture() {
  const fixtureRoot = await mkdtemp(join(temporaryRoot, fixturePrefix));
  temporaryRoots.push(fixtureRoot);
  await cp(repositoryRoot, fixtureRoot, {
    filter: (source) => shouldCopyPath(source, repositoryRoot),
    recursive: true,
  });
  return fixtureRoot;
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map(async (root) => {
      const resolvedRoot = resolve(root);
      if (
        !resolvedRoot.startsWith(`${temporaryRoot}${sep}`) ||
        !basename(resolvedRoot).startsWith(fixturePrefix)
      ) {
        throw new Error(`Refusing to remove unexpected test path: ${root}`);
      }
      await rm(root, { force: true, maxRetries: 5, recursive: true, retryDelay: 200 });
    }),
  );
});

describe("inspectRepository", () => {
  it("accepts the repository baseline", () => {
    expect(inspectRepository(repositoryRoot)).toEqual([]);
  });

  it(
    "rejects a foreign lockfile",
    async () => {
      const fixtureRoot = await createRepositoryFixture();
      await writeFile(join(fixtureRoot, "package-lock.json"), "{}\n", "utf8");

      expect(inspectRepository(fixtureRoot)).toContain(
        "Phát hiện lockfile không hợp lệ: package-lock.json.",
      );
    },
    fixtureTestTimeout,
  );

  it(
    "rejects a package manager mismatch",
    async () => {
      const fixtureRoot = await createRepositoryFixture();
      const packagePath = join(fixtureRoot, "package.json");
      const manifest = JSON.parse(await readFile(packagePath, "utf8"));
      manifest.packageManager = "npm@11.0.0";
      await writeFile(packagePath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

      expect(inspectRepository(fixtureRoot)).toContain(
        "packageManager phải khóa chính xác theo dạng pnpm@x.y.z.",
      );
    },
    fixtureTestTimeout,
  );

  it(
    "rejects an unplanned workspace",
    async () => {
      const fixtureRoot = await createRepositoryFixture();
      const packagePath = join(fixtureRoot, "package.json");
      await writeFile(join(fixtureRoot, "apps", "unexpected.txt"), "not a directory\n", "utf8");
      const manifest = JSON.parse(await readFile(packagePath, "utf8"));
      expect(manifest.private).toBe(true);

      await cp(join(fixtureRoot, "apps", "worker"), join(fixtureRoot, "apps", "extra"), {
        recursive: true,
      });
      expect(inspectRepository(fixtureRoot)).toContain(
        "Workspace apps phải đúng: realtime, web, worker.",
      );
    },
    fixtureTestTimeout,
  );

  it(
    "rejects an active task missing from the roadmap",
    async () => {
      const fixtureRoot = await createRepositoryFixture();
      const statePath = join(fixtureRoot, "Plan", "PROJECT_STATE.md");
      const state = await readFile(statePath, "utf8");
      await writeFile(
        statePath,
        state.replace(/^- Task `IN_PROGRESS`: `[A-Z]\d-\d{2}/mu, "- Task `IN_PROGRESS`: `P9-99"),
        "utf8",
      );

      expect(inspectRepository(fixtureRoot)).toContain(
        "Task active P9-99 không tồn tại trong roadmap.",
      );
    },
    fixtureTestTimeout,
  );

  it(
    "rejects forbidden domain imports in nested folders and subpaths",
    async () => {
      const fixtureRoot = await createRepositoryFixture();
      const nestedDomain = join(fixtureRoot, "packages", "domain", "src", "nested");
      await mkdir(nestedDomain, { recursive: true });
      await writeFile(
        join(nestedDomain, "forbidden.ts"),
        [
          'import type { PrismaClient } from "@prisma/client";',
          'export const loadNext = () => import("next/server");',
          'export const loadFile = () => import("node:fs/promises");',
        ].join("\n"),
        "utf8",
      );

      expect(inspectRepository(fixtureRoot)).toContain(
        "packages/domain đang import module bị cấm: @prisma/client, next/server, node:fs/promises.",
      );
    },
    fixtureTestTimeout,
  );
});
