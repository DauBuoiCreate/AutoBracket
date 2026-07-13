import { expect, it } from "vitest";

it("is intentionally red so the CI negative harness can prove test failures block the gate", () => {
  expect("intentional-failure").toBe("unexpected-success");
});
