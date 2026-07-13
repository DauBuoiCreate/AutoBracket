import {
  createStructuredLogger,
  type LogContext,
  type ServiceName,
  type StructuredLogger,
  type StructuredLoggerOptions,
} from "./observability.js";

const startupValidationIssueCodes = new Set([
  "custom",
  "invalid_element",
  "invalid_format",
  "invalid_key",
  "invalid_type",
  "invalid_union",
  "invalid_value",
  "not_multiple_of",
  "too_big",
  "too_small",
  "unrecognized_keys",
]);
const MAX_STARTUP_VALIDATION_ISSUES = 10;
const MAX_STARTUP_VALIDATION_ISSUES_INSPECTED = 100;
const startupErrorNames = new Set([
  "Error",
  "EvalError",
  "RangeError",
  "ReferenceError",
  "StartupError",
  "SyntaxError",
  "TypeError",
  "URIError",
  "ZodError",
]);
const safeEnvironmentFieldPattern = /^[A-Z][A-Z0-9_]{0,127}$/u;

export interface ServiceRuntime<TEnvironment> {
  readonly environment: TEnvironment;
  readonly logger: StructuredLogger;
}

export interface ServiceRuntimeOptions<TEnvironment> {
  readonly createLoggerOptions: (
    environment: TEnvironment,
  ) => Omit<StructuredLoggerOptions, "service">;
  readonly readEnvironment: () => TEnvironment;
  readonly service: ServiceName;
  readonly startupDiagnosticFieldAllowlist: readonly string[];
}

function readProperty(value: unknown, key: string): unknown {
  if ((typeof value !== "object" || value === null) && typeof value !== "function") {
    return undefined;
  }

  try {
    return Reflect.get(value, key);
  } catch {
    return undefined;
  }
}

function readStartupValidationIssues(
  error: unknown,
  fieldAllowlist: readonly string[],
): readonly LogContext[] {
  const diagnostics: LogContext[] = [];
  try {
    if (readProperty(error, "name") !== "ZodError") {
      return diagnostics;
    }

    const rawIssues = readProperty(error, "issues");
    if (!Array.isArray(rawIssues)) {
      return diagnostics;
    }

    const allowedFields = new Set(
      fieldAllowlist.filter((field) => safeEnvironmentFieldPattern.test(field)),
    );
    const seen = new Set<string>();

    const issueCount = Math.min(rawIssues.length, MAX_STARTUP_VALIDATION_ISSUES_INSPECTED);
    for (let index = 0; index < issueCount; index += 1) {
      if (diagnostics.length >= MAX_STARTUP_VALIDATION_ISSUES) {
        break;
      }

      try {
        const rawIssue = rawIssues[index];
        const code = readProperty(rawIssue, "code");
        const path = readProperty(rawIssue, "path");
        if (
          typeof code !== "string" ||
          !startupValidationIssueCodes.has(code) ||
          !Array.isArray(path) ||
          path.length !== 1
        ) {
          continue;
        }

        const field: unknown = path[0];
        if (typeof field !== "string" || !allowedFields.has(field)) {
          continue;
        }

        const diagnosticKey = `${code}\u0000${field}`;
        if (seen.has(diagnosticKey)) {
          continue;
        }
        seen.add(diagnosticKey);
        diagnostics.push({ code, path: [field] });
      } catch {
        continue;
      }
    }
  } catch {
    return diagnostics;
  }

  return diagnostics;
}

export function createStartupErrorLogContext(
  error: unknown,
  fieldAllowlist: readonly string[],
): LogContext {
  const candidateName = readProperty(error, "name");
  const errorName =
    typeof candidateName === "string" && startupErrorNames.has(candidateName)
      ? candidateName
      : "StartupError";
  const validationIssues = readStartupValidationIssues(error, fieldAllowlist);

  return validationIssues.length > 0
    ? { error: { name: errorName }, validationIssues }
    : { error: { name: errorName } };
}

export function initializeServiceRuntime<TEnvironment>(
  options: ServiceRuntimeOptions<TEnvironment>,
): ServiceRuntime<TEnvironment> | null {
  const startupLogger = createStructuredLogger({ service: options.service });

  try {
    const environment = options.readEnvironment();
    return {
      environment,
      logger: createStructuredLogger({
        ...options.createLoggerOptions(environment),
        service: options.service,
      }),
    };
  } catch (error: unknown) {
    startupLogger.error(
      "service.startup.failed",
      createStartupErrorLogContext(error, options.startupDiagnosticFieldAllowlist),
    );
    return null;
  }
}
