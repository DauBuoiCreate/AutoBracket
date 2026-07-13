import { cp, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { shouldCopyPath } from "./verify-clean-copy.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temporaryRoot = resolve(tmpdir());

function run(command, args, cwd = repositoryRoot) {
  return spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, CI: "true" },
    windowsHide: true,
  });
}

function pnpmCommand(args) {
  const pnpmCli = process.env.npm_execpath;
  if (!pnpmCli) {
    throw new Error("CI negative verification must be launched from a pnpm script.");
  }
  return run(process.execPath, [pnpmCli, ...args]);
}

function assertExpectedFailure(result, label, outputFragment) {
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (result.error) {
    throw result.error;
  }
  if (result.status === 0 || !output.includes(outputFragment)) {
    throw new Error(
      `${label} did not fail for the expected reason (status=${String(result.status)}).`,
    );
  }
}

async function removeFixture(fixtureRoot) {
  const resolvedFixture = resolve(fixtureRoot);
  if (
    !resolvedFixture.startsWith(`${temporaryRoot}${sep}`) ||
    !basename(resolvedFixture).startsWith("autobracket-ci-negative-")
  ) {
    throw new Error(`Refusing to remove unexpected path: ${resolvedFixture}`);
  }
  await rm(resolvedFixture, { force: true, recursive: true });
}

export async function verifyCiNegativePaths() {
  const fixtureRoot = await mkdtemp(resolve(temporaryRoot, "autobracket-ci-negative-"));

  try {
    await cp(repositoryRoot, fixtureRoot, {
      filter: (source) => shouldCopyPath(source, repositoryRoot),
      recursive: true,
    });
    await writeFile(resolve(fixtureRoot, "package-lock.json"), "{}\n", "utf8");

    assertExpectedFailure(
      run(process.execPath, [
        resolve(repositoryRoot, "scripts/guard-plan.mjs"),
        "--root",
        fixtureRoot,
      ]),
      "Foreign lockfile guard",
      "package-lock.json",
    );

    assertExpectedFailure(
      pnpmCommand(["exec", "vitest", "run", "--config", "vitest.ci-negative.config.ts"]),
      "Intentional test failure",
      "intentional-failure",
    );

    console.log("CI_NEGATIVE_VERIFY=PASS (foreign lockfile and failing test were blocked)");
  } finally {
    await removeFixture(fixtureRoot);
  }
}

if (import.meta.main) {
  await verifyCiNegativePaths();
}
