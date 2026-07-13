import {
  CORRELATION_ID_HEADER,
  createStructuredLogger,
  resolveCorrelationId,
} from "@autobracket/config";
import { NextResponse } from "next/server";

const logger = createStructuredLogger({ service: "web" });

export interface ObservedRequest {
  readonly correlationId: string;
  readonly method: string;
  readonly path: string;
  readonly startedAt: number;
}

export function observeRequest(request: Request): ObservedRequest {
  return {
    correlationId: resolveCorrelationId(request.headers.get(CORRELATION_ID_HEADER)),
    method: request.method,
    path: new URL(request.url).pathname,
    startedAt: performance.now(),
  };
}

export function observedJsonResponse(
  request: ObservedRequest,
  payload: unknown,
  statusCode: number,
): NextResponse {
  const context = {
    correlationId: request.correlationId,
    durationMs: Math.max(0, Math.round(performance.now() - request.startedAt)),
    method: request.method,
    path: request.path,
    statusCode,
  };
  const isHealthProbe = request.path === "/api/health" || request.path === "/api/ready";

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

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store",
      [CORRELATION_ID_HEADER]: request.correlationId,
    },
    status: statusCode,
  });
}
