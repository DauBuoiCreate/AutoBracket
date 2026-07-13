export const CORRELATION_ID_HEADER = "x-correlation-id" as const;

export type LogLevel = "debug" | "info" | "warn" | "error";
export type ServiceName = "web" | "realtime" | "worker";
export type LogContext = Readonly<Record<string, unknown>>;

export interface StructuredLogger {
  debug(event: string, context?: LogContext): void;
  info(event: string, context?: LogContext): void;
  warn(event: string, context?: LogContext): void;
  error(event: string, context?: LogContext): void;
}

export interface StructuredLoggerOptions {
  readonly clock?: () => Date;
  readonly minimumLevel?: LogLevel;
  readonly release?: string;
  readonly service: ServiceName;
  readonly sink?: (line: string, level: LogLevel) => void;
}

const levels: Readonly<Record<LogLevel, number>> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const sensitiveKeyFragments = [
  "authorization",
  "cookie",
  "password",
  "passphrase",
  "secret",
  "token",
  "apikey",
  "accesskey",
  "privatekey",
  "signingkey",
  "encryptionkey",
  "credential",
  "databaseurl",
  "redisurl",
  "dsn",
  "email",
  "phone",
  "contact",
  "address",
  "dateofbirth",
  "birthdate",
  "displayname",
  "fullname",
  "firstname",
  "lastname",
  "legalname",
  "nickname",
  "username",
  "privatenote",
  "note",
  "ipprefix",
  "ipaddress",
  "session",
  "sessionid",
  "useragent",
  "billing",
  "payment",
  "cardnumber",
  "securitycode",
  "bankaccount",
  "accountnumber",
  "passport",
  "nationalid",
  "taxid",
] as const;

const sensitiveExactKeys = new Set(["cvv", "dob", "ip", "pin"]);

const MAX_DEPTH = 6;
const MAX_ITEMS = 100;
const MAX_STRING_LENGTH = 8_192;
const REDACTED = "[REDACTED]";
const TRUNCATED = "[TRUNCATED]";
const UNSERIALIZABLE = "[UNSERIALIZABLE]";

function isSensitiveKey(key: string): boolean {
  const normalized = key.replaceAll(/[^a-z0-9]/giu, "").toLowerCase();
  return (
    sensitiveExactKeys.has(normalized) ||
    sensitiveKeyFragments.some((fragment) => normalized.includes(fragment))
  );
}

function redactString(value: string): string {
  let redacted = value
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/giu, `Bearer ${REDACTED}`)
    .replace(/([a-z][a-z0-9+.-]*:\/\/)([^@\s/]+)@/giu, `$1${REDACTED}@`)
    .replace(
      /([?&](?:password|passphrase|secret|token|api[_-]?key|access[_-]?key|credential)=)[^&\s]+/giu,
      `$1${REDACTED}`,
    )
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu, "[REDACTED_EMAIL]")
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/gu, "[REDACTED_IP]");

  for (const [key, secret] of Object.entries(process.env)) {
    if (secret && secret.length >= 6 && isSensitiveKey(key)) {
      redacted = redacted.replaceAll(secret, REDACTED);
    }
  }

  return redacted.length <= MAX_STRING_LENGTH
    ? redacted
    : `${redacted.slice(0, MAX_STRING_LENGTH)}${TRUNCATED}`;
}

function sanitizeLogValue(
  value: unknown,
  key: string,
  seen: WeakSet<object>,
  depth: number,
): unknown {
  try {
    if (isSensitiveKey(key)) {
      return REDACTED;
    }

    if (value === null || typeof value === "boolean") {
      return value;
    }

    if (typeof value === "string") {
      return redactString(value);
    }

    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }

    if (typeof value === "bigint") {
      return value.toString();
    }

    if (typeof value === "undefined" || typeof value === "function" || typeof value === "symbol") {
      return undefined;
    }

    if (value instanceof Date) {
      return Number.isNaN(value.valueOf()) ? null : value.toISOString();
    }

    if (value instanceof Error) {
      return { name: value.name };
    }

    if (depth >= MAX_DEPTH) {
      return TRUNCATED;
    }

    if (seen.has(value)) {
      return "[CIRCULAR]";
    }
    seen.add(value);

    try {
      if (Array.isArray(value)) {
        return value
          .slice(0, MAX_ITEMS)
          .map((item) => sanitizeLogValue(item, key, seen, depth + 1));
      }

      const sanitized = Object.create(null) as Record<string, unknown>;
      for (const entryKey of Object.keys(value).slice(0, MAX_ITEMS)) {
        let entryValue: unknown;
        try {
          entryValue = (value as Record<string, unknown>)[entryKey];
        } catch {
          sanitized[entryKey] = UNSERIALIZABLE;
          continue;
        }

        const entry = sanitizeLogValue(entryValue, entryKey, seen, depth + 1);
        if (entry !== undefined) {
          sanitized[entryKey] = entry;
        }
      }
      return sanitized;
    } finally {
      seen.delete(value);
    }
  } catch {
    return UNSERIALIZABLE;
  }
}

function defaultSink(line: string, level: LogLevel): void {
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}

function normalizeMinimumLevel(level: string | undefined): LogLevel {
  return level === "debug" || level === "warn" || level === "error" ? level : "info";
}

function normalizeRelease(release: string | undefined): string {
  return release && /^[A-Za-z0-9._-]{1,128}$/u.test(release) ? release : "development";
}

export function resolveCorrelationId(
  candidate: string | readonly string[] | null | undefined,
  createId: () => string = () => globalThis.crypto.randomUUID(),
): string {
  const value = Array.isArray(candidate) ? candidate[0] : candidate;
  return value && /^[A-Za-z0-9._:-]{8,128}$/u.test(value) ? value : createId();
}

export function createStructuredLogger(options: StructuredLoggerOptions): StructuredLogger {
  const clock = options.clock ?? (() => new Date());
  const minimumLevel = options.minimumLevel ?? normalizeMinimumLevel(process.env.LOG_LEVEL);
  const release = normalizeRelease(options.release ?? process.env.RELEASE_VERSION);
  const sink = options.sink ?? defaultSink;

  function write(level: LogLevel, event: string, context: LogContext = {}): void {
    if (levels[level] < levels[minimumLevel]) {
      return;
    }

    const sanitized = sanitizeLogValue(context, "context", new WeakSet(), 0);
    const contextFields =
      sanitized && typeof sanitized === "object" && !Array.isArray(sanitized) ? sanitized : {};

    sink(
      JSON.stringify({
        ...contextFields,
        timestamp: clock().toISOString(),
        level,
        service: options.service,
        release,
        event: redactString(event),
      }),
      level,
    );
  }

  return {
    debug: (event, context) => write("debug", event, context),
    info: (event, context) => write("info", event, context),
    warn: (event, context) => write("warn", event, context),
    error: (event, context) => write("error", event, context),
  };
}
