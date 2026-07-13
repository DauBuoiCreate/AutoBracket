import { describe, expect, it } from "vitest";

import { createHealthPayload } from "./health.js";

describe("createHealthPayload", () => {
  it("returns a deterministic, public-safe health contract", () => {
    const payload = createHealthPayload("web", new Date("2026-07-13T06:00:00.000Z"));

    expect(payload).toEqual({
      service: "web",
      status: "ok",
      timestamp: "2026-07-13T06:00:00.000Z",
    });
    expect(payload).not.toHaveProperty("version");
  });
});
