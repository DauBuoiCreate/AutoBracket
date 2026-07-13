import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, copyFile, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { pnpmInvocation } from "./pnpm-invocation.mjs";
import { shouldCopyPath } from "./verify-clean-copy.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temporaryRoot = resolve(tmpdir());
const fixturePrefix = "autobracket-error-boundaries-";
const standardEnvironment = {
  ...process.env,
  CI: "true",
  NEXT_TELEMETRY_DISABLED: "1",
};

const controlledOverlay = [
  {
    destination: "apps/web/src/app/controlled-error-template.tsx",
    source: "tests/fixtures/error-boundaries/controlled-error-template.tsx",
  },
  {
    destination: "apps/web/src/app/template.tsx",
    source: "tests/fixtures/error-boundaries/root-template.tsx",
  },
  {
    destination: "apps/web/src/app/health/template.tsx",
    source: "tests/fixtures/error-boundaries/health-template.tsx",
  },
];

function runPnpm(cwd, arguments_) {
  const invocation = pnpmInvocation(arguments_, { environment: standardEnvironment });
  const result = spawnSync(invocation.command, invocation.args, {
    cwd,
    env: standardEnvironment,
    stdio: "inherit",
    windowsHide: true,
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`pnpm ${arguments_.join(" ")} exited with ${String(result.status)}`);
  }
}

export function isSafeErrorBoundaryFixturePath(fixtureRoot) {
  const resolvedFixture = resolve(fixtureRoot);
  return (
    resolvedFixture.startsWith(`${temporaryRoot}${sep}`) &&
    basename(resolvedFixture).startsWith(fixturePrefix)
  );
}

async function removeFixture(fixtureRoot) {
  if (!isSafeErrorBoundaryFixturePath(fixtureRoot)) {
    throw new Error(`Refusing to remove unexpected path: ${resolve(fixtureRoot)}`);
  }

  await rm(fixtureRoot, { force: true, maxRetries: 5, recursive: true, retryDelay: 200 });
}

async function addControlledOverlay(fixtureRoot) {
  for (const file of controlledOverlay) {
    const destination = resolve(fixtureRoot, file.destination);
    if (existsSync(destination)) {
      throw new Error(`Refusing to replace an existing application file: ${file.destination}`);
    }

    await copyFile(resolve(fixtureRoot, file.source), destination);
  }
}

async function readAppRouteKeys(root) {
  const manifestPath = resolve(root, "apps", "web", ".next", "server", "app-paths-manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  return Object.keys(manifest).sort();
}

export async function runWebE2e() {
  runPnpm(repositoryRoot, ["build"]);
  const standardRoutes = await readAppRouteKeys(repositoryRoot);
  runPnpm(repositoryRoot, ["exec", "playwright", "test", "tests/e2e/health.spec.ts"]);

  const fixtureRoot = await mkdtemp(resolve(temporaryRoot, fixturePrefix));
  try {
    await cp(repositoryRoot, fixtureRoot, {
      filter: (source) => shouldCopyPath(source, repositoryRoot),
      recursive: true,
    });
    runPnpm(fixtureRoot, ["install", "--frozen-lockfile"]);
    await addControlledOverlay(fixtureRoot);
    runPnpm(fixtureRoot, ["build"]);

    const controlledRoutes = await readAppRouteKeys(fixtureRoot);
    if (JSON.stringify(controlledRoutes) !== JSON.stringify(standardRoutes)) {
      throw new Error("Controlled error-boundary overlay changed the public route manifest");
    }

    runPnpm(fixtureRoot, ["exec", "playwright", "test", "tests/e2e/error-boundaries.spec.ts"]);
  } finally {
    await removeFixture(fixtureRoot);
  }

  console.log("WEB_E2E_VERIFY=PASS (standard health plus isolated segment/global error recovery)");
}

if (import.meta.main) {
  try {
    await runWebE2e();
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error(`WEB_E2E_VERIFY=FAIL (${errorName})`);
    process.exitCode = 1;
  }
}
