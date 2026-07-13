import { describe, expect, it } from "vitest";

import { createStructuredLogger, resolveCorrelationId } from "./observability.js";

describe("resolveCorrelationId", () => {
  it("preserves a valid incoming identifier", () => {
    expect(resolveCorrelationId("request-20260713", () => "generated-id")).toBe("request-20260713");
  });

  it.each([undefined, null, "short", "contains a space", ["bad", "second-valid-id"]])(
    "generates an identifier for invalid input %j",
    (candidate) => {
      expect(resolveCorrelationId(candidate, () => "generated-id")).toBe("generated-id");
    },
  );
});

describe("createStructuredLogger", () => {
  it("writes deterministic JSON fields and respects the minimum level", () => {
    const lines: string[] = [];
    const logger = createStructuredLogger({
      clock: () => new Date("2026-07-13T06:00:00.000Z"),
      minimumLevel: "info",
      release: "p0-test",
      service: "worker",
      sink: (line) => lines.push(line),
    });

    logger.debug("ignored.event");
    logger.info("health.request", { correlationId: "request-20260713", statusCode: 200 });

    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0] ?? "")).toEqual({
      correlationId: "request-20260713",
      event: "health.request",
      level: "info",
      release: "p0-test",
      service: "worker",
      statusCode: 200,
      timestamp: "2026-07-13T06:00:00.000Z",
    });
  });

  it("redacts secret, credential, authorization and PII fixtures recursively", () => {
    const lines: string[] = [];
    const secret = "p0-secret-fixture-should-never-appear";
    const storageAccessKey = "storage-access-key-should-never-appear";
    const previousDatabaseUrl = process.env.DATABASE_URL;
    const previousStorageAccessKey = process.env.STORAGE_ACCESS_KEY_ID;
    process.env.DATABASE_URL = `postgresql://user:${secret}@database:5432/autobracket`;
    process.env.STORAGE_ACCESS_KEY_ID = storageAccessKey;

    try {
      const logger = createStructuredLogger({
        minimumLevel: "debug",
        service: "web",
        sink: (line) => lines.push(line),
      });

      logger.error(`fixture.failure ${storageAccessKey}`, {
        apiKey: "api-key-should-never-appear",
        authorization: `Bearer ${secret}`,
        billingPayload: { cardNumber: "4111111111111111" },
        credential: "credential-should-never-appear",
        DATABASE_URL: process.env.DATABASE_URL,
        dateOfBirth: "2000-01-02",
        displayName: "Private Organizer Name",
        error: new Error(secret),
        nested: {
          contactEmail: "organizer@example.invalid",
          note: `Connection failed for ${process.env.DATABASE_URL}`,
        },
        privateKey: "private-key-should-never-appear",
        privateNote: "private-note-should-never-appear",
      });
    } finally {
      if (previousDatabaseUrl === undefined) {
        delete process.env.DATABASE_URL;
      } else {
        process.env.DATABASE_URL = previousDatabaseUrl;
      }
      if (previousStorageAccessKey === undefined) {
        delete process.env.STORAGE_ACCESS_KEY_ID;
      } else {
        process.env.STORAGE_ACCESS_KEY_ID = previousStorageAccessKey;
      }
    }

    const output = lines.join("\n");
    for (const sensitiveValue of [
      secret,
      storageAccessKey,
      "api-key-should-never-appear",
      "4111111111111111",
      "credential-should-never-appear",
      "2000-01-02",
      "Private Organizer Name",
      "organizer@example.invalid",
      "postgresql://user:",
      "private-key-should-never-appear",
      "private-note-should-never-appear",
    ]) {
      expect(output).not.toContain(sensitiveValue);
    }
    expect(output).toContain("[REDACTED]");
  });

  it("does not throw for hostile values and distinguishes shared references from cycles", () => {
    const lines: string[] = [];
    const logger = createStructuredLogger({
      minimumLevel: "debug",
      service: "worker",
      sink: (line) => lines.push(line),
    });
    const dangerous = Object.defineProperty({}, "explosive", {
      enumerable: true,
      get: () => {
        throw new Error("getter should not escape logger");
      },
    });
    const hostileProxy = new Proxy(
      {},
      {
        ownKeys: () => {
          throw new Error("proxy should not escape logger");
        },
      },
    );
    const shared = { safe: "value" };
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(() =>
      logger.error("hostile.fixture", {
        circular,
        dangerous,
        first: shared,
        hostileProxy,
        second: shared,
      }),
    ).not.toThrow();

    expect(JSON.parse(lines[0] ?? "")).toMatchObject({
      circular: { self: "[CIRCULAR]" },
      dangerous: { explosive: "[UNSERIALIZABLE]" },
      first: { safe: "value" },
      hostileProxy: "[UNSERIALIZABLE]",
      second: { safe: "value" },
    });
  });

  it("normalizes an unsafe release before writing an error log", () => {
    const lines: string[] = [];
    const unsafeRelease = "release contains a startup secret";
    const logger = createStructuredLogger({
      minimumLevel: "debug",
      release: unsafeRelease,
      service: "web",
      sink: (line) => lines.push(line),
    });

    logger.error("service.startup.failed");

    expect(lines[0]).not.toContain(unsafeRelease);
    expect(JSON.parse(lines[0] ?? "")).toMatchObject({ release: "development" });
  });
});
