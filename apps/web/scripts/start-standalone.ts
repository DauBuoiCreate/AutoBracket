import { createStartupErrorLogContext, createStructuredLogger } from "@autobracket/config";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

import { loadRootEnvironmentFile } from "../../../scripts/load-root-env.mjs";

import { readWebEnvironment, WEB_STARTUP_DIAGNOSTIC_FIELDS } from "../src/config/env.js";

async function startStandaloneServer(): Promise<void> {
  loadRootEnvironmentFile();
  const environment = readWebEnvironment();
  process.env.PORT = String(environment.PORT);

  const serverPath = resolve(
    import.meta.dirname,
    "..",
    ".next",
    "standalone",
    "apps",
    "web",
    "server.js",
  );
  await import(pathToFileURL(serverPath).href);
}

void startStandaloneServer().catch((error: unknown) => {
  createStructuredLogger({ service: "web" }).error(
    "service.startup.failed",
    createStartupErrorLogContext(error, WEB_STARTUP_DIAGNOSTIC_FIELDS),
  );
  process.exitCode = 1;
});
