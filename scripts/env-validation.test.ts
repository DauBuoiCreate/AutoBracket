import { describe, expect, it } from "vitest";

import { readRealtimeEnvironment } from "../apps/realtime/src/env.js";
import { readWebEnvironment } from "../apps/web/src/config/env.js";
import { readWorkerEnvironment } from "../apps/worker/src/env.js";

describe("process environment contracts", () => {
  it("provides safe local defaults for the web process", () => {
    expect(readWebEnvironment({})).toMatchObject({
      APP_URL: "http://localhost:3000",
      NODE_ENV: "development",
      PORT: 3000,
      PUBLIC_URL: "http://localhost:3000",
      RELEASE_VERSION: "development",
      REDIS_URL: "redis://localhost:57379",
    });
  });

  it("rejects an invalid public URL", () => {
    expect(() => readWebEnvironment({ PUBLIC_URL: "not-a-url" })).toThrow();
  });

  it.each([
    ["web", () => readWebEnvironment({ RELEASE_VERSION: "bad release" })],
    ["worker", () => readWorkerEnvironment({ RELEASE_VERSION: "bad release" })],
    ["realtime", () => readRealtimeEnvironment({ RELEASE_VERSION: "bad release" })],
  ])("rejects an unsafe release label for %s", (_service, readEnvironment) => {
    expect(readEnvironment).toThrow();
  });

  it("coerces a valid realtime port and rejects an out-of-range port", () => {
    expect(readRealtimeEnvironment({ REALTIME_PORT: "4101" })).toMatchObject({
      REALTIME_PORT: 4101,
    });
    expect(() => readRealtimeEnvironment({ REALTIME_PORT: "70000" })).toThrow();
  });

  it("validates the worker health port independently", () => {
    expect(readWorkerEnvironment({ WORKER_HEALTH_PORT: "4102" })).toMatchObject({
      WORKER_HEALTH_PORT: 4102,
    });
  });

  it.each([
    ["web", () => readWebEnvironment({ DATABASE_URL: "mysql://localhost/autobracket" })],
    ["worker", () => readWorkerEnvironment({ DATABASE_URL: "mysql://localhost/autobracket" })],
  ])("rejects a non-PostgreSQL database URL for %s", (_service, readEnvironment) => {
    expect(readEnvironment).toThrow();
  });

  it.each([
    ["web", () => readWebEnvironment({ REDIS_URL: "http://localhost:57379" })],
    ["worker", () => readWorkerEnvironment({ REDIS_URL: "http://localhost:57379" })],
    ["realtime", () => readRealtimeEnvironment({ REDIS_URL: "http://localhost:57379" })],
  ])("rejects a non-Redis URL for %s", (_service, readEnvironment) => {
    expect(readEnvironment).toThrow();
  });
});
