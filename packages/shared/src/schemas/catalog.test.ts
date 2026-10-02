import { describe, expect, it } from "vitest";
import { OverrideInputSchema, ServiceInputSchema, WeeklyScheduleSchema } from "./catalog.js";

describe("WeeklyScheduleSchema", () => {
  it("accepts split shifts on the same day", () => {
    const week = [
      { weekday: 1, start: "09:00", end: "13:00" },
      { weekday: 1, start: "16:00", end: "20:00" },
      { weekday: 6, start: "09:00", end: "14:00" },
    ];
    expect(WeeklyScheduleSchema.safeParse(week).success).toBe(true);
  });

  it("rejects overlapping ranges on the same day", () => {
    const week = [
      { weekday: 2, start: "09:00", end: "13:00" },
      { weekday: 2, start: "12:30", end: "18:00" },
    ];
    expect(WeeklyScheduleSchema.safeParse(week).success).toBe(false);
  });

  it("rejects a range that ends before it starts", () => {
    expect(WeeklyScheduleSchema.safeParse([{ weekday: 3, start: "18:00", end: "09:00" }]).success).toBe(false);
  });

  it("allows ranges that touch (13:00 end, 13:00 start)", () => {
    const week = [
      { weekday: 4, start: "09:00", end: "13:00" },
      { weekday: 4, start: "13:00", end: "15:00" },
    ];
    expect(WeeklyScheduleSchema.safeParse(week).success).toBe(true);
  });
});

describe("ServiceInputSchema", () => {
  it("defaults buffer, deposit and active", () => {
    expect(ServiceInputSchema.parse({ name: "Corte", durationMinutes: 30, priceCents: 600000 })).toMatchObject({
      bufferMinutes: 0,
      depositCents: null,
      active: true,
    });
  });
});

describe("OverrideInputSchema", () => {
  it("requires the end after the start", () => {
    const res = OverrideInputSchema.safeParse({
      startsAt: "2026-10-12T18:00:00-03:00",
      endsAt: "2026-10-12T09:00:00-03:00",
    });
    expect(res.success).toBe(false);
  });
});
