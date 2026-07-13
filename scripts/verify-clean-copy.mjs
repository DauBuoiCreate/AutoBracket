import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { pnpmInvocation } from "./pnpm-invocation.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temporaryRoot = resolve(tmpdir());
const excludedSegments = new Set([
  ".git",
  ".idea",
  ".next",
  ".pnpm-store",
  ".vscode",
  "coverage",
  "data",
  "dist",
  "generated",
  "node_modules",
  "playwright-report",
  "test-results",
  "tmp",
]);

function runPnpm(cwd, args) {
  const invocation = pnpmInvocation(args);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd,
    env: {
      ...process.env,
      CI: "true",
    },
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`corepack pnpm ${args.join(" ")} failed with exit ${result.status}`);
  }
}

async function removeFixture(fixtureRoot) {
  const resolvedFixture = resolve(fixtureRoot);
  if (
    !resolvedFixture.startsWith(`${temporaryRoot}${sep}`) ||
    !basename(resolvedFixture).startsWith("autobracket-clean-copy-")
  ) {
    throw new Error(`Refusing to remove unexpected path: ${resolvedFixture}`);
  }

  await rm(resolvedFixture, { force: true, recursive: true });
}

export function shouldCopyPath(source, root = repositoryRoot) {
  const pathFromRoot = relative(root, source);
  if (pathFromRoot === "") {
    return true;
  }

  const fileName = basename(source);
  if (fileName === ".env.example") {
    return true;
  }
  if (
    fileName === ".env" ||
    fileName.startsWith(".env.") ||
    fileName.endsWith(".log") ||
    fileName.endsWith(".tsbuildinfo") ||
    fileName === ".DS_Store" ||
    fileName === "Thumbs.db"
  ) {
    return false;
  }

  return !pathFromRoot.split(/[\\/]/u).some((segment) => excludedSegments.has(segment));
}

export async function verifyCleanCopy() {
  const fixtureRoot = await mkdtemp(resolve(temporaryRoot, "autobracket-clean-copy-"));

  try {
    await cp(repositoryRoot, fixtureRoot, {
      filter: (source) => shouldCopyPath(source, repositoryRoot),
      recursive: true,
    });

    runPnpm(fixtureRoot, ["install", "--frozen-lockfile"]);
    runPnpm(fixtureRoot, ["verify"]);
    console.log(`CLEAN_COPY_VERIFY=PASS (${basename(fixtureRoot)})`);
  } finally {
    await removeFixture(fixtureRoot);
  }
}

if (import.meta.main) {
  await verifyCleanCopy();
}
