import { orderLedgerByCharge } from "../utils/ledgerHistory";
import { LedgerEntry, LedgerType } from "../types/finance";

const base = (over: Partial<LedgerEntry>): LedgerEntry => ({
  id: "x",
  uid: "u1",
  type: "dues" as LedgerType,
  label: "Charge",
  amount: 50,
  amountPaid: 0,
  dueDate: null,
  paid: false,
  paidStatus: "unpaid",
  paidAt: null,
  note: "",
  ...over,
});

const charge = (id: string, label: string, due: string) =>
  base({ id, label, dueDate: new Date(due) });

const payment = (id: string, label: string, paid: string, chargeId?: string) =>
  base({
    id,
    type: "payment",
    label,
    paidStatus: "paid",
    paid: true,
    paidAt: new Date(paid),
    ...(chargeId ? { appliedChargeId: chargeId, appliedChargeLabel: label } : {}),
  });

describe("orderLedgerByCharge", () => {
  it("places each payment immediately after the charge it paid", () => {
    // Scattered input: payment before its charge, unrelated rows in between.
    const picnicCharge = charge("c1", "Odua Picnic 2026", "2026-08-12");
    const picnicPayment = payment("p1", "Paystack · Card", "2026-09-22", "c1");
    const levyCharge = charge("c2", "Levy", "2026-07-10");
    const levyPayment = payment("p2", "Bank transfer", "2026-07-10", "c2");

    const ordered = orderLedgerByCharge([
      picnicPayment,
      levyCharge,
      levyPayment,
      picnicCharge,
    ]);

    const ids = ordered.map((entry) => entry.id);
    // Newest charge group (picnic, Aug) first, each charge directly followed by its payment.
    expect(ids).toEqual(["c1", "p1", "c2", "p2"]);
  });

  it("keeps a payment with no matching charge, ordered by its own date", () => {
    const c = charge("c1", "Dues", "2026-06-30");
    const cPay = payment("p1", "Bank transfer", "2026-06-30", "c1");
    const standalone = payment("p2", "Bank transfer", "2026-08-01"); // no appliedChargeId

    const ordered = orderLedgerByCharge([c, cPay, standalone]);

    // Standalone payment (Aug) sorts above the June charge group but is never dropped.
    expect(ordered.map((entry) => entry.id)).toEqual(["p2", "c1", "p1"]);
  });

  it("groups multiple payments under the same charge, newest first", () => {
    const c = charge("c1", "Dues", "2026-01-01");
    const pay1 = payment("p1", "Bank transfer", "2026-02-01", "c1");
    const pay2 = payment("p2", "Paystack · Card", "2026-03-01", "c1");

    const ordered = orderLedgerByCharge([pay1, c, pay2]);

    expect(ordered.map((entry) => entry.id)).toEqual(["c1", "p2", "p1"]);
  });
});
