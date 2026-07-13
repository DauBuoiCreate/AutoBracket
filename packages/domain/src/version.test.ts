import { describe, expect, it } from "vitest";

import { DOMAIN_ENGINE_VERSION } from "./index.js";

describe("domain engine contract", () => {
  it("exposes an explicit semantic version before domain algorithms are introduced", () => {
    expect(DOMAIN_ENGINE_VERSION).toMatch(/^\d+\.\d+\.\d+$/u);
  });
});
