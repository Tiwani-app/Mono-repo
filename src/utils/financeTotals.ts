import { LedgerEntry } from "../types/finance";

const clampPaidAmount = (entry: LedgerEntry): number => {
  if (!Number.isFinite(entry.amountPaid)) {
    return 0;
  }
  return Math.min(Math.max(entry.amountPaid, 0), entry.amount);
};

export const getChargeAmountPaid = (entry: LedgerEntry): number =>
  entry.type === "payment" ? 0 : clampPaidAmount(entry);

export const getChargeOutstanding = (entry: LedgerEntry): number =>
  entry.type === "payment"
    ? 0
    : Math.max(0, entry.amount - clampPaidAmount(entry));

export const getFinanceTotals = (entries: LedgerEntry[]) => {
  const charges = entries.filter((entry) => entry.type !== "payment");

  return {
    totalCharged: charges.reduce((sum, entry) => sum + entry.amount, 0),
    totalPaid: charges.reduce(
      (sum, entry) => sum + getChargeAmountPaid(entry),
      0,
    ),
    outstanding: charges.reduce(
      (sum, entry) => sum + getChargeOutstanding(entry),
      0,
    ),
  };
};
