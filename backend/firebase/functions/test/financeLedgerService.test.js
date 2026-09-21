/* eslint-env node */

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  paidStatusFor,
  millisFromDateValue,
  recalculateMemberFinance,
} = require("../lib/financeLedgerService");

test("paidStatusFor returns unpaid when nothing has been paid", () => {
  assert.equal(paidStatusFor(100, 0), "unpaid");
});

test("paidStatusFor returns partial when some but not all is paid", () => {
  assert.equal(paidStatusFor(100, 40), "partial");
});

test("paidStatusFor returns paid once the amount owed is met", () => {
  assert.equal(paidStatusFor(100, 100), "paid");
});

test("paidStatusFor returns paid when overpaid (defensive)", () => {
  assert.equal(paidStatusFor(100, 150), "paid");
});

test("millisFromDateValue reads a native Date", () => {
  const date = new Date("2026-01-15T00:00:00Z");
  assert.equal(millisFromDateValue(date), date.getTime());
});

test("millisFromDateValue reads a Firestore Timestamp-like value", () => {
  const millis = 1_700_000_000_000;
  assert.equal(millisFromDateValue({ toMillis: () => millis }), millis);
});

test("millisFromDateValue treats a missing due date as infinitely far out", () => {
  assert.equal(millisFromDateValue(null), Infinity);
  assert.equal(millisFromDateValue(undefined), Infinity);
});

const fakeChargeSnapshot = (path, data) => ({
  ref: { path },
  data: () => data,
});

test("recalculateMemberFinance sums outstanding balance across charges", () => {
  const snapshots = [
    fakeChargeSnapshot("finance/a", { amount: 100, amountPaid: 100 }),
    fakeChargeSnapshot("finance/b", { amount: 50, amountPaid: 0 }),
  ];
  const result = recalculateMemberFinance(snapshots);
  assert.equal(result.outstandingBalance, 50);
  assert.equal(result.financialStatus, "green");
});

test("recalculateMemberFinance flags red when an unpaid charge is overdue", () => {
  const pastDue = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const snapshots = [
    fakeChargeSnapshot("finance/a", { amount: 50, amountPaid: 0, dueDate: pastDue }),
  ];
  const result = recalculateMemberFinance(snapshots);
  assert.equal(result.financialStatus, "red");
  assert.equal(result.outstandingBalance, 50);
});

test("recalculateMemberFinance is green when the only overdue charge is fully paid", () => {
  const pastDue = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const snapshots = [
    fakeChargeSnapshot("finance/a", { amount: 50, amountPaid: 50, dueDate: pastDue }),
  ];
  const result = recalculateMemberFinance(snapshots);
  assert.equal(result.financialStatus, "green");
  assert.equal(result.outstandingBalance, 0);
});

test("recalculateMemberFinance applies the changedCharge override instead of the stored amountPaid", () => {
  // Mirrors how applyChargePayment recalculates a member's standing inside
  // the same transaction that updates the selected charge, before that
  // write is visible to a fresh read.
  const snapshots = [
    fakeChargeSnapshot("finance/a", { amount: 100, amountPaid: 0 }),
  ];
  const result = recalculateMemberFinance(snapshots, {
    amountPaid: 40,
    refPath: "finance/a",
  });
  assert.equal(result.outstandingBalance, 60);
});
