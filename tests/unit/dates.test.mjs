import test from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  dateRange,
  daysBetweenInclusive,
  formatDateID,
  isDateInBookingWindow,
  isValidDateString,
  todayDateString,
} from "../../src/lib/dates.ts";

test("todayDateString follows Asia/Jakarta midnight boundary", () => {
  assert.equal(todayDateString(new Date("2026-01-01T16:59:59.000Z")), "2026-01-01");
  assert.equal(todayDateString(new Date("2026-01-01T17:00:00.000Z")), "2026-01-02");
  assert.equal(todayDateString(new Date("2026-06-30T17:00:00.000Z")), "2026-07-01");
});

test("addDays handles month, year, and leap-year boundaries", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2027-01-01", -1), "2026-12-31");
  assert.equal(addDays("2024-02-28", 1), "2024-02-29");
  assert.equal(addDays("2024-02-29", 1), "2024-03-01");
  assert.equal(addDays("2025-02-28", 1), "2025-03-01");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(addDays("2026-01-15", 0), "2026-01-15");
});

test("dateRange produces inclusive sequential dates", () => {
  assert.deepEqual(dateRange("2026-01-30", 3), [
    "2026-01-30",
    "2026-01-31",
    "2026-02-01",
  ]);
  assert.deepEqual(dateRange("2026-01-01", 1), ["2026-01-01"]);
});

test("isValidDateString rejects malformed and impossible dates", () => {
  assert.equal(isValidDateString("2026-02-28"), true);
  assert.equal(isValidDateString("2024-02-29"), true);
  assert.equal(isValidDateString("2025-02-29"), false);
  assert.equal(isValidDateString("2026-02-30"), false);
  assert.equal(isValidDateString("2026-13-01"), false);
  assert.equal(isValidDateString("2026-00-10"), false);
  assert.equal(isValidDateString("2026-1-01"), false);
  assert.equal(isValidDateString("01-01-2026"), false);
  assert.equal(isValidDateString(""), false);
});

test("booking window is 30 days including today", () => {
  const today = "2026-01-01";
  assert.equal(isDateInBookingWindow(today, today), true);
  assert.equal(isDateInBookingWindow("2026-01-30", today), true);
  assert.equal(isDateInBookingWindow("2026-01-31", today), false);
  assert.equal(isDateInBookingWindow("2025-12-31", today), false);
  assert.equal(isDateInBookingWindow("2026-02-01", today), false);
  assert.equal(isDateInBookingWindow("not-a-date", today), false);
});

test("daysBetweenInclusive counts both endpoints", () => {
  assert.equal(daysBetweenInclusive("2026-01-01", "2026-01-01"), 1);
  assert.equal(daysBetweenInclusive("2026-01-01", "2026-01-31"), 31);
  assert.equal(daysBetweenInclusive("2026-02-01", "2026-03-01"), 29);
});

test("formatDateID formats UTC date without timezone drift", () => {
  assert.match(formatDateID("2026-01-01"), /Kamis/);
  assert.match(formatDateID("2026-01-01"), /1 Januari 2026/);
  assert.equal(formatDateID("invalid"), "invalid");
});
