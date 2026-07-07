import { colors } from "../theme";
import { LedgerEntry, LedgerPaidStatus } from "../types/finance";
import { isPastCalendarDay } from "./dateStatus";

export type ChargeDisplayStatus = LedgerPaidStatus | "overdue";

export const getChargeDisplayStatus = (
  entry: Pick<LedgerEntry, "dueDate" | "paid" | "paidStatus" | "type">,
  now = new Date(),
): ChargeDisplayStatus => {
  if (entry.type === "payment" || entry.paid) {
    return "paid";
  }
  if (entry.dueDate && isPastCalendarDay(entry.dueDate, now)) {
    return "overdue";
  }
  return entry.paidStatus;
};

export const chargeStatusLabel = (status: ChargeDisplayStatus): string => {
  if (status === "paid") {
    return "PAID";
  }
  if (status === "partial") {
    return "PARTIAL";
  }
  if (status === "overdue") {
    return "OVERDUE";
  }
  return "UNPAID";
};

export const chargeStatusColor = (status: ChargeDisplayStatus): string => {
  if (status === "paid") {
    return colors.status.success;
  }
  if (status === "partial") {
    return colors.gold.default;
  }
  return colors.status.error;
};
