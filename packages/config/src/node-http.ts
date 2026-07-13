import type { IncomingMessage, ServerResponse } from "node:http";

import {
  CORRELATION_ID_HEADER,
  resolveCorrelationId,
  type StructuredLogger,
} from "./observability.js";

export interface ObservedNodeRequest {
  readonly correlationId: string;
  readonly method: string;
  readonly path: string;
  readonly requestTargetValid: boolean;
  readonly startedAt: number;
}

export function observeNodeRequest(request: IncomingMessage): ObservedNodeRequest {
  let path = "/";
  let requestTargetValid = true;
  try {
    path = new URL(request.url ?? "/", "http://localhost").pathname;
  } catch {
    path = "[INVALID_REQUEST_TARGET]";
    requestTargetValid = false;
  }

  return {
    correlationId: resolveCorrelationId(request.headers[CORRELATION_ID_HEADER]),
    method: request.method ?? "UNKNOWN",
    path,
    requestTargetValid,
    startedAt: performance.now(),
  };
}

export function sendNodeJsonResponse(
  response: ServerResponse,
  request: ObservedNodeRequest,
  statusCode: number,
  payload: unknown,
  logger: StructuredLogger,
): void {
  const context = {
    correlationId: request.correlationId,
    durationMs: Math.max(0, Math.round(performance.now() - request.startedAt)),
    method: request.method,
    path: request.path,
    statusCode,
  };

  const isHealthProbe = request.path === "/health" || request.path === "/ready";
  if (statusCode >= 500 && isHealthProbe) {
    logger.warn("http.request", context);
  } else if (statusCode >= 500) {
    logger.error("http.request", context);
  } else if (statusCode >= 400) {
    logger.warn("http.request", context);
  } else if (isHealthProbe) {
    logger.debug("http.request", context);
  } else {
    logger.info("http.request", context);
  }

  response.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    [CORRELATION_ID_HEADER]: request.correlationId,
  });
  response.end(JSON.stringify(payload));
}
