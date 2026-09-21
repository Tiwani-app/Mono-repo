import { FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { db } from "./firebase";

export type PaidStatus = "unpaid" | "partial" | "paid";

export const paidStatusFor = (amount: number, amountPaid: number): PaidStatus => {
  if (amountPaid <= 0) {
    return "unpaid";
  }
  return amountPaid >= amount ? "paid" : "partial";
};

export const millisFromDateValue = (value: unknown): number => {
  if (value instanceof Date) {
    return value.getTime();
  }
  if (value && typeof value === "object" && "toMillis" in value) {
    const toMillis = (value as { toMillis?: unknown }).toMillis;
    if (typeof toMillis === "function") {
      return toMillis.call(value);
    }
  }
  return Infinity;
};

export const recalculateMemberFinance = (
  chargeSnapshots: FirebaseFirestore.DocumentSnapshot[],
  changedCharge?: {
    amountPaid: number;
    refPath: string;
  },
) => {
  let outstandingBalance = 0;
  let hasOverdueCharge = false;
  const now = Date.now();
  chargeSnapshots.forEach((snapshot) => {
    const record = snapshot.data() ?? {};
    const amount = typeof record.amount === "number" ? record.amount : 0;
    const storedAmountPaid =
      typeof record.amountPaid === "number" ? record.amountPaid : 0;
    const amountPaid =
      snapshot.ref.path === changedCharge?.refPath
        ? changedCharge.amountPaid
        : storedAmountPaid;
    const owedAfter = Math.max(0, amount - amountPaid);
    outstandingBalance += owedAfter;
    if (owedAfter > 0 && millisFromDateValue(record.dueDate) < now) {
      hasOverdueCharge = true;
    }
  });
  return {
    financialStatus: hasOverdueCharge ? "red" : "green",
    outstandingBalance,
  };
};

/**
 * Distinguishes an admin manually keying in a bank-transfer/cash payment
 * from a payment gateway confirming a charge, per payment-feature.md §5.1 —
 * both land in the same `finance` document shape via `applyChargePayment`.
 */
export type ChargePaymentSource =
  | { kind: "admin_recorded"; paymentMethod: string; reference: string }
  | {
      kind: "gateway";
      provider: "stripe" | "paystack";
      paymentIntentId: string;
      paymentMethod: string;
      reference: string;
    };

export interface ApplyChargePaymentInput {
  transaction: FirebaseFirestore.Transaction;
  orgId: string;
  memberId: string;
  memberRef: FirebaseFirestore.DocumentReference;
  /** Candidate unpaid/partial charge refs for this member, queried before the transaction started. */
  candidateChargeRefs: FirebaseFirestore.DocumentReference[];
  chargeEntryId: string;
  amount: number;
  note: string;
  source: ChargePaymentSource;
  actorUid: string;
  actorRole: string;
}

export interface ApplyChargePaymentResult {
  paymentId: string;
  paidStatus: PaidStatus;
  settledPeriodId: string | null;
}

/**
 * Applies a payment to a single outstanding charge inside an existing
 * transaction: validates the charge belongs to the member/org, clamps the
 * amount to what's still owed, updates the charge's paidStatus, auto-settles
 * the dues period if this payment completes it, writes the `finance`
 * payment entry, recalculates the member's outstanding balance, and writes
 * the audit log — the exact mechanic `recordPayment` and `recordBulkPayments`
 * both need, so a fix here reaches every caller.
 */
export const applyChargePayment = async (
  input: ApplyChargePaymentInput,
): Promise<ApplyChargePaymentResult> => {
  const {
    transaction,
    orgId,
    memberId,
    memberRef,
    candidateChargeRefs,
    chargeEntryId,
    amount,
    note,
    source,
    actorUid,
    actorRole,
  } = input;

  const [member, ...chargeSnapshots] = await Promise.all([
    transaction.get(memberRef),
    ...candidateChargeRefs.map((ref) => transaction.get(ref)),
  ]);
  if (!member.exists) {
    throw new HttpsError("not-found", "One or more members could not be found.");
  }
  if (member.data()?.orgId !== orgId) {
    throw new HttpsError(
      "permission-denied",
      "This record does not belong to your organisation.",
    );
  }

  const charges = chargeSnapshots
    .flatMap((snapshot) => {
      const record = snapshot.data() ?? {};
      return record.orgId === orgId ? [{ record, snapshot }] : [];
    })
    .sort((left, right) => {
      const leftMillis = millisFromDateValue(left.record.dueDate);
      const rightMillis = millisFromDateValue(right.record.dueDate);
      return leftMillis - rightMillis;
    });
  const selectedCharge = charges.find(({ record, snapshot }) => {
    return snapshot.id === chargeEntryId || record.entryId === chargeEntryId;
  });
  if (!selectedCharge) {
    throw new HttpsError(
      "failed-precondition",
      "Selected charge is not open for this member.",
    );
  }
  const selectedPaidBefore =
    typeof selectedCharge.record.amountPaid === "number"
      ? selectedCharge.record.amountPaid
      : 0;
  const selectedAmount =
    typeof selectedCharge.record.amount === "number"
      ? selectedCharge.record.amount
      : 0;
  const selectedOwedBefore = Math.max(0, selectedAmount - selectedPaidBefore);
  if (amount > selectedOwedBefore) {
    throw new HttpsError(
      "invalid-argument",
      "Payment amount cannot exceed the selected charge balance.",
    );
  }

  const amountPaid = selectedPaidBefore + amount;
  const paidStatus = paidStatusFor(selectedAmount, amountPaid);

  // Transactions require all reads before writes, so resolve the dues
  // period state (for auto-settling) before the first update below.
  const duesPeriodId =
    paidStatus === "paid" && typeof selectedCharge.record.duesPeriodId === "string"
      ? selectedCharge.record.duesPeriodId
      : null;
  let settledPeriod = false;
  let periodRef: FirebaseFirestore.DocumentReference | null = null;
  if (duesPeriodId) {
    periodRef = db.collection("finance_periods").doc(duesPeriodId);
    const periodSnapshot = await transaction.get(periodRef);
    const period = periodSnapshot.data() ?? {};
    const paidCount =
      (typeof period.paidCount === "number" ? period.paidCount : 0) + 1;
    const totalMembers =
      typeof period.totalMembers === "number" ? period.totalMembers : 0;
    settledPeriod =
      periodSnapshot.exists &&
      period.status !== "settled" &&
      totalMembers > 0 &&
      paidCount >= totalMembers;
  }

  transaction.update(selectedCharge.snapshot.ref, {
    amountPaid,
    paidStatus,
  });
  if (periodRef) {
    transaction.update(periodRef, {
      paidCount: FieldValue.increment(1),
      ...(settledPeriod
        ? { status: "settled", settledAt: FieldValue.serverTimestamp() }
        : {}),
    });
  }
  if (settledPeriod && periodRef) {
    transaction.set(db.collection("audit_logs").doc(), {
      action: "finance_period.settled",
      actorUid,
      actorRole,
      orgId,
      targetPath: periodRef.path,
      details: { periodId: duesPeriodId, settledByPaymentFor: memberId },
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  const paymentRef = db.collection("finance").doc();
  transaction.set(paymentRef, {
    entryId: paymentRef.id,
    orgId,
    memberId,
    type: "payment",
    label: source.paymentMethod,
    amount,
    amountPaid: amount,
    dueDate: null,
    paidStatus: "paid",
    paymentMethod: source.paymentMethod,
    reference: source.reference || null,
    appliedChargeId: chargeEntryId,
    appliedChargeLabel: selectedCharge.record.label,
    note,
    recordedBy: actorUid,
    createdAt: FieldValue.serverTimestamp(),
    paidAt: FieldValue.serverTimestamp(),
    ...(source.kind === "gateway"
      ? { paymentIntentId: source.paymentIntentId, provider: source.provider }
      : {}),
  });
  transaction.update(
    memberRef,
    recalculateMemberFinance(
      chargeSnapshots,
      { amountPaid, refPath: selectedCharge.snapshot.ref.path },
    ),
  );
  transaction.set(db.collection("audit_logs").doc(), {
    action: "finance_payment.recorded",
    actorUid,
    actorRole,
    orgId,
    targetPath: paymentRef.path,
    details: { amount, chargeEntryId, paymentId: paymentRef.id, uid: memberId },
    createdAt: FieldValue.serverTimestamp(),
  });

  return {
    paymentId: paymentRef.id,
    paidStatus,
    settledPeriodId: settledPeriod ? duesPeriodId : null,
  };
};
