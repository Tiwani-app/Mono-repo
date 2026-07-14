import { DuesPeriod, LedgerEntry } from "../types/finance";
import { DataSyncSnapshotMeta } from "../types/sync";
import {
  duesPeriodFromRecord,
  ledgerEntryFromRecord,
} from "./converters/financeConverter";
import {
  createAdHocChargesCallable,
  createFinancePeriodCallable,
  deleteFinanceChargeCallable,
  deleteFinancePeriodCallable,
  recalculateMemberFinanceStandingCallable,
  recordBulkPaymentsCallable,
  recordPaymentCallable,
  reversePaymentCallable,
} from "./cloudFunctionsService";
import { startOrgSubscription } from "./firebaseHelpers";

export interface PaymentInput {
  uid: string;
  chargeEntryId: string;
  amount: number;
  paymentMethod: string;
  reference: string;
  note: string;
}

export interface BulkPaymentItem {
  uid: string;
  chargeEntryId: string;
  amount: number;
  paymentMethod: string;
  reference: string;
  note: string;
}

export interface ReversePaymentInput {
  note: string;
  paymentId: string;
}

export interface DuesPeriodInput {
  name: string;
  amount: number;
  dueDate: Date;
  status: DuesPeriod["status"];
}

export interface ChargeInput {
  memberIds: string[];
  type: LedgerEntry["type"];
  label: string;
  amount: number;
  dueDate: Date | null;
  note: string;
}

export const subscribeToLedger = (
  uid: string | null,
  callback: (entries: LedgerEntry[]) => void,
  onError?: (error: Error) => void,
  onSnapshotMeta?: (meta: DataSyncSnapshotMeta) => void,
) =>
  startOrgSubscription(
    "finance",
    ledgerEntryFromRecord,
    callback,
    (query) => (uid ? query.where("memberId", "==", uid) : query),
    onError,
    onSnapshotMeta,
  );

export const subscribeToDuesPeriods = (
  callback: (periods: DuesPeriod[]) => void,
  onError?: (error: Error) => void,
) =>
  startOrgSubscription(
    "finance_periods",
    duesPeriodFromRecord,
    callback,
    undefined,
    onError,
  );

export const createDuesPeriod = async (data: DuesPeriodInput): Promise<void> => {
  await createFinancePeriodCallable(data);
};

export const createAdHocCharge = async (data: ChargeInput): Promise<void> => {
  await createAdHocChargesCallable(data);
};

export const recordPayment = async (data: PaymentInput): Promise<void> => {
  await recordPaymentCallable(data);
};

export const recordBulkPayments = async (
  payments: BulkPaymentItem[],
): Promise<number> => {
  const result = await recordBulkPaymentsCallable(payments);
  return result.count;
};

export const deleteDuesPeriod = async (periodId: string): Promise<void> => {
  const id = periodId.trim();
  if (!id) {
    throw new Error("Dues period is required.");
  }
  await deleteFinancePeriodCallable(id);
};

export const deleteCharge = async (chargeEntryId: string): Promise<void> => {
  const id = chargeEntryId.trim();
  if (!id) {
    throw new Error("Charge is required.");
  }
  await deleteFinanceChargeCallable(id);
};

export const reversePayment = async ({
  note,
  paymentId,
}: ReversePaymentInput): Promise<void> => {
  if (!paymentId.trim()) {
    throw new Error("Payment is required.");
  }
  await reversePaymentCallable(paymentId.trim(), note.trim());
};

export const recalculateMemberFinanceStanding = async (
  uid: string,
): Promise<void> => {
  const memberId = uid.trim();
  if (!memberId) {
    throw new Error("Member is required.");
  }
  await recalculateMemberFinanceStandingCallable(memberId);
};
