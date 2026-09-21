/* eslint-env node */

const assert = require("node:assert/strict");
const test = require("node:test");
const { createHmac } = require("node:crypto");

const { verifyPaystackSignature } = require("../lib/payments");

const secret = "sk_test_paystack_example";
const rawBody = Buffer.from(
  JSON.stringify({ event: "charge.success", data: { reference: "ref_123" } }),
);
const goodSignature = createHmac("sha512", secret)
  .update(rawBody)
  .digest("hex");

test("accepts a signature computed with the correct secret over the raw body", () => {
  assert.equal(verifyPaystackSignature(rawBody, goodSignature, secret), true);
});

test("rejects a tampered body (same signature, different body)", () => {
  const tampered = Buffer.from(
    JSON.stringify({ event: "charge.success", data: { reference: "ref_999" } }),
  );
  assert.equal(verifyPaystackSignature(tampered, goodSignature, secret), false);
});

test("rejects a signature made with the wrong secret", () => {
  const wrong = createHmac("sha512", "sk_test_wrong").update(rawBody).digest("hex");
  assert.equal(verifyPaystackSignature(rawBody, wrong, secret), false);
});

test("rejects a missing or non-string signature", () => {
  assert.equal(verifyPaystackSignature(rawBody, undefined, secret), false);
  assert.equal(verifyPaystackSignature(rawBody, "", secret), false);
  assert.equal(verifyPaystackSignature(rawBody, 12345, secret), false);
});
