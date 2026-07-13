import { afterEach, describe, expect, it, vi } from "vitest";

import { initializeServiceRuntime } from "./service-runtime.js";

const originalReleaseVersion = process.env.RELEASE_VERSION;

afterEach(() => {
  vi.restoreAllMocks();
  if (originalReleaseVersion === undefined) {
    delete process.env.RELEASE_VERSION;
  } else {
    process.env.RELEASE_VERSION = originalReleaseVersion;
  }
});

describe("initializeServiceRuntime", () => {
  it("returns the validated environment and configured logger", () => {
    const lines: string[] = [];
    const environment = { LOG_LEVEL: "info" as const, RELEASE_VERSION: "p0-test" };
    const runtime = initializeServiceRuntime({
      createLoggerOptions: (value) => ({
        clock: () => new Date("2026-07-13T06:00:00.000Z"),
        minimumLevel: value.LOG_LEVEL,
        release: value.RELEASE_VERSION,
        sink: (line) => lines.push(line),
      }),
      readEnvironment: () => environment,
      service: "worker",
      startupDiagnosticFieldAllowlist: [],
    });

    runtime?.logger.info("service.started");

    expect(runtime?.environment).toBe(environment);
    expect(JSON.parse(lines[0] ?? "")).toMatchObject({
      event: "service.started",
      level: "info",
      release: "p0-test",
      service: "worker",
    });
  });

  it("logs a sanitized JSON event when environment validation fails", () => {
    const unsafeRelease = "bad release startup-secret-fixture";
    const startupError = "database-password-fixture";
    process.env.RELEASE_VERSION = unsafeRelease;
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const runtime = initializeServiceRuntime({
      createLoggerOptions: () => ({}),
      readEnvironment: () => {
        throw new Error(startupError);
      },
      service: "realtime",
      startupDiagnosticFieldAllowlist: [],
    });

    const output = String(errorSpy.mock.calls[0]?.[0] ?? "");
    expect(runtime).toBeNull();
    expect(JSON.parse(output)).toMatchObject({
      error: { name: "Error" },
      event: "service.startup.failed",
      level: "error",
      release: "development",
      service: "realtime",
    });
    expect(output).not.toContain(unsafeRelease);
    expect(output).not.toContain(startupError);
  });

  it("logs only allowlisted Zod issue codes and environment paths", () => {
    const sensitiveMessage = "database-password-fixture";
    const startupError = Object.assign(new Error(sensitiveMessage), {
      issues: [
        {
          code: "invalid_format",
          input: sensitiveMessage,
          message: sensitiveMessage,
          path: ["RELEASE_VERSION"],
        },
        {
          code: "custom",
          message: sensitiveMessage,
          path: ["DATABASE_URL"],
        },
        {
          code: "custom",
          message: sensitiveMessage,
          path: ["UNLISTED_SECRET_FIELD"],
        },
        {
          code: `invalid_${sensitiveMessage}`,
          message: sensitiveMessage,
          path: ["RELEASE_VERSION"],
        },
        Object.defineProperty({}, "code", {
          enumerable: true,
          get: () => {
            throw new Error(sensitiveMessage);
          },
        }),
      ],
      name: "ZodError",
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const runtime = initializeServiceRuntime({
      createLoggerOptions: () => ({}),
      readEnvironment: () => {
        throw startupError;
      },
      service: "worker",
      startupDiagnosticFieldAllowlist: ["DATABASE_URL", "RELEASE_VERSION"],
    });

    const output = String(errorSpy.mock.calls[0]?.[0] ?? "");
    const record = JSON.parse(output) as Record<string, unknown>;
    expect(runtime).toBeNull();
    expect(record).toMatchObject({
      error: { name: "ZodError" },
      validationIssues: [
        { code: "invalid_format", path: ["RELEASE_VERSION"] },
        { code: "custom", path: ["DATABASE_URL"] },
      ],
    });
    expect(output).not.toContain(sensitiveMessage);
    expect(output).not.toContain("UNLISTED_SECRET_FIELD");
    expect(output).not.toContain("message");
    expect(output).not.toContain("input");
  });

  it("fails closed for unsafe error names and hostile Zod issue collections", () => {
    const sensitiveValue = "databasePasswordFixture";
    const hostileIssues = new Proxy([], {
      get: (target, key, receiver) => {
        if (key === Symbol.iterator) {
          throw new Error(sensitiveValue);
        }
        return Reflect.get(target, key, receiver);
      },
    });
    const unsafeNamedError = Object.assign(new Error(sensitiveValue), {
      name: sensitiveValue,
    });
    const hostileZodError = Object.assign(new Error(sensitiveValue), {
      issues: hostileIssues,
      name: "ZodError",
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const initializeWithError = (error: Error) =>
      initializeServiceRuntime({
        createLoggerOptions: () => ({}),
        readEnvironment: () => {
          throw error;
        },
        service: "worker" as const,
        startupDiagnosticFieldAllowlist: ["DATABASE_URL"],
      });

    expect(() => initializeWithError(unsafeNamedError)).not.toThrow();
    expect(() => initializeWithError(hostileZodError)).not.toThrow();

    const unsafeNameOutput = String(errorSpy.mock.calls[0]?.[0] ?? "");
    const hostileIssuesOutput = String(errorSpy.mock.calls[1]?.[0] ?? "");
    expect(JSON.parse(unsafeNameOutput)).toMatchObject({ error: { name: "StartupError" } });
    expect(JSON.parse(hostileIssuesOutput)).toMatchObject({ error: { name: "ZodError" } });
    expect(`${unsafeNameOutput}\n${hostileIssuesOutput}`).not.toContain(sensitiveValue);
    expect(hostileIssuesOutput).not.toContain("validationIssues");
  });

  it("bounds the number of Zod issues inspected during startup failure", () => {
    const ignoredIssues = Array.from({ length: 100 }, () => ({
      code: "unsafe_code",
      path: ["RELEASE_VERSION"],
    }));
    const startupError = Object.assign(new Error("bounded fixture"), {
      issues: [...ignoredIssues, { code: "invalid_format", path: ["RELEASE_VERSION"] }],
      name: "ZodError",
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    initializeServiceRuntime({
      createLoggerOptions: () => ({}),
      readEnvironment: () => {
        throw startupError;
      },
      service: "worker",
      startupDiagnosticFieldAllowlist: ["RELEASE_VERSION"],
    });

    const output = String(errorSpy.mock.calls[0]?.[0] ?? "");
    expect(JSON.parse(output)).toMatchObject({ error: { name: "ZodError" } });
    expect(output).not.toContain("validationIssues");
  });
});
