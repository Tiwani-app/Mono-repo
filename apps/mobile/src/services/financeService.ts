import { DuesPeriod, LedgerEntry } from "../types/finance";
import { DataSyncSnapshotMeta } from "../types/sync";
import {
  duesPeriodFromRecord,
  ledgerEntryFromRecord,
} from "./converters/financeConverter";
import {
  createAdHocChargesCallable,
  createFinancePeriodCallable,
  recalculateMemberFinanceStandingCallable,
  recordPaymentCallable,
  reversePaymentCallable,
} from "./cloudFunctionsService";
import {
  firestore,
  getCurrentOrgId,
  snapshotRecords,
  startOrgSubscription,
} from "./firebaseHelpers";

export interface PaymentInput {
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

export const getDuesPeriods = async (): Promise<DuesPeriod[]> => {
  const snapshot = await firestore()
    .collection("finance_periods")
    .where("orgId", "==", await getCurrentOrgId())
    .get();
  return snapshotRecords(snapshot).map(duesPeriodFromRecord);
};

export const createDuesPeriod = async (data: DuesPeriodInput): Promise<void> => {
  await createFinancePeriodCallable(data);
};

export const createAdHocCharge = async (data: ChargeInput): Promise<void> => {
  await createAdHocChargesCallable(data);
};

export const recordPayment = async (data: PaymentInput): Promise<void> => {
  await recordPaymentCallable(data);
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
