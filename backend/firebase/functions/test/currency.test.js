/* eslint-env node */

const assert = require("node:assert/strict");
const test = require("node:test");

const { toMinorUnits, fromMinorUnits } = require("../lib/currency");

test("toMinorUnits converts NGN to kobo", () => {
  assert.equal(toMinorUnits(100, "NGN"), 10000);
});

test("toMinorUnits converts USD to cents", () => {
  assert.equal(toMinorUnits(19.99, "USD"), 1999);
});

test("toMinorUnits is case-insensitive on currency code", () => {
  assert.equal(toMinorUnits(100, "ngn"), 10000);
});

test("toMinorUnits does not multiply a zero-decimal currency", () => {
  assert.equal(toMinorUnits(500, "JPY"), 500);
});

test("fromMinorUnits reverses toMinorUnits for a 2-decimal currency", () => {
  assert.equal(fromMinorUnits(10000, "NGN"), 100);
});

test("fromMinorUnits reverses toMinorUnits for a zero-decimal currency", () => {
  assert.equal(fromMinorUnits(500, "JPY"), 500);
});
