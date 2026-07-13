import { describe, expect, expectTypeOf, it } from "vitest";

import {
  createReadinessPayload,
  readinessPayloadSchema,
  type DependencyReadiness,
} from "./readiness.js";

const timestamp = "2026-07-13T06:00:00.000Z";

describe("createReadinessPayload", () => {
  it("derives a ready payload when every dependency is available", () => {
    const payload = createReadinessPayload(
      "web",
      [
        { latencyMs: 7, name: "postgresql", status: "ok" },
        { latencyMs: 2, name: "redis", status: "ok" },
      ],
      new Date(timestamp),
    );

    expect(payload).toEqual({
      dependencies: [
        { latencyMs: 7, name: "postgresql", status: "ok" },
        { latencyMs: 2, name: "redis", status: "ok" },
      ],
      service: "web",
      status: "ready",
      timestamp,
    });
  });

  it("derives a not-ready payload without exposing an internal failure message", () => {
    const payload = createReadinessPayload(
      "worker",
      [
        { errorCode: "DATABASE_UNAVAILABLE", name: "postgresql", status: "error" },
        { latencyMs: 1, name: "redis", status: "ok" },
      ],
      new Date(timestamp),
    );

    expect(payload.status).toBe("not_ready");
    expect(payload.dependencies[0]).toEqual({
      errorCode: "DATABASE_UNAVAILABLE",
      name: "postgresql",
      status: "error",
    });
    expect(payload.dependencies[0]).not.toHaveProperty("message");
  });
});

describe("readinessPayloadSchema", () => {
  it("keeps each dependency failure code coupled in the TypeScript contract", () => {
    expectTypeOf<
      Extract<DependencyReadiness, { name: "postgresql"; status: "error" }>["errorCode"]
    >().toEqualTypeOf<"DATABASE_UNAVAILABLE">();
    expectTypeOf<
      Extract<DependencyReadiness, { name: "redis"; status: "error" }>["errorCode"]
    >().toEqualTypeOf<"REDIS_UNAVAILABLE">();
  });

  it.each([
    ["postgresql", "REDIS_UNAVAILABLE"],
    ["redis", "DATABASE_UNAVAILABLE"],
  ])("rejects an error code that does not belong to %s", (name, errorCode) => {
    const result = readinessPayloadSchema.safeParse({
      dependencies: [{ errorCode, name, status: "error" }],
      service: "realtime",
      status: "not_ready",
      timestamp,
    });

    expect(result.success).toBe(false);
  });

  it("rejects a top-level status that disagrees with dependency readiness", () => {
    const result = readinessPayloadSchema.safeParse({
      dependencies: [{ latencyMs: 2, name: "redis", status: "ok" }],
      service: "realtime",
      status: "not_ready",
      timestamp,
    });

    expect(result.success).toBe(false);
  });

  it("rejects duplicate dependency entries", () => {
    const result = readinessPayloadSchema.safeParse({
      dependencies: [
        { latencyMs: 2, name: "redis", status: "ok" },
        { latencyMs: 3, name: "redis", status: "ok" },
      ],
      service: "realtime",
      status: "ready",
      timestamp,
    });

    expect(result.success).toBe(false);
  });

  it("rejects unexpected dependency details and non-UTC timestamps", () => {
    const result = readinessPayloadSchema.safeParse({
      dependencies: [
        {
          errorCode: "REDIS_UNAVAILABLE",
          message: "redis://user:password@internal-host:6379 refused the connection",
          name: "redis",
          status: "error",
        },
      ],
      service: "realtime",
      status: "not_ready",
      timestamp: "2026-07-13T13:00:00+07:00",
    });

    expect(result.success).toBe(false);
  });
});
