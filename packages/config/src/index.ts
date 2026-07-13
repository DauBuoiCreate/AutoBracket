export const DEFAULT_TIME_ZONE = "Asia/Ho_Chi_Minh" as const;
export const PLATFORM_NAME = "AutoBracket" as const;
export {
  CORRELATION_ID_HEADER,
  createStructuredLogger,
  resolveCorrelationId,
} from "./observability.js";
export type {
  LogContext,
  LogLevel,
  ServiceName,
  StructuredLogger,
  StructuredLoggerOptions,
} from "./observability.js";
export { observeNodeRequest, sendNodeJsonResponse } from "./node-http.js";
export type { ObservedNodeRequest } from "./node-http.js";
export { createStartupErrorLogContext, initializeServiceRuntime } from "./service-runtime.js";
export type { ServiceRuntime, ServiceRuntimeOptions } from "./service-runtime.js";
