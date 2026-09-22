import {
  getChargeAmountPaid,
  getChargeOutstanding,
  getFinanceTotals,
} from "../utils/financeTotals";
import { LedgerEntry, LedgerType } from "../types/finance";

const charge = (over: Partial<LedgerEntry>): LedgerEntry => ({
  id: "c1",
  uid: "u1",
  type: "dues" as LedgerType,
  label: "Election Fees",
  amount: 50,
  amountPaid: 0,
  dueDate: new Date("2026-10-30"),
  paid: false,
  paidStatus: "unpaid",
  paidAt: null,
  note: "",
  ...over,
});

describe("getFinanceTotals — Collected reflects amount paid on charges", () => {
  it("counts a fully-paid charge as collected regardless of when it was paid", () => {
    // The bug: a charge due in October but paid in September showed $0
    // collected on the October ledger. Collected is charge-based, so payment
    // timing must not matter.
    const totals = getFinanceTotals([
      charge({ amount: 50, amountPaid: 50, paid: true, paidStatus: "paid" }),
    ]);
    expect(totals.totalCharged).toBe(50);
    expect(totals.totalPaid).toBe(50);
    expect(totals.outstanding).toBe(0);
  });

  it("keeps Charged − Collected === Outstanding for a partial payment", () => {
    const totals = getFinanceTotals([
      charge({ amount: 100, amountPaid: 40, paidStatus: "partial" }),
    ]);
    expect(totals.totalCharged).toBe(100);
    expect(totals.totalPaid).toBe(40);
    expect(totals.outstanding).toBe(60);
    expect(totals.totalCharged - totals.totalPaid).toBe(totals.outstanding);
  });

  it("clamps paid amount to [0, amount] so it never over- or under-counts", () => {
    expect(getChargeAmountPaid(charge({ amount: 50, amountPaid: 80 }))).toBe(50);
    expect(getChargeAmountPaid(charge({ amount: 50, amountPaid: -10 }))).toBe(0);
    expect(getChargeOutstanding(charge({ amount: 50, amountPaid: 80 }))).toBe(0);
  });

  it("ignores payment entries so they are never double-counted as charges", () => {
    const totals = getFinanceTotals([
      charge({ amount: 50, amountPaid: 50, paid: true, paidStatus: "paid" }),
      charge({
        id: "p1",
        type: "payment",
        amount: 50,
        amountPaid: 50,
        paidAt: new Date("2026-09-22"),
      }),
    ]);
    expect(totals.totalCharged).toBe(50);
    expect(totals.totalPaid).toBe(50);
    expect(totals.outstanding).toBe(0);
  });
});
