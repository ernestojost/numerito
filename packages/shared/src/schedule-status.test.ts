import { describe, expect, it } from "vitest";
import { localParts, openStatus } from "./schedule-status.js";

const BA = "America/Argentina/Buenos_Aires"; // UTC-3, no DST
const week = [
  { weekday: 4, start: "09:00", end: "13:00" },
  { weekday: 4, start: "16:00", end: "20:00" },
  { weekday: 5, start: "09:00", end: "13:00" },
];

// Thursday 1 Oct 2026
const at = (hhmm: string) => new Date(`2026-10-01T${hhmm}:00-03:00`);

describe("localParts", () => {
  it("reads weekday and time in the business time zone", () => {
    // 02:30 UTC on Friday is still Thursday 23:30 in Buenos Aires.
    expect(localParts(new Date("2026-10-02T02:30:00Z"), BA)).toEqual({ weekday: 4, time: "23:30" });
  });
});

describe("openStatus", () => {
  it("is open inside a range", () => {
    expect(openStatus(week, at("10:15"), BA)).toEqual({ open: true, until: "13:00" });
  });

  it("is closed during the lunch break and opens later today", () => {
    expect(openStatus(week, at("14:00"), BA)).toEqual({ open: false, next: { weekday: 4, start: "16:00", today: true } });
  });

  it("closes exactly at the end time", () => {
    expect(openStatus(week, at("20:00"), BA)).toMatchObject({ open: false, next: { weekday: 5, start: "09:00" } });
  });

  it("wraps around the week", () => {
    const status = openStatus(week, new Date("2026-10-03T12:00:00-03:00"), BA); // Saturday
    expect(status).toEqual({ open: false, next: { weekday: 4, start: "09:00", today: false } });
  });

  it("has no next opening without hours", () => {
    expect(openStatus([], at("10:00"), BA)).toEqual({ open: false, next: null });
  });
});
