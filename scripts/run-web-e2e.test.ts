import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { isSafeErrorBoundaryFixturePath } from "./run-web-e2e.mjs";

describe("web E2E temporary fixture guard", () => {
  it("only accepts the dedicated fixture prefix below the operating-system temp directory", () => {
    expect(
      isSafeErrorBoundaryFixturePath(
        resolve(tmpdir(), "autobracket-error-boundaries-contract-fixture"),
      ),
    ).toBe(true);
    expect(
      isSafeErrorBoundaryFixturePath(resolve(tmpdir(), "autobracket-clean-copy-fixture")),
    ).toBe(false);
    expect(isSafeErrorBoundaryFixturePath(resolve(tmpdir(), "..", "AutoBracket"))).toBe(false);
  });
});
