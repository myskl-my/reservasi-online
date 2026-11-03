import test from "node:test";
import assert from "node:assert/strict";
import {
  almostFullThreshold,
  availabilityStateLabel,
  capacityUsedPercent,
  getAvailabilityState,
} from "../../src/lib/availability.ts";

function day(overrides = {}) {
  return {
    date: "2026-11-03",
    quota: 10,
    booked: 0,
    remaining: 10,
    isClosed: false,
    dateClosed: false,
    isAvailable: true,
    isToday: false,
    overrideQuota: null,
    ...overrides,
  };
}

test("availability state prioritizes disabled, closed, and full days", () => {
  assert.equal(getAvailabilityState(day(), false), "online_disabled");
  assert.equal(
    getAvailabilityState(day({ dateClosed: true, remaining: 5 }), true),
    "closed",
  );
  assert.equal(
    getAvailabilityState(day({ remaining: 0, isAvailable: false }), true),
    "full",
  );
  assert.equal(
    getAvailabilityState(day({ remaining: 4, isAvailable: false }), true),
    "full",
  );
});

test("almost-full threshold follows 20 percent with a minimum of one slot", () => {
  assert.equal(almostFullThreshold(10), 2);
  assert.equal(almostFullThreshold(4), 1);
  assert.equal(almostFullThreshold(1), 1);

  assert.equal(
    getAvailabilityState(day({ remaining: 2, booked: 8 }), true),
    "almost_full",
  );
  assert.equal(
    getAvailabilityState(day({ remaining: 3, booked: 7 }), true),
    "available",
  );
  assert.equal(
    getAvailabilityState(day({ quota: 1, remaining: 1, booked: 0 }), true),
    "almost_full",
  );
});

test("availability labels are human-readable", () => {
  assert.equal(availabilityStateLabel("available"), "Tersedia");
  assert.equal(availabilityStateLabel("almost_full"), "Hampir penuh");
  assert.equal(availabilityStateLabel("full"), "Penuh");
  assert.equal(availabilityStateLabel("closed"), "Tutup");
  assert.equal(availabilityStateLabel("online_disabled"), "Online nonaktif");
});

test("capacity percentage is rounded and clamped", () => {
  assert.equal(capacityUsedPercent(day({ booked: 5 })), 50);
  assert.equal(capacityUsedPercent(day({ booked: 1, quota: 3 })), 33);
  assert.equal(capacityUsedPercent(day({ booked: 20 })), 100);
  assert.equal(capacityUsedPercent(day({ booked: 0, quota: 0 })), 100);
});
