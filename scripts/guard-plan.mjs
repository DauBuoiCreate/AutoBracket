import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const expectedApps = ["realtime", "web", "worker"];
const expectedPackages = ["config", "contracts", "db", "domain", "testkit", "ui"];
const requiredScripts = [
  "build",
  "db:generate",
  "db:migrate",
  "db:seed",
  "dev",
  "format:check",
  "guard:plan",
  "lint",
  "staging:clean",
  "staging:smoke",
  "staging:up",
  "test:e2e",
  "test:engine",
  "test:integration",
  "test:unit",
  "typecheck",
  "verify",
  "verify:ci-negative",
  "verify:runtime-startup",
];
const requiredRepositoryFiles = [
  ".github/pull_request_template.md",
  ".github/workflows/ci.yml",
  "infra/docker/compose.staging.yml",
  "infra/docker/Dockerfile",
  "playwright.config.ts",
  "scripts/pnpm-invocation.mjs",
  "scripts/verify-runtime-startup.mjs",
  "vitest.config.ts",
  "vitest.integration.config.ts",
];
const forbiddenLockfiles = new Set([
  "bun.lock",
  "bun.lockb",
  "npm-shrinkwrap.json",
  "package-lock.json",
  "yarn.lock",
]);
const ignoredDirectories = new Set([
  ".git",
  ".next",
  ".pnpm-store",
  "coverage",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results",
]);

const planDocuments = [
  "README.md",
  "00-MASTER-PLAN.md",
  "01-PRODUCT-REQUIREMENTS.md",
  "02-DOMAIN-AND-TOURNAMENT-RULES.md",
  "03-USER-FLOWS-AND-SCREENS.md",
  "04-ARCHITECTURE-AND-STACK.md",
  "05-DATA-MODEL.md",
  "06-SECURITY-ROLES-VIP.md",
  "07-API-REALTIME-INTEGRATIONS.md",
  "08-DELIVERY-ROADMAP.md",
  "09-MASTER-CHECKLIST.md",
  "10-TEST-STRATEGY.md",
  "11-OPERATIONS-AND-RELEASE.md",
  "12-AI-RULES.md",
  "13-DECISIONS.md",
  "14-CHANGELOG-AND-CHANGE-CONTROL.md",
  "15-RISKS-OPEN-QUESTIONS.md",
  "16-FEATURE-BACKLOG.md",
  "17-TRACEABILITY.md",
  "PROJECT_STATE.md",
  "templates/ADR-TEMPLATE.md",
  "templates/CHANGE-REQUEST-TEMPLATE.md",
  "templates/PHASE-HANDOFF-TEMPLATE.md",
];

function exists(path) {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

function readJson(path, issues, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    issues.push(
      `${label} không đọc được: ${error instanceof Error ? error.message : String(error)}`,
    );
    return undefined;
  }
}

function listDirectoryNames(path) {
  if (!exists(path)) {
    return [];
  }

  return readdirSync(path, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function collectLockfiles(root) {
  const matches = [];

  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && ignoredDirectories.has(entry.name)) {
        continue;
      }

      const absolutePath = join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolutePath);
        continue;
      }

      if (forbiddenLockfiles.has(entry.name) || entry.name === "pnpm-lock.yaml") {
        matches.push(relative(root, absolutePath).replaceAll("\\", "/"));
      }
    }
  }

  visit(root);
  return matches.sort();
}

function collectTypeScriptSources(directory) {
  const sources = [];

  function visit(currentDirectory) {
    for (const entry of readdirSync(currentDirectory, { withFileTypes: true })) {
      const absolutePath = join(currentDirectory, entry.name);
      if (entry.isDirectory()) {
        visit(absolutePath);
      } else if (/\.(?:cts|mts|ts|tsx)$/u.test(entry.name)) {
        sources.push(readFileSync(absolutePath, "utf8"));
      }
    }
  }

  visit(directory);
  return sources;
}

function findForbiddenDomainImports(sources) {
  const specifiers = new Set();
  const patterns = [
    /\bfrom\s+["']([^"']+)["']/gu,
    /\bimport\s+["']([^"']+)["']/gu,
    /\b(?:import|require)\s*\(\s*["']([^"']+)["']/gu,
  ];

  for (const source of sources) {
    for (const pattern of patterns) {
      for (const match of source.matchAll(pattern)) {
        if (match[1]) {
          specifiers.add(match[1]);
        }
      }
    }
  }

  return [...specifiers]
    .filter(
      (specifier) =>
        specifier === "next" ||
        specifier.startsWith("next/") ||
        specifier === "prisma" ||
        specifier.startsWith("prisma/") ||
        specifier === "@prisma/client" ||
        specifier.startsWith("@prisma/") ||
        specifier === "socket.io" ||
        specifier.startsWith("socket.io/") ||
        specifier === "socket.io-client" ||
        specifier.startsWith("socket.io-client/") ||
        specifier === "fs" ||
        specifier.startsWith("fs/") ||
        specifier === "node:fs" ||
        specifier.startsWith("node:fs/"),
    )
    .sort();
}

function parseWorkspacePatterns(source) {
  const patterns = [];
  let inPackages = false;

  for (const line of source.split(/\r?\n/u)) {
    if (/^packages:\s*$/u.test(line)) {
      inPackages = true;
      continue;
    }

    if (inPackages && /^\S/u.test(line) && !line.startsWith("#")) {
      break;
    }

    if (!inPackages) {
      continue;
    }

    const match = line.match(/^\s+-\s+["']?([^"'#]+?)["']?\s*(?:#.*)?$/u);
    if (match?.[1]) {
      patterns.push(match[1].trim());
    }
  }

  return patterns.sort();
}

function sameItems(actual, expected) {
  return (
    actual.length === expected.length && actual.every((value, index) => value === expected[index])
  );
}

export function inspectRepository(rootDirectory) {
  const root = resolve(rootDirectory);
  const issues = [];
  const packagePath = join(root, "package.json");

  if (!exists(packagePath)) {
    issues.push("Thiếu package.json ở root.");
  }

  const rootPackage = exists(packagePath)
    ? readJson(packagePath, issues, "package.json")
    : undefined;
  if (rootPackage) {
    if (rootPackage.private !== true) {
      issues.push("package.json phải có private=true.");
    }

    if (!/^pnpm@\d+\.\d+\.\d+$/u.test(rootPackage.packageManager ?? "")) {
      issues.push("packageManager phải khóa chính xác theo dạng pnpm@x.y.z.");
    }

    const nodeVersion = rootPackage.engines?.node;
    const pnpmVersion = rootPackage.engines?.pnpm;
    if (!/^\d+\.\d+\.\d+$/u.test(nodeVersion ?? "")) {
      issues.push("engines.node phải là một patch version chính xác.");
    }
    if (rootPackage.packageManager !== `pnpm@${pnpmVersion ?? ""}`) {
      issues.push("engines.pnpm phải khớp packageManager.");
    }

    for (const script of requiredScripts) {
      if (
        typeof rootPackage.scripts?.[script] !== "string" ||
        rootPackage.scripts[script].length === 0
      ) {
        issues.push(`Thiếu root script ${script}.`);
      }
    }

    const nvmrcPath = join(root, ".nvmrc");
    if (!exists(nvmrcPath)) {
      issues.push("Thiếu .nvmrc.");
    } else if (readFileSync(nvmrcPath, "utf8").trim() !== nodeVersion) {
      issues.push(".nvmrc phải khớp engines.node.");
    }
  }

  const workspacePath = join(root, "pnpm-workspace.yaml");
  if (!exists(workspacePath)) {
    issues.push("Thiếu pnpm-workspace.yaml.");
  } else {
    const patterns = parseWorkspacePatterns(readFileSync(workspacePath, "utf8"));
    if (!sameItems(patterns, ["apps/*", "packages/*"])) {
      issues.push("pnpm-workspace.yaml chỉ được chứa apps/* và packages/*.");
    }
  }

  const appNames = listDirectoryNames(join(root, "apps"));
  if (!sameItems(appNames, expectedApps)) {
    issues.push(`Workspace apps phải đúng: ${expectedApps.join(", ")}.`);
  }

  const packageNames = listDirectoryNames(join(root, "packages"));
  if (!sameItems(packageNames, expectedPackages)) {
    issues.push(`Workspace packages phải đúng: ${expectedPackages.join(", ")}.`);
  }

  for (const [kind, names] of [
    ["apps", expectedApps],
    ["packages", expectedPackages],
  ]) {
    for (const name of names) {
      const manifestPath = join(root, kind, name, "package.json");
      if (!exists(manifestPath)) {
        issues.push(`Thiếu ${kind}/${name}/package.json.`);
      }
    }
  }

  for (const directory of ["infra/docker", "infra/monitoring", "scripts"]) {
    if (!exists(join(root, directory))) {
      issues.push(`Thiếu thư mục ${directory}.`);
    }
  }

  for (const file of requiredRepositoryFiles) {
    if (!exists(join(root, file))) {
      issues.push(`Thiếu tệp nền móng bắt buộc: ${file}.`);
    }
  }

  if (!exists(join(root, "AGENTS.md"))) {
    issues.push("Thiếu AGENTS.md.");
  }
  for (const document of planDocuments) {
    if (!exists(join(root, "Plan", document))) {
      issues.push(`Thiếu Plan/${document}.`);
    }
  }

  const lockfiles = collectLockfiles(root);
  const foreignLockfiles = lockfiles.filter((path) => path !== "pnpm-lock.yaml");
  if (!lockfiles.includes("pnpm-lock.yaml")) {
    issues.push("Thiếu pnpm-lock.yaml ở root.");
  }
  if (foreignLockfiles.length > 0) {
    issues.push(`Phát hiện lockfile không hợp lệ: ${foreignLockfiles.join(", ")}.`);
  }

  const statePath = join(root, "Plan", "PROJECT_STATE.md");
  const roadmapPath = join(root, "Plan", "08-DELIVERY-ROADMAP.md");
  if (exists(statePath) && exists(roadmapPath)) {
    const state = readFileSync(statePath, "utf8");
    const activeMatches = [...state.matchAll(/^- Task `IN_PROGRESS`: `([A-Z]\d-\d{2})\b[^`]*`/gmu)];
    if (activeMatches.length !== 1) {
      issues.push("PROJECT_STATE.md phải có đúng một dòng Task IN_PROGRESS với Task ID hợp lệ.");
    } else {
      const activeTask = activeMatches[0]?.[1];
      const roadmap = readFileSync(roadmapPath, "utf8");
      if (!activeTask || !roadmap.includes(`### \`${activeTask}\``)) {
        issues.push(`Task active ${activeTask ?? "không xác định"} không tồn tại trong roadmap.`);
      }
    }
  }

  const decisionsPath = join(root, "Plan", "13-DECISIONS.md");
  if (exists(decisionsPath)) {
    const decisions = readFileSync(decisionsPath, "utf8");
    const found = [...decisions.matchAll(/^\| (D-\d{3}) \|/gmu)].map((match) => match[1]);
    const unique = new Set(found);
    if (unique.size !== found.length) {
      issues.push("Sổ quyết định có Decision ID trùng.");
    }
    for (let index = 1; index <= 25; index += 1) {
      const id = `D-${String(index).padStart(3, "0")}`;
      if (!unique.has(id)) {
        issues.push(`Thiếu quyết định khóa ${id}.`);
      }
    }
  }

  const strictConfigPath = join(root, "packages", "config", "typescript", "base.json");
  if (!exists(strictConfigPath)) {
    issues.push("Thiếu TypeScript base config.");
  } else {
    const strictConfig = readJson(strictConfigPath, issues, "TypeScript base config");
    if (strictConfig?.compilerOptions?.strict !== true) {
      issues.push("TypeScript base config phải bật strict=true.");
    }
  }

  const domainSourcePath = join(root, "packages", "domain", "src");
  if (exists(domainSourcePath)) {
    const forbiddenImports = findForbiddenDomainImports(collectTypeScriptSources(domainSourcePath));
    if (forbiddenImports.length > 0) {
      issues.push(`packages/domain đang import module bị cấm: ${forbiddenImports.join(", ")}.`);
    }
  }

  return issues.sort();
}

function runCli() {
  const rootFlagIndex = process.argv.indexOf("--root");
  const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const root = rootFlagIndex >= 0 ? process.argv[rootFlagIndex + 1] : defaultRoot;

  if (!root) {
    console.error("--root cần một đường dẫn.");
    process.exitCode = 1;
    return;
  }

  const issues = inspectRepository(root);
  if (issues.length > 0) {
    console.error("AutoBracket plan guard failed:");
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("AutoBracket plan guard passed: 3 apps, 6 packages, pnpm-only, active task valid.");
}

if (import.meta.main) {
  runCli();
}
