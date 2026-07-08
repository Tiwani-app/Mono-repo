import { colors } from "../theme";
import { FinancialStatus } from "../types/user";

export type FinanceStanding = "clear" | "balance_due" | "overdue";

export const getFinanceStanding = (
  financialStatus: FinancialStatus | undefined,
  outstandingBalance: number,
): FinanceStanding => {
  if (outstandingBalance <= 0) {
    return "clear";
  }
  return financialStatus === "red" ? "overdue" : "balance_due";
};

export const getFinanceStandingColor = (standing: FinanceStanding) => {
  if (standing === "overdue") {
    return colors.status.error;
  }
  if (standing === "balance_due") {
    return colors.gold.default;
  }
  return colors.status.success;
};

export const getFinanceStandingBadgeLabel = (standing: FinanceStanding) => {
  if (standing === "overdue") {
    return "OVERDUE";
  }
  if (standing === "balance_due") {
    return "BALANCE DUE";
  }
  return "CLEAR";
};

export const getFinanceStandingBannerLabel = (standing: FinanceStanding) => {
  if (standing === "overdue") {
    return "DUES OVERDUE";
  }
  if (standing === "balance_due") {
    return "BALANCE DUE";
  }
  return "IN GOOD STANDING";
};
