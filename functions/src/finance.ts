import { FieldValue } from "firebase-admin/firestore";
import { CallableRequest, HttpsError, onCall } from "firebase-functions/v2/https";
import { assertSameOrg, requireActiveUser } from "./authz";
import { db } from "./firebase";
import { AuthenticatedUser } from "./types";
import { stringField } from "./validation";

type LedgerType = "dues" | "levy" | "fine" | "pledge" | "payment";
type PaidStatus = "unpaid" | "partial" | "paid";

const chargeTypes: LedgerType[] = ["dues", "levy", "fine", "pledge"];

const recordFromData = (data: unknown): Record<string, unknown> =>
  data && typeof data === "object" ? (data as Record<string, unknown>) : {};

const numberField = (data: unknown, field: string): number => {
  const value = recordFromData(data)[field];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new HttpsError("invalid-argument", `Field "${field}" must be a number.`);
  }
  return value;
};

const positiveAmountField = (data: unknown, field: string): number => {
  const amount = numberField(data, field);
  if (amount <= 0) {
    throw new HttpsError("invalid-argument", `Field "${field}" must be greater than zero.`);
  }
  return amount;
};

const optionalStringField = (
  data: unknown,
  field: string,
  options: { maxLength?: number } = {},
): string => stringField(data, field, { ...options, required: false });

const dateField = (data: unknown, field: string): Date => {
  const value = stringField(data, field, { maxLength: 80 });
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new HttpsError("invalid-argument", `Field "${field}" must be a valid date.`);
  }
  return date;
};

const optionalDateField = (data: unknown, field: string): Date | null => {
  const value = optionalStringField(data, field, { maxLength: 80 });
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new HttpsError("invalid-argument", `Field "${field}" must be a valid date.`);
  }
  return date;
};

const memberIdsField = (data: unknown): string[] => {
  const value = recordFromData(data).memberIds;
  if (!Array.isArray(value)) {
    throw new HttpsError("invalid-argument", "Field \"memberIds\" must be an array.");
  }
  const memberIds = [
    ...new Set(
      value.map((memberId) =>
        typeof memberId === "string" ? memberId.trim() : "",
      ),
    ),
  ].filter(Boolean);
  if (memberIds.length === 0) {
    throw new HttpsError("invalid-argument", "Select at least one member.");
  }
  return memberIds;
};

const chargeTypeField = (data: unknown): LedgerType => {
  const type = stringField(data, "type", { maxLength: 40 }) as LedgerType;
  if (!chargeTypes.includes(type)) {
    throw new HttpsError("invalid-argument", "Charge type is invalid.");
  }
  return type;
};

const paidStatusFor = (amount: number, amountPaid: number): PaidStatus => {
  if (amountPaid <= 0) {
    return "unpaid";
  }
  return amountPaid >= amount ? "paid" : "partial";
};

const millisFromDateValue = (value: unknown): number => {
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

const assertMemberInOrg = (
  user: AuthenticatedUser,
  memberSnapshot: FirebaseFirestore.DocumentSnapshot,
) => {
  if (!memberSnapshot.exists) {
    throw new HttpsError("not-found", "One or more members could not be found.");
  }
  assertSameOrg(user, memberSnapshot.data()?.orgId);
};

const commitMemberChargeBatches = async (
  user: AuthenticatedUser,
  members: FirebaseFirestore.DocumentSnapshot[],
  buildEntry: (member: FirebaseFirestore.DocumentSnapshot) => Record<string, unknown>,
  balanceIncrement: number,
  markOverdue: boolean,
  audit: Record<string, unknown>,
  writeFirstBatch?: (batch: FirebaseFirestore.WriteBatch) => void,
) => {
  const chunkSize = 240;
  for (let index = 0; index < members.length; index += chunkSize) {
    const chunk = members.slice(index, index + chunkSize);
    const batch = db.batch();
    if (index === 0) {
      writeFirstBatch?.(batch);
    }
    chunk.forEach((member) => {
      const entryRef = db.collection("finance").doc();
      batch.set(entryRef, {
        entryId: entryRef.id,
        orgId: user.profile.orgId,
        memberId: member.id,
        ...buildEntry(member),
      });
      batch.update(member.ref, {
        outstandingBalance: FieldValue.increment(balanceIncrement),
        ...(markOverdue ? { financialStatus: "red" } : {}),
      });
    });
    if (index === 0) {
      batch.set(db.collection("audit_logs").doc(), {
        ...audit,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  }
};

export const createFinancePeriod = onCall(async (request) => {
  const user = await requireActiveUser(request, ["admin"]);
  const name = stringField(request.data, "name", { maxLength: 120 });
  const amount = positiveAmountField(request.data, "amount");
  const dueDate = dateField(request.data, "dueDate");
  const status = stringField(request.data, "status", { maxLength: 40 });
  if (status !== "active") {
    throw new HttpsError("invalid-argument", "New dues periods must start as active.");
  }

  const periods = await db
    .collection("finance_periods")
    .where("orgId", "==", user.profile.orgId)
    .get();
  const duplicatePeriod = periods.docs.some((period) => {
    const record = period.data();
    return (
      record.label === name &&
      millisFromDateValue(record.dueDate) === dueDate.getTime()
    );
  });
  if (duplicatePeriod) {
    throw new HttpsError(
      "already-exists",
      "A dues period with this name and due date already exists.",
    );
  }

  const members = await db
    .collection("users")
    .where("orgId", "==", user.profile.orgId)
    .where("status", "==", "active")
    .get();
  if (members.empty) {
    throw new HttpsError("failed-precondition", "No active members are available for this dues period.");
  }

  const periodRef = db.collection("finance_periods").doc();
  await commitMemberChargeBatches(
    user,
    members.docs,
    () => ({
      type: "dues",
      duesPeriodId: periodRef.id,
      label: name,
      amount,
      amountPaid: 0,
      dueDate,
      paidStatus: "unpaid",
      paymentMethod: null,
      reference: null,
      note: "",
      recordedBy: user.uid,
      createdAt: FieldValue.serverTimestamp(),
    }),
    amount,
    dueDate.getTime() < Date.now(),
    {
      action: "finance_period.created",
      actorUid: user.uid,
      actorRole: user.profile.role,
      orgId: user.profile.orgId,
      targetPath: periodRef.path,
      details: { amount, memberCount: members.size, periodId: periodRef.id },
    },
    (batch) => {
      batch.set(periodRef, {
        periodId: periodRef.id,
        orgId: user.profile.orgId,
        label: name,
        amount,
        dueDate,
        status,
        totalMembers: members.size,
        paidCount: 0,
        createdAt: FieldValue.serverTimestamp(),
      });
    },
  );

  return { ok: true, periodId: periodRef.id, chargedMembers: members.size };
});

export const createAdHocCharges = onCall(async (request) => {
  const user = await requireActiveUser(request, ["admin"]);
  const memberIds = memberIdsField(request.data);
  const type = chargeTypeField(request.data);
  const label = stringField(request.data, "label", { maxLength: 140 });
  const amount = positiveAmountField(request.data, "amount");
  const dueDate = optionalDateField(request.data, "dueDate");
  const note = optionalStringField(request.data, "note", { maxLength: 500 });

  const memberSnapshots = await Promise.all(
    memberIds.map((memberId) => db.collection("users").doc(memberId).get()),
  );
  memberSnapshots.forEach((member) => assertMemberInOrg(user, member));

  await commitMemberChargeBatches(
    user,
    memberSnapshots,
    () => ({
      type,
      label,
      amount,
      amountPaid: 0,
      dueDate,
      paidStatus: "unpaid",
      paymentMethod: null,
      reference: null,
      note,
      recordedBy: user.uid,
      createdAt: FieldValue.serverTimestamp(),
    }),
    amount,
    dueDate ? dueDate.getTime() < Date.now() : false,
    {
      action: "finance_charge.created",
      actorUid: user.uid,
      actorRole: user.profile.role,
      orgId: user.profile.orgId,
      targetPath: "finance",
      details: { amount, memberCount: memberIds.length, type },
    },
  );

  return { ok: true, chargedMembers: memberIds.length };
});

const recalculateMemberFinance = (
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

export const recordPayment = onCall(async (request) => {
  const user = await requireActiveUser(request, ["admin"]);
  const uid = stringField(request.data, "uid", { maxLength: 160 });
  const chargeEntryId = stringField(request.data, "chargeEntryId", {
    maxLength: 160,
  });
  const amount = positiveAmountField(request.data, "amount");
  const paymentMethod = stringField(request.data, "paymentMethod", {
    maxLength: 100,
  });
  const reference = optionalStringField(request.data, "reference", {
    maxLength: 160,
  });
  const note = optionalStringField(request.data, "note", { maxLength: 500 });
  const memberRef = db.collection("users").doc(uid);
  const unpaidSnapshot = await db
    .collection("finance")
    .where("orgId", "==", user.profile.orgId)
    .where("memberId", "==", uid)
    .where("paidStatus", "in", ["unpaid", "partial"])
    .get();

  let paymentId = "";
  await db.runTransaction(async (transaction) => {
    const [member, ...chargeSnapshots] = await Promise.all([
      transaction.get(memberRef),
      ...unpaidSnapshot.docs.map((entry) => transaction.get(entry.ref)),
    ]);
    assertMemberInOrg(user, member);
    const charges = chargeSnapshots
      .flatMap((snapshot) => {
        const record = snapshot.data() ?? {};
        return record.orgId === user.profile.orgId ? [{ record, snapshot }] : [];
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
    transaction.update(selectedCharge.snapshot.ref, {
      amountPaid,
      paidStatus,
    });
    if (paidStatus === "paid" && typeof selectedCharge.record.duesPeriodId === "string") {
      transaction.update(
        db.collection("finance_periods").doc(selectedCharge.record.duesPeriodId),
        { paidCount: FieldValue.increment(1) },
      );
    }

    const paymentRef = db.collection("finance").doc();
    paymentId = paymentRef.id;
    transaction.set(paymentRef, {
      entryId: paymentRef.id,
      orgId: user.profile.orgId,
      memberId: uid,
      type: "payment",
      label: paymentMethod,
      amount,
      amountPaid: amount,
      dueDate: null,
      paidStatus: "paid",
      paymentMethod,
      reference: reference || null,
      appliedChargeId: chargeEntryId,
      appliedChargeLabel: selectedCharge.record.label,
      note,
      recordedBy: user.uid,
      createdAt: FieldValue.serverTimestamp(),
      paidAt: FieldValue.serverTimestamp(),
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
      actorUid: user.uid,
      actorRole: user.profile.role,
      orgId: user.profile.orgId,
      targetPath: paymentRef.path,
      details: { amount, chargeEntryId, paymentId: paymentRef.id, uid },
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return { ok: true, paymentId };
});

export const reversePayment = onCall(async (request: CallableRequest<unknown>) => {
  const user = await requireActiveUser(request, ["admin"]);
  const paymentId = stringField(request.data, "paymentId", { maxLength: 160 });
  const note = optionalStringField(request.data, "note", { maxLength: 500 });
  const paymentRef = db.collection("finance").doc(paymentId);
  const paymentSnapshot = await paymentRef.get();
  if (!paymentSnapshot.exists) {
    throw new HttpsError("not-found", "Payment not found.");
  }
  const payment = paymentSnapshot.data() ?? {};
  assertSameOrg(user, payment.orgId);
  if (payment.type !== "payment") {
    throw new HttpsError("failed-precondition", "Only payment entries can be reversed.");
  }
  if (payment.reversedAt) {
    throw new HttpsError("failed-precondition", "This payment has already been reversed.");
  }
  if (typeof payment.memberId !== "string" || typeof payment.appliedChargeId !== "string") {
    throw new HttpsError("failed-precondition", "Payment is missing its applied charge.");
  }
  const amount = typeof payment.amount === "number" ? payment.amount : 0;
  if (amount <= 0) {
    throw new HttpsError("failed-precondition", "Payment amount is invalid.");
  }

  const memberRef = db.collection("users").doc(payment.memberId);
  const chargesSnapshot = await db
    .collection("finance")
    .where("orgId", "==", user.profile.orgId)
    .where("memberId", "==", payment.memberId)
    .get();
  const chargeCandidates = chargesSnapshot.docs.filter((charge) => {
    const record = charge.data();
    return record.type !== "payment";
  });

  await db.runTransaction(async (transaction) => {
    const [member, freshPayment, ...chargeSnapshots] = await Promise.all([
      transaction.get(memberRef),
      transaction.get(paymentRef),
      ...chargeCandidates.map((charge) => transaction.get(charge.ref)),
    ]);
    assertMemberInOrg(user, member);
    const latestPayment = freshPayment.data() ?? {};
    if (latestPayment.reversedAt) {
      throw new HttpsError("failed-precondition", "This payment has already been reversed.");
    }
    const selectedCharge = chargeSnapshots.find((snapshot) => {
      const record = snapshot.data() ?? {};
      return snapshot.id === payment.appliedChargeId || record.entryId === payment.appliedChargeId;
    });
    if (!selectedCharge) {
      throw new HttpsError("not-found", "Applied charge not found.");
    }
    const charge = selectedCharge.data() ?? {};
    assertSameOrg(user, charge.orgId);
    const chargeAmount = typeof charge.amount === "number" ? charge.amount : 0;
    const previousAmountPaid =
      typeof charge.amountPaid === "number" ? charge.amountPaid : 0;
    const amountPaid = Math.max(0, previousAmountPaid - amount);
    const paidStatus = paidStatusFor(chargeAmount, amountPaid);
    transaction.update(selectedCharge.ref, { amountPaid, paidStatus });
    if (
      previousAmountPaid >= chargeAmount &&
      paidStatus !== "paid" &&
      typeof charge.duesPeriodId === "string"
    ) {
      transaction.update(
        db.collection("finance_periods").doc(charge.duesPeriodId),
        { paidCount: FieldValue.increment(-1) },
      );
    }
    transaction.update(paymentRef, {
      reversedAt: FieldValue.serverTimestamp(),
      reversedBy: user.uid,
      reversalNote: note,
    });
    transaction.update(
      memberRef,
      recalculateMemberFinance(
        chargeSnapshots,
        { amountPaid, refPath: selectedCharge.ref.path },
      ),
    );
    transaction.set(db.collection("audit_logs").doc(), {
      action: "finance_payment.reversed",
      actorUid: user.uid,
      actorRole: user.profile.role,
      orgId: user.profile.orgId,
      targetPath: paymentRef.path,
      details: { amount, chargeEntryId: payment.appliedChargeId, paymentId },
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return { ok: true, paymentId };
});

export const recalculateMemberFinanceStanding = onCall(async (request) => {
  const user = await requireActiveUser(request, ["admin"]);
  const uid = stringField(request.data, "uid", { maxLength: 160 });
  const memberRef = db.collection("users").doc(uid);
  const chargesSnapshot = await db
    .collection("finance")
    .where("orgId", "==", user.profile.orgId)
    .where("memberId", "==", uid)
    .get();
  const chargeCandidates = chargesSnapshot.docs.filter((charge) => {
    const record = charge.data();
    return record.type !== "payment";
  });

  let financeStanding = {
    financialStatus: "green",
    outstandingBalance: 0,
  };

  await db.runTransaction(async (transaction) => {
    const [member, ...chargeSnapshots] = await Promise.all([
      transaction.get(memberRef),
      ...chargeCandidates.map((charge) => transaction.get(charge.ref)),
    ]);
    assertMemberInOrg(user, member);
    financeStanding = recalculateMemberFinance(chargeSnapshots);
    transaction.update(memberRef, financeStanding);
    transaction.set(db.collection("audit_logs").doc(), {
      action: "member_finance.recalculated",
      actorUid: user.uid,
      actorRole: user.profile.role,
      orgId: user.profile.orgId,
      targetPath: memberRef.path,
      details: {
        chargeCount: chargeSnapshots.length,
        financialStatus: financeStanding.financialStatus,
        outstandingBalance: financeStanding.outstandingBalance,
        uid,
      },
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return { ok: true, uid, ...financeStanding };
});
