import test from "node:test";
import assert from "node:assert/strict";
import { normalizePhone } from "../../src/lib/phone.ts";

test("normalizes Indonesian mobile numbers to +62", () => {
  assert.equal(normalizePhone("081234567890"), "+6281234567890");
  assert.equal(normalizePhone("0812-3456-7890"), "+6281234567890");
  assert.equal(normalizePhone("0812 3456 7890"), "+6281234567890");
  assert.equal(normalizePhone("(0812) 3456.7890"), "+6281234567890");
  assert.equal(normalizePhone("6281234567890"), "+6281234567890");
  assert.equal(normalizePhone("81234567890"), "+6281234567890");
  assert.equal(normalizePhone("+6281234567890"), "+6281234567890");
  assert.equal(normalizePhone("+62 812-3456-7890"), "+6281234567890");
});

test("keeps valid international numbers with plus prefix", () => {
  assert.equal(normalizePhone("+14155552671"), "+14155552671");
  assert.equal(normalizePhone("+44 20 7946 0958"), "+442079460958");
});

test("rejects invalid phone input", () => {
  assert.equal(normalizePhone(""), null);
  assert.equal(normalizePhone("   "), null);
  assert.equal(normalizePhone("12345"), null);
  assert.equal(normalizePhone("abcdefghij"), null);
  assert.equal(normalizePhone("0812"), null);
  assert.equal(normalizePhone("+0123456789"), null);
  assert.equal(normalizePhone("6281234567890123456"), null);
});
