import { LedgerEntry } from "../types/finance";

const entryDate = (entry: LedgerEntry): number =>
  (entry.paidAt ?? entry.dueDate)?.getTime() ?? 0;

// Position a group by when its anchor entry was created, so the latest-created
// charge (which starts out unpaid) sits at the top. Falls back to the entry's
// due/paid date for older records that predate the stored createdAt.
const groupSortKey = (entry: LedgerEntry): number =>
  entry.createdAt?.getTime() ?? entryDate(entry);

/**
 * Order ledger entries so each charge is grouped with the payment(s) made
 * against it (linked via `appliedChargeId`), instead of scattering charge and
 * payment by date. Within a group the payment(s) render above the bill they
 * paid (newest payment on top, then the bill). Groups are ordered by when the
 * charge was created (newest-created on top), so a freshly added unpaid charge
 * leads the list; payments not tied to a charge fall back to their own date.
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
    return { items: [...chargePayments, charge], sortKey: groupSortKey(charge) };
  });
  for (const payment of orphanPayments) {
    groups.push({ items: [payment], sortKey: groupSortKey(payment) });
  }
  groups.sort((left, right) => right.sortKey - left.sortKey);
  return groups.flatMap((group) => group.items);
};
