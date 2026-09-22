import { LedgerEntry } from "../types/finance";

const entryDate = (entry: LedgerEntry): number =>
  (entry.paidAt ?? entry.dueDate)?.getTime() ?? 0;

/**
 * Order ledger entries so each charge is immediately followed by the payment(s)
 * made against it (linked via `appliedChargeId`), instead of scattering charge
 * and payment by date. Charge groups are ordered newest-first (by the charge's
 * date); payments not tied to a charge fall back to their own date among them.
 */
export const orderLedgerByCharge = (entries: LedgerEntry[]): LedgerEntry[] => {
  const charges = entries.filter((entry) => entry.type !== "payment");
  const chargeIds = new Set(charges.map((charge) => charge.id));
  const paymentsByCharge = new Map<string, LedgerEntry[]>();
  const orphanPayments: LedgerEntry[] = [];
  for (const entry of entries) {
    if (entry.type !== "payment") {
      continue;
    }
    if (entry.appliedChargeId && chargeIds.has(entry.appliedChargeId)) {
      const group = paymentsByCharge.get(entry.appliedChargeId) ?? [];
      group.push(entry);
      paymentsByCharge.set(entry.appliedChargeId, group);
    } else {
      orphanPayments.push(entry);
    }
  }

  const groups = charges.map((charge) => {
    const chargePayments = (paymentsByCharge.get(charge.id) ?? []).sort(
      (left, right) => entryDate(right) - entryDate(left),
    );
    return { items: [charge, ...chargePayments], sortKey: entryDate(charge) };
  });
  for (const payment of orphanPayments) {
    groups.push({ items: [payment], sortKey: entryDate(payment) });
  }
  groups.sort((left, right) => right.sortKey - left.sortKey);
  return groups.flatMap((group) => group.items);
};
