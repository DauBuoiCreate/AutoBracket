import { createStartupErrorLogContext, createStructuredLogger } from "@autobracket/config";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { readWebEnvironment, WEB_STARTUP_DIAGNOSTIC_FIELDS } from "../src/config/env.js";

const logger = createStructuredLogger({ service: "web" });

async function startContainerServer(): Promise<void> {
  const environment = readWebEnvironment();
  process.env.PORT = String(environment.PORT);

  const serverPath = resolve(import.meta.dirname, "apps", "web", "server.js");
  await import(pathToFileURL(serverPath).href);
}

void startContainerServer().catch((error: unknown) => {
  logger.error(
    "service.startup.failed",
    createStartupErrorLogContext(error, WEB_STARTUP_DIAGNOSTIC_FIELDS),
  );
  process.exitCode = 1;
});
