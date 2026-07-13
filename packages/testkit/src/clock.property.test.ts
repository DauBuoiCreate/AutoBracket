import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { createFixedClock } from "./index.js";

describe("createFixedClock property harness", () => {
  it("returns deterministic defensive Date copies for every valid generated date", () => {
    fc.assert(
      fc.property(fc.date({ noInvalidDate: true }), (date) => {
        const clock = createFixedClock(date.toISOString());
        const first = clock();
        const second = clock();

        expect(first.valueOf()).toBe(date.valueOf());
        expect(second.valueOf()).toBe(date.valueOf());
        expect(first).not.toBe(second);
      }),
      { numRuns: 100 },
    );
  });
});
