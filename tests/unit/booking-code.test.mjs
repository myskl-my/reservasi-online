import test from "node:test";
import assert from "node:assert/strict";
import {
  generateBookingCode,
  isValidBookingCode,
  maskPhone,
} from "../../src/lib/booking-code.ts";

test("generated booking codes use the expected alphabet and length", () => {
  const codes = new Set();
  for (let index = 0; index < 25; index += 1) {
    const code = generateBookingCode();
    assert.match(code, /^CQ-[A-Z2-7]{8}$/);
    codes.add(code);
  }
  assert.ok(codes.size > 20, "codes should be effectively random");
});

test("isValidBookingCode accepts valid codes case-insensitively", () => {
  assert.equal(isValidBookingCode("CQ-ABCDEFGH"), true);
  assert.equal(isValidBookingCode("cq-abcdefgh"), true);
  assert.equal(isValidBookingCode("  CQ-ABCDEFGH  "), true);
  assert.equal(isValidBookingCode("CQ-ABCDEFG2"), true);
  assert.equal(isValidBookingCode("CQ-ABCDEFG7"), true);
});

test("isValidBookingCode rejects ambiguous or malformed codes", () => {
  for (const digit of ["0", "1", "8", "9"]) {
    assert.equal(isValidBookingCode(`CQ-ABCDEFG${digit}`), false);
  }
  assert.equal(isValidBookingCode("CQ-ABCDEFG"), false);
  assert.equal(isValidBookingCode("CQ-ABCDEFGHI"), false);
  assert.equal(isValidBookingCode("XQ-ABCDEFGH"), false);
  assert.equal(isValidBookingCode("ABCDEFGH"), false);
  assert.equal(isValidBookingCode(""), false);
});

test("maskPhone hides all but the last four digits", () => {
  assert.equal(maskPhone("+6281234567890"), "+62••••7890");
  assert.equal(maskPhone("+14155552671"), "+••••2671");
});
