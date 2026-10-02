import { describe, expect, it } from "vitest";
import { dayBounds, generateSlots, normalize, subtract, union, weekdayOf, zonedTime } from "./intervals.js";

const BA = "America/Argentina/Buenos_Aires";
const at = (hhmm: string) => zonedTime("2026-10-01", hhmm, BA);
const range = (a: string, b: string) => ({ start: at(a), end: at(b) });
const hhmm = (ms: number) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: BA, hour: "2-digit", minute: "2-digit" }).format(ms);

describe("interval arithmetic", () => {
  it("merges overlapping and touching ranges", () => {
    expect(normalize([range("10:00", "11:00"), range("09:00", "10:00"), range("10:30", "12:00")])).toEqual([
      range("09:00", "12:00"),
    ]);
  });

  it("subtracts a busy range from the middle of a shift", () => {
    expect(subtract([range("09:00", "13:00")], [range("10:00", "10:40")])).toEqual([
      range("09:00", "10:00"),
      range("10:40", "13:00"),
    ]);
  });

  it("subtracts ranges that cover the edges or the whole shift", () => {
    expect(subtract([range("09:00", "13:00")], [range("08:00", "09:30"), range("12:30", "14:00")])).toEqual([
      range("09:30", "12:30"),
    ]);
    expect(subtract([range("09:00", "13:00")], [range("08:00", "14:00")])).toEqual([]);
  });

  it("adds extra opening hours with union", () => {
    expect(union([range("09:00", "13:00")], [range("13:00", "15:00")])).toEqual([range("09:00", "15:00")]);
  });
});

describe("time zones", () => {
  it("reads local times in the business zone", () => {
    expect(new Date(at("09:00")).toISOString()).toBe("2026-10-01T12:00:00.000Z");
  });

  it("knows the weekday of a calendar date", () => {
    expect(weekdayOf("2026-10-01")).toBe(4); // Thursday
  });

  it("gives a 23-hour day when DST starts (Santiago, 6 Sep 2026)", () => {
    const { start, end } = dayBounds("2026-09-06", "America/Santiago");
    expect((end - start) / 3_600_000).toBe(23);
  });
});

describe("generateSlots", () => {
  const rules = {
    durationMinutes: 30,
    bufferMinutes: 10,
    stepMinutes: 15,
    notBefore: 0,
    notAfter: Number.MAX_SAFE_INTEGER,
  };
  const origin = at("00:00");

  it("only offers starts where service + buffer fit before the end of the shift", () => {
    const slots = generateSlots([range("09:00", "10:00")], origin, rules).map(hhmm);
    // 09:15 + 40 min = 09:55 fits; 09:30 + 40 = 10:10 doesn't.
    expect(slots).toEqual(["09:00", "09:15"]);
  });

  it("snaps to the grid after a busy block", () => {
    const free = subtract([range("09:00", "11:00")], [range("09:00", "09:40")]);
    expect(generateSlots(free, origin, rules).map(hhmm)).toEqual(["09:45", "10:00", "10:15"]);
  });

  it("respects the minimum lead time", () => {
    const slots = generateSlots([range("09:00", "11:00")], origin, { ...rules, notBefore: at("10:00") }).map(hhmm);
    expect(slots[0]).toBe("10:00");
  });

  it("returns nothing for a closed day", () => {
    expect(generateSlots([], origin, rules)).toEqual([]);
  });
});
