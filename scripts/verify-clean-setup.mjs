import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { cp, copyFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, resolve, sep } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { pnpmInvocation } from "./pnpm-invocation.mjs";
import { shouldCopyPath } from "./verify-clean-copy.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temporaryRoot = resolve(tmpdir());

function runPnpm(cwd, args, environment) {
  const invocation = pnpmInvocation(args);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd,
    env: environment,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`CLEAN_SETUP_COMMAND_FAILED_${args[0]?.toUpperCase() ?? "UNKNOWN"}`);
  }
}

async function findFreePort() {
  const server = createServer();
  await new Promise((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolvePromise);
  });
  const address = server.address();
  await new Promise((resolvePromise, reject) => {
    server.close((error) => (error ? reject(error) : resolvePromise()));
  });
  if (!address || typeof address === "string") {
    throw new Error("CLEAN_SETUP_PORT_ALLOCATION_FAILED");
  }
  return address.port;
}

function assertIsolatedComposeProject(fixtureRoot, projectName, environment) {
  const result = spawnSync(
    "docker",
    [
      "compose",
      "--project-directory",
      fixtureRoot,
      "-f",
      resolve(fixtureRoot, "infra", "docker", "compose.dev.yml"),
      "config",
      "--format",
      "json",
    ],
    { encoding: "utf8", env: environment },
  );
  if (result.error || result.status !== 0) {
    throw result.error ?? new Error("CLEAN_SETUP_COMPOSE_CONFIG_FAILED");
  }
  const rendered = JSON.parse(result.stdout);
  if (rendered.name !== projectName) {
    throw new Error("CLEAN_SETUP_PROJECT_ISOLATION_FAILED");
  }
}

function stopProcessTree(child) {
  if (!child.pid || child.exitCode !== null) {
    return;
  }
  if (process.platform === "win32") {
    spawnSync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }
}

function cleanDockerProject(fixtureRoot, projectName, environment) {
  if (!projectName.startsWith("autobracket-clean-")) {
    throw new Error("CLEAN_SETUP_REFUSED_UNSAFE_PROJECT_CLEANUP");
  }
  const result = spawnSync(
    "docker",
    [
      "compose",
      "--project-name",
      projectName,
      "--project-directory",
      fixtureRoot,
      "-f",
      resolve(fixtureRoot, "infra", "docker", "compose.dev.yml"),
      "down",
      "--volumes",
      "--remove-orphans",
    ],
    { env: environment, stdio: "inherit" },
  );
  if (result.error || result.status !== 0) {
    throw result.error ?? new Error("CLEAN_SETUP_DOCKER_CLEANUP_FAILED");
  }
}

async function removeFixture(fixtureRoot) {
  const resolvedFixture = resolve(fixtureRoot);
  if (
    !resolvedFixture.startsWith(`${temporaryRoot}${sep}`) ||
    !basename(resolvedFixture).startsWith("autobracket-clean-setup-")
  ) {
    throw new Error("CLEAN_SETUP_REFUSED_UNSAFE_FIXTURE_CLEANUP");
  }
  await rm(resolvedFixture, { force: true, recursive: true });
}

async function waitForEndpoints(child, endpoints) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`CLEAN_SETUP_DEV_EXITED_${child.exitCode}`);
    }

    try {
      await Promise.all(
        endpoints.map(async ({ service, status, url }) => {
          const response = await fetch(url, {
            headers: { "x-correlation-id": "clean-setup-20260713" },
            signal: AbortSignal.timeout(2_000),
          });
          const payload = await response.json();
          if (
            !response.ok ||
            response.headers.get("x-correlation-id") !== "clean-setup-20260713" ||
            payload.service !== service ||
            payload.status !== status
          ) {
            throw new Error("CLEAN_SETUP_ENDPOINT_NOT_READY");
          }
        }),
      );
      return;
    } catch {
      await delay(500);
    }
  }
  throw new Error("CLEAN_SETUP_ENDPOINT_TIMEOUT");
}

export async function verifyCleanSetup() {
  const fixtureRoot = await mkdtemp(resolve(temporaryRoot, "autobracket-clean-setup-"));
  const projectName = `autobracket-clean-${process.pid}`;
  let developmentProcess;
  let environment;

  try {
    await cp(repositoryRoot, fixtureRoot, {
      filter: (source) => shouldCopyPath(source, repositoryRoot),
      recursive: true,
    });
    await copyFile(resolve(fixtureRoot, ".env.example"), resolve(fixtureRoot, ".env"));

    const [postgresPort, redisPort, webPort, realtimePort, workerPort] = await Promise.all([
      findFreePort(),
      findFreePort(),
      findFreePort(),
      findFreePort(),
      findFreePort(),
    ]);
    environment = {
      ...process.env,
      APP_URL: `http://localhost:${webPort}`,
      CI: "true",
      COMPOSE_PROJECT_NAME: projectName,
      DATABASE_URL: `postgresql://autobracket:autobracket@localhost:${postgresPort}/autobracket`,
      NEXT_TELEMETRY_DISABLED: "1",
      PORT: String(webPort),
      POSTGRES_DB: "autobracket",
      POSTGRES_PASSWORD: "autobracket",
      POSTGRES_PORT: String(postgresPort),
      POSTGRES_USER: "autobracket",
      PUBLIC_URL: `http://localhost:${webPort}`,
      REALTIME_PORT: String(realtimePort),
      REDIS_PORT: String(redisPort),
      REDIS_URL: `redis://localhost:${redisPort}`,
      WORKER_HEALTH_PORT: String(workerPort),
    };

    assertIsolatedComposeProject(fixtureRoot, projectName, environment);
    runPnpm(fixtureRoot, ["install", "--frozen-lockfile"], environment);
    runPnpm(fixtureRoot, ["infra:up"], environment);
    runPnpm(fixtureRoot, ["db:generate"], environment);
    runPnpm(fixtureRoot, ["db:migrate"], environment);
    runPnpm(fixtureRoot, ["db:seed"], environment);
    runPnpm(fixtureRoot, ["db:seed"], environment);
    runPnpm(fixtureRoot, ["infra:ps"], environment);

    const invocation = pnpmInvocation(["dev"]);
    developmentProcess = spawn(invocation.command, invocation.args, {
      cwd: fixtureRoot,
      detached: process.platform !== "win32",
      env: environment,
      stdio: "ignore",
      windowsHide: true,
    });

    await waitForEndpoints(developmentProcess, [
      { service: "web", status: "ok", url: `http://127.0.0.1:${webPort}/api/health` },
      {
        service: "web",
        status: "ready",
        url: `http://127.0.0.1:${webPort}/api/ready`,
      },
      {
        service: "realtime",
        status: "ok",
        url: `http://127.0.0.1:${realtimePort}/health`,
      },
      {
        service: "realtime",
        status: "ready",
        url: `http://127.0.0.1:${realtimePort}/ready`,
      },
      {
        service: "worker",
        status: "ok",
        url: `http://127.0.0.1:${workerPort}/health`,
      },
      {
        service: "worker",
        status: "ready",
        url: `http://127.0.0.1:${workerPort}/ready`,
      },
    ]);

    console.log("CLEAN_SETUP_VERIFY=PASS (isolated infra, seed x2, 6 correlated endpoints)");
  } finally {
    if (developmentProcess) {
      stopProcessTree(developmentProcess);
    }
    if (environment) {
      cleanDockerProject(fixtureRoot, projectName, environment);
    }
    await removeFixture(fixtureRoot);
  }
}

if (import.meta.main) {
  await verifyCleanSetup();
}
