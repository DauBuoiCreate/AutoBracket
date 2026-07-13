import {
  initializeServiceRuntime,
  observeNodeRequest,
  sendNodeJsonResponse,
  type ObservedNodeRequest,
} from "@autobracket/config";
import {
  createReadinessPayload,
  type HealthPayload,
  type ReadinessPayload,
} from "@autobracket/contracts";
import { checkDatabaseReadiness } from "@autobracket/db";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { readWorkerEnvironment, WORKER_STARTUP_DIAGNOSTIC_FIELDS } from "./env.js";
import { checkRedisReadiness } from "./redis-readiness.js";

const runtime = initializeServiceRuntime({
  createLoggerOptions: (environment) => ({
    minimumLevel: environment.LOG_LEVEL,
    release: environment.RELEASE_VERSION,
  }),
  readEnvironment: readWorkerEnvironment,
  service: "worker",
  startupDiagnosticFieldAllowlist: WORKER_STARTUP_DIAGNOSTIC_FIELDS,
});

if (runtime) {
  startWorker(runtime);
} else {
  process.exitCode = 1;
}

function startWorker({ environment, logger }: NonNullable<typeof runtime>): void {
  const server = createServer((request, response) => {
    const observedRequest = observeNodeRequest(request);
    void handleRequest(request, response, observedRequest).catch((error: unknown) => {
      logger.error("http.request.failed", {
        correlationId: observedRequest.correlationId,
        error,
        method: observedRequest.method,
        path: observedRequest.path,
      });
      if (!response.headersSent) {
        sendNodeJsonResponse(
          response,
          observedRequest,
          500,
          {
            error: {
              code: "INTERNAL_ERROR",
              correlationId: observedRequest.correlationId,
            },
          },
          logger,
        );
        return;
      }

      logger.error("http.request.aborted", {
        correlationId: observedRequest.correlationId,
        method: observedRequest.method,
        path: observedRequest.path,
      });
      response.end();
    });
  });

  async function handleRequest(
    request: IncomingMessage,
    response: ServerResponse,
    observedRequest: ObservedNodeRequest,
  ): Promise<void> {
    if (!observedRequest.requestTargetValid) {
      sendNodeJsonResponse(
        response,
        observedRequest,
        400,
        {
          error: {
            code: "INVALID_REQUEST_TARGET",
            correlationId: observedRequest.correlationId,
          },
        },
        logger,
      );
      return;
    }

    if (request.method === "GET" && observedRequest.path === "/health") {
      const payload: HealthPayload = {
        service: "worker",
        status: "ok",
        timestamp: new Date().toISOString(),
      };
      sendNodeJsonResponse(response, observedRequest, 200, payload, logger);
      return;
    }

    if (request.method === "GET" && observedRequest.path === "/ready") {
      const dependencies = await Promise.all([
        checkDatabaseReadiness(environment.DATABASE_URL),
        checkRedisReadiness(environment.REDIS_URL),
      ]);
      const payload: ReadinessPayload = createReadinessPayload("worker", dependencies);
      sendNodeJsonResponse(
        response,
        observedRequest,
        payload.status === "ready" ? 200 : 503,
        payload,
        logger,
      );
      return;
    }

    sendNodeJsonResponse(
      response,
      observedRequest,
      404,
      { error: { code: "NOT_FOUND", correlationId: observedRequest.correlationId } },
      logger,
    );
  }

  server.listen(environment.WORKER_HEALTH_PORT, "0.0.0.0", () => {
    logger.info("service.started", { port: environment.WORKER_HEALTH_PORT });
  });

  function shutdown(signal: NodeJS.Signals) {
    logger.info("service.shutdown.started", { signal });
    server.close((error) => {
      if (error) {
        logger.error("service.shutdown.failed", { error });
        process.exitCode = 1;
        return;
      }
      logger.info("service.shutdown.completed");
    });
  }

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}
