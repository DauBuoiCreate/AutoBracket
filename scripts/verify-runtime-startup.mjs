import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sensitiveFixtures = {
  authToken: "auth-token-fixture",
  contactEmail: "organizer@example.invalid",
  databasePassword: "database-password-fixture",
  redisPassword: "redis-password-fixture",
  storageAccessKey: "storage-access-key-fixture",
  unsafeRelease: "invalid release startup-secret-fixture",
};
const sensitiveFixtureValues = Object.values(sensitiveFixtures);
const inheritedEnvironmentAllowlist = [
  "APPDATA",
  "ComSpec",
  "HOME",
  "LANG",
  "LC_ALL",
  "LOCALAPPDATA",
  "PATH",
  "Path",
  "PATHEXT",
  "SystemRoot",
  "TEMP",
  "TMP",
  "TMPDIR",
  "TZ",
  "USERPROFILE",
  "WINDIR",
];
const expectedRecordKeys = [
  "error",
  "event",
  "level",
  "release",
  "service",
  "timestamp",
  "validationIssues",
];

const services = [
  {
    entrypoint: resolve(
      repositoryRoot,
      "apps",
      "web",
      ".next",
      "standalone",
      "start-container.mjs",
    ),
    name: "web",
  },
  {
    entrypoint: resolve(repositoryRoot, "apps", "worker", "dist", "index.js"),
    name: "worker",
  },
  {
    entrypoint: resolve(repositoryRoot, "apps", "realtime", "dist", "index.js"),
    name: "realtime",
  },
];

function fail(service, reason) {
  throw new Error(`${service} runtime startup verification failed: ${reason}.`);
}

function createIsolatedEnvironment() {
  const environment = {};
  for (const key of inheritedEnvironmentAllowlist) {
    const value = process.env[key];
    if (value !== undefined) {
      environment[key] = value;
    }
  }

  return {
    ...environment,
    AUTH_TOKEN: sensitiveFixtures.authToken,
    CONTACT_EMAIL: sensitiveFixtures.contactEmail,
    DATABASE_URL: `postgresql://autobracket:${sensitiveFixtures.databasePassword}@localhost:5432/autobracket`,
    LOG_LEVEL: "info",
    NODE_ENV: "production",
    REALTIME_PORT: "3001",
    REDIS_URL: `redis://:${sensitiveFixtures.redisPassword}@127.0.0.1:6379`,
    RELEASE_VERSION: sensitiveFixtures.unsafeRelease,
    STORAGE_ACCESS_KEY_ID: sensitiveFixtures.storageAccessKey,
    WORKER_HEALTH_PORT: "3002",
  };
}

function verifyServiceStartup({ entrypoint, name }) {
  const result = spawnSync(process.execPath, [entrypoint], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: createIsolatedEnvironment(),
    maxBuffer: 64 * 1024,
    timeout: 10_000,
    windowsHide: true,
  });

  if (result.error) {
    fail(name, result.error.name);
  }
  if (result.status !== 1 || result.signal !== null) {
    fail(name, `unexpected exit status ${String(result.status)}`);
  }

  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const combinedOutput = `${stdout}\n${stderr}`;
  if (sensitiveFixtureValues.some((fixture) => combinedOutput.includes(fixture))) {
    fail(name, "a sensitive fixture was emitted");
  }
  if (stdout.trim() !== "") {
    fail(name, "stdout was not empty");
  }

  const lines = stderr.trim().split(/\r?\n/u);
  if (lines.length !== 1 || !lines[0]) {
    fail(name, "stderr was not exactly one JSON line");
  }

  let record;
  try {
    record = JSON.parse(lines[0]);
  } catch {
    fail(name, "stderr was not valid JSON");
  }

  if (
    JSON.stringify(Object.keys(record).sort()) !== JSON.stringify(expectedRecordKeys) ||
    record?.error?.name !== "ZodError" ||
    Object.keys(record.error).length !== 1 ||
    !Array.isArray(record.validationIssues) ||
    record.validationIssues.length !== 1 ||
    JSON.stringify(Object.keys(record.validationIssues[0]).sort()) !==
      JSON.stringify(["code", "path"]) ||
    record.validationIssues[0].code !== "invalid_format" ||
    JSON.stringify(record.validationIssues[0].path) !== JSON.stringify(["RELEASE_VERSION"]) ||
    record.event !== "service.startup.failed" ||
    record.level !== "error" ||
    record.release !== "development" ||
    record.service !== name ||
    typeof record.timestamp !== "string" ||
    !record.timestamp.endsWith("Z") ||
    !Number.isFinite(Date.parse(record.timestamp))
  ) {
    fail(name, "structured error contract did not match");
  }
}

function verifyRuntimeStartup() {
  for (const service of services) {
    verifyServiceStartup(service);
  }

  console.log(
    "RUNTIME_STARTUP_VERIFY=PASS (web/worker/realtime exit 1 with one sanitized diagnostic JSON line)",
  );
}

if (import.meta.main) {
  verifyRuntimeStartup();
}
