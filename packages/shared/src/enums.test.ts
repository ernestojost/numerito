import { describe, expect, it } from "vitest";
import { BLOCKING_STATUSES, BOOKING_STATUSES } from "./enums.js";

describe("booking statuses", () => {
  it("blocking statuses are a subset of all statuses", () => {
    for (const s of BLOCKING_STATUSES) expect(BOOKING_STATUSES).toContain(s);
  });
});
