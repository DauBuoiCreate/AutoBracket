import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "..");

describe("CI contract", () => {
  it("uses the locked pnpm toolchain and invokes every P0 quality gate", async () => {
    const workflow = await readFile(
      resolve(repositoryRoot, ".github", "workflows", "ci.yml"),
      "utf8",
    );
    const rootPackage = JSON.parse(
      await readFile(resolve(repositoryRoot, "package.json"), "utf8"),
    ) as { packageManager: string; scripts: Record<string, string> };
    const webPackage = JSON.parse(
      await readFile(resolve(repositoryRoot, "apps", "web", "package.json"), "utf8"),
    ) as { scripts: Record<string, string>; type?: string };
    const playwrightConfig = await readFile(
      resolve(repositoryRoot, "playwright.config.ts"),
      "utf8",
    );
    const stagingCompose = await readFile(
      resolve(repositoryRoot, "infra", "docker", "compose.staging.yml"),
      "utf8",
    );
    const dockerfile = await readFile(
      resolve(repositoryRoot, "infra", "docker", "Dockerfile"),
      "utf8",
    );
    const standalonePreparation = await readFile(
      resolve(repositoryRoot, "apps", "web", "scripts", "prepare-standalone.mjs"),
      "utf8",
    );
    const webE2eRunner = await readFile(
      resolve(repositoryRoot, "scripts", "run-web-e2e.mjs"),
      "utf8",
    );
    const runtimeStartupVerifier = await readFile(
      resolve(repositoryRoot, "scripts", "verify-runtime-startup.mjs"),
      "utf8",
    );

    expect(rootPackage.packageManager).toBe("pnpm@11.12.0");
    expect(rootPackage.scripts.verify).toContain("verify:ci-negative");
    expect(rootPackage.scripts.verify).toContain("test:integration");
    expect(rootPackage.scripts.verify).toContain("build");
    expect(rootPackage.scripts.verify).toContain("verify:runtime-startup");
    expect(rootPackage.scripts["verify:runtime-startup"]).toBe(
      "node ./scripts/verify-runtime-startup.mjs",
    );
    expect(rootPackage.scripts["test:e2e"]).toBe("node ./scripts/run-web-e2e.mjs");
    expect(rootPackage.scripts.verify.indexOf("build")).toBeLessThan(
      rootPackage.scripts.verify.indexOf("verify:runtime-startup"),
    );
    expect(rootPackage.scripts.dev).not.toContain('"./apps/*"');
    expect(rootPackage.scripts.dev).not.toContain('"./packages/*"');
    for (const workspace of [
      "@autobracket/config",
      "@autobracket/contracts",
      "@autobracket/db",
      "@autobracket/domain",
      "@autobracket/testkit",
      "@autobracket/ui",
      "@autobracket/web",
      "@autobracket/realtime",
      "@autobracket/worker",
    ]) {
      expect(rootPackage.scripts.dev).toContain(`--filter ${workspace}`);
    }
    expect(webPackage.scripts.dev).not.toContain("--port 3000");
    expect(webPackage.type).toBe("module");
    expect(rootPackage.scripts["staging:smoke"]).toContain("--env-file=.env.staging");
    expect(rootPackage.scripts["staging:smoke"]).toContain("staging:validate");
    expect(rootPackage.scripts["staging:up"]).toContain("staging:validate");
    expect(playwrightConfig).toContain("failOnFlakyTests: isCi");
    expect(stagingCompose).toContain(
      "DATABASE_URL: ${STAGING_DATABASE_URL:?STAGING_DATABASE_URL is required}",
    );
    const realtimeEnvironment = stagingCompose.slice(
      stagingCompose.indexOf("  realtime:"),
      stagingCompose.indexOf("  worker:"),
    );
    expect(realtimeEnvironment).not.toContain("DATABASE_URL");
    expect(dockerfile).toContain('CMD ["node", "start-container.mjs"]');
    expect(standalonePreparation).toContain('"start-container.ts"');
    expect(webE2eRunner).toContain("shouldCopyPath");
    expect(webE2eRunner).toContain('["install", "--frozen-lockfile"]');
    expect(webE2eRunner).toContain("app-paths-manifest.json");
    expect(webE2eRunner).toContain("await removeFixture(fixtureRoot)");
    expect(webE2eRunner.indexOf('runPnpm(repositoryRoot, ["build"])')).toBeLessThan(
      webE2eRunner.indexOf("await mkdtemp"),
    );
    expect(runtimeStartupVerifier).toMatch(
      /"apps",\s*"web",\s*"\.next",\s*"standalone",\s*"start-container\.mjs"/u,
    );
    expect(runtimeStartupVerifier).toContain(
      'record.validationIssues[0].code !== "invalid_format"',
    );
    expect(workflow).toContain("corepack prepare pnpm@11.12.0 --activate");
    expect(workflow).toContain("corepack pnpm install --frozen-lockfile");
    expect(workflow).toContain("corepack pnpm verify");
    expect(workflow).toContain("corepack pnpm audit:prod");
    expect(workflow).toContain("corepack pnpm test:e2e");
    expect(workflow).toContain("corepack pnpm staging:up");
    expect(workflow).toContain("corepack pnpm staging:smoke");
    expect(workflow).toContain("corepack pnpm staging:clean");
    expect(workflow).toContain("staging-compose.log");
    expect(workflow.indexOf("Capture staging diagnostics")).toBeLessThan(
      workflow.indexOf("Stop staging topology"),
    );
    expect(workflow).toContain("docker info");
    expect(workflow).not.toMatch(/\b(?:npm|yarn|bun) (?:install|run|test)\b/u);
  });

  it("requires governance and evidence fields in the pull request template", async () => {
    const template = await readFile(
      resolve(repositoryRoot, ".github", "pull_request_template.md"),
      "utf8",
    );

    for (const requiredText of [
      "Task ID",
      "Quyết định `D-xxx`",
      "CR/ADR",
      "Migration/deploy order",
      "Test evidence",
      "Rủi ro/deferred work",
      "Handoff path",
    ]) {
      expect(template).toContain(requiredText);
    }
  });

  it("documents Prisma generation before the clean database walkthrough", async () => {
    const readme = await readFile(resolve(repositoryRoot, "README.md"), "utf8");
    const infraIndex = readme.indexOf("corepack pnpm infra:up");
    const generateIndex = readme.indexOf("corepack pnpm db:generate");
    const migrateIndex = readme.indexOf("corepack pnpm db:migrate");
    const seedIndex = readme.indexOf("corepack pnpm db:seed");

    expect(infraIndex).toBeGreaterThan(-1);
    expect(generateIndex).toBeGreaterThan(infraIndex);
    expect(migrateIndex).toBeGreaterThan(generateIndex);
    expect(seedIndex).toBeGreaterThan(migrateIndex);
  });

  it("uses symlink-safe main guards for executable verification scripts", async () => {
    for (const script of [
      "guard-plan.mjs",
      "validate-staging-env.mjs",
      "verify-ci-negative.mjs",
      "verify-clean-copy.mjs",
      "verify-clean-setup.mjs",
      "verify-runtime-startup.mjs",
      "run-web-e2e.mjs",
    ]) {
      const source = await readFile(resolve(repositoryRoot, "scripts", script), "utf8");
      expect(source).toContain("if (import.meta.main)");
      expect(source).not.toContain("entrypoint === import.meta.url");
    }
  });
});
