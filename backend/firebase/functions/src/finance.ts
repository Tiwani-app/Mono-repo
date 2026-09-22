import { FieldValue } from "firebase-admin/firestore";
import { writeAuditLog } from "./audit";
import { CallableRequest, HttpsError, onCall } from "firebase-functions/v2/https";
import {
  formatNotificationCurrency,
  formatNotificationDate,
  publishOrgAnnouncement,
} from "./activityNotifications";
import { assertSameOrg, requireActiveUser } from "./authz";
import { db } from "./firebase";
import {
  applyChargePayment,
  millisFromDateValue,
  paidStatusFor,
  recalculateMemberFinance,
} from "./financeLedgerService";
import { getStripeClient, stripeSecretKey } from "./stripeClient";
import { AuthenticatedUser } from "./types";
import {
  stringField,
  optionalStringField,
  positiveAmountField,
  recordFromData,
} from "./validation";

type LedgerType =
  | "dues"
  | "levy"
  | "donation"
  | "fine"
  | "pledge"
  | "other"
  | "payment";

const chargeTypes: LedgerType[] = [
  "dues",
  "levy",
  "donation",
  "fine",
  "pledge",
  "other",
];

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
      recordedByName: user.profile.fullName,
      recordedByEmail: user.profile.email,
      recordedByPhone: user.profile.phone || null,
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
        createdBy: user.uid,
        createdByName: user.profile.fullName,
        createdByEmail: user.profile.email,
        createdByPhone: user.profile.phone || null,
        createdAt: FieldValue.serverTimestamp(),
      });
    },
  );

  await publishOrgAnnouncement({
    audit: {
      action: "finance_period.notification_sent",
      actorRole: user.profile.role,
      actorUid: user.uid,
      details: { memberCount: members.size, periodId: periodRef.id },
    },
    body: `${members.size} active members were charged ${formatNotificationCurrency(amount)}. Due ${formatNotificationDate(dueDate) ?? "soon"}.`,
    orgId: user.profile.orgId,
    relatedDocId: periodRef.id,
    sentBy: user.uid,
    target: { route: "my_ledger" },
    title: `New dues period: ${name}`,
    type: "finance",
  });

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
      recordedByName: user.profile.fullName,
      recordedByEmail: user.profile.email,
      recordedByPhone: user.profile.phone || null,
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

  await publishOrgAnnouncement({
    audit: {
      action: "finance_charge.notification_sent",
      actorRole: user.profile.role,
      actorUid: user.uid,
      details: { amount, memberCount: memberIds.length, type },
    },
    body: `${memberIds.length} member${memberIds.length === 1 ? "" : "s"} received a ${type} charge of ${formatNotificationCurrency(amount)}${dueDate ? `. Due ${formatNotificationDate(dueDate) ?? "soon"}.` : "."}`,
    orgId: user.profile.orgId,
    relatedDocId: null,
    sentBy: user.uid,
    target: { route: "my_ledger" },
    title: `New ${type} charge: ${label}`,
    type: "finance",
  });

  return { ok: true, chargedMembers: memberIds.length };
});

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

  const result = await db.runTransaction((transaction) =>
    applyChargePayment({
      transaction,
      orgId: user.profile.orgId,
      memberId: uid,
      memberRef,
      candidateChargeRefs: unpaidSnapshot.docs.map((entry) => entry.ref),
      chargeEntryId,
      amount,
      note,
      source: { kind: "admin_recorded", paymentMethod, reference },
      actorUid: user.uid,
      actorRole: user.profile.role,
    }),
  );

  return { ok: true, paymentId: result.paymentId };
});

export const recordBulkPayments = onCall(async (request) => {
  const user = await requireActiveUser(request, ["admin"]);
  const paymentsData = recordFromData(request.data).payments;
  if (!Array.isArray(paymentsData) || paymentsData.length === 0) {
    throw new HttpsError(
      "invalid-argument",
      "Field \"payments\" must be a non-empty array.",
    );
  }
  if (paymentsData.length > 50) {
    throw new HttpsError(
      "invalid-argument",
      "Cannot record more than 50 payments at once.",
    );
  }

  const results: { ok: boolean; paymentId: string; uid: string }[] = [];

  for (const item of paymentsData) {
    const uid = stringField(item, "uid", { maxLength: 160 });
    const chargeEntryId = stringField(item, "chargeEntryId", { maxLength: 160 });
    const amount = positiveAmountField(item, "amount");
    const paymentMethod = stringField(item, "paymentMethod", { maxLength: 100 });
    const reference = optionalStringField(item, "reference", { maxLength: 160 });
    const note = optionalStringField(item, "note", { maxLength: 500 });

    const memberRef = db.collection("users").doc(uid);
    const unpaidSnapshot = await db
      .collection("finance")
      .where("orgId", "==", user.profile.orgId)
      .where("memberId", "==", uid)
      .where("paidStatus", "in", ["unpaid", "partial"])
      .get();

    const result = await db.runTransaction((transaction) =>
      applyChargePayment({
        transaction,
        orgId: user.profile.orgId,
        memberId: uid,
        memberRef,
        candidateChargeRefs: unpaidSnapshot.docs.map((entry) => entry.ref),
        chargeEntryId,
        amount,
        note,
        source: { kind: "admin_recorded", paymentMethod, reference },
        actorUid: user.uid,
        actorRole: user.profile.role,
      }),
    );

    results.push({ ok: true, paymentId: result.paymentId, uid });
  }

  return { ok: true, count: results.length, results };
});

export const reversePayment = onCall(
  { secrets: [stripeSecretKey] },
  async (request: CallableRequest<unknown>) => {
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

  // Gateway-sourced payments (payment-feature.md Phase 1/3) must actually be
  // refunded at the provider before the ledger is reopened as unpaid —
  // otherwise the member keeps the charge on their card/statement while the
  // ledger says they owe again. Admin-recorded cash/bank-transfer payments
  // (no `reference`/`provider`) skip this entirely — zero behavior change.
  let refundId: string | null = null;
  if (payment.provider === "stripe" && typeof payment.reference === "string") {
    const stripe = getStripeClient();
    let refund;
    try {
      refund = await stripe.refunds.create({ payment_intent: payment.reference });
    } catch (error) {
      throw new HttpsError(
        "failed-precondition",
        `Stripe could not refund this payment: ${
          error instanceof Error ? error.message : "unknown error"
        }. The ledger was not changed.`,
      );
    }
    if (refund.status !== "succeeded") {
      throw new HttpsError(
        "failed-precondition",
        `Stripe refund did not complete (status: ${refund.status ?? "unknown"}). ` +
          "The ledger was not changed — check the Stripe Dashboard and try again.",
      );
    }
    refundId = refund.id;
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

    // Reads must precede writes: check whether the reversal reopens a
    // settled dues period before updating anything.
    const unsettlesPeriod =
      previousAmountPaid >= chargeAmount &&
      paidStatus !== "paid" &&
      typeof charge.duesPeriodId === "string";
    let reopenPeriod = false;
    let periodRef: FirebaseFirestore.DocumentReference | null = null;
    if (unsettlesPeriod) {
      periodRef = db
        .collection("finance_periods")
        .doc(charge.duesPeriodId as string);
      const periodSnapshot = await transaction.get(periodRef);
      reopenPeriod =
        periodSnapshot.exists && periodSnapshot.data()?.status === "settled";
    }

    transaction.update(selectedCharge.ref, { amountPaid, paidStatus });
    if (periodRef) {
      transaction.update(periodRef, {
        paidCount: FieldValue.increment(-1),
        ...(reopenPeriod
          ? { status: "active", settledAt: FieldValue.delete() }
          : {}),
      });
    }
    transaction.update(paymentRef, {
      reversedAt: FieldValue.serverTimestamp(),
      reversedBy: user.uid,
      reversalNote: note,
      ...(refundId ? { refundId } : {}),
    });
    transaction.update(
      memberRef,
      recalculateMemberFinance(
        chargeSnapshots,
        { amountPaid, refPath: selectedCharge.ref.path },
      ),
    );
    writeAuditLog(user, "finance_payment.reversed", paymentRef.path, {
        amount,
        chargeEntryId: payment.appliedChargeId,
        paymentId,
        ...(refundId ? { refundId, provider: "stripe" } : {}),
      }, transaction);
  });

  return { ok: true, paymentId, refunded: refundId !== null };
});

export const deleteFinanceCharge = onCall(async (request) => {
  const user = await requireActiveUser(request, ["admin"]);
  const chargeEntryId = stringField(request.data, "chargeEntryId", {
    maxLength: 160,
  });
  const chargeRef = db.collection("finance").doc(chargeEntryId);
  const chargeSnapshot = await chargeRef.get();
  if (!chargeSnapshot.exists) {
    throw new HttpsError("not-found", "Charge not found.");
  }
  const charge = chargeSnapshot.data() ?? {};
  assertSameOrg(user, charge.orgId);
  if (charge.type === "payment") {
    throw new HttpsError(
      "failed-precondition",
      "Payments cannot be deleted. Reverse the payment instead.",
    );
  }
  if (typeof charge.duesPeriodId === "string") {
    throw new HttpsError(
      "failed-precondition",
      "This charge belongs to a dues period. Delete the dues period instead.",
    );
  }
  const amountPaid = typeof charge.amountPaid === "number" ? charge.amountPaid : 0;
  if (amountPaid > 0) {
    throw new HttpsError(
      "failed-precondition",
      "Payments have been recorded against this charge. Reverse them before deleting it.",
    );
  }
  const memberId = typeof charge.memberId === "string" ? charge.memberId : "";
  const memberRef = memberId ? db.collection("users").doc(memberId) : null;
  const remainingCharges = memberId
    ? (
        await db
          .collection("finance")
          .where("orgId", "==", user.profile.orgId)
          .where("memberId", "==", memberId)
          .get()
      ).docs.filter(
        (entry) => entry.data().type !== "payment" && entry.id !== chargeRef.id,
      )
    : [];

  await db.runTransaction(async (transaction) => {
    const member = memberRef ? await transaction.get(memberRef) : null;
    const chargeSnapshots = await Promise.all(
      remainingCharges.map((entry) => transaction.get(entry.ref)),
    );
    transaction.delete(chargeRef);
    // Archived members keep their ledger but have no user doc to update.
    if (member?.exists && memberRef) {
      assertSameOrg(user, member.data()?.orgId);
      transaction.update(memberRef, recalculateMemberFinance(chargeSnapshots));
    }
    writeAuditLog(user, "finance_charge.deleted", chargeRef.path, {
        amount: typeof charge.amount === "number" ? charge.amount : 0,
        chargeEntryId,
        label: typeof charge.label === "string" ? charge.label : "",
        type: typeof charge.type === "string" ? charge.type : "",
        uid: memberId,
      }, transaction);
  });

  return { ok: true, chargeEntryId };
});

export const deleteFinancePeriod = onCall(async (request) => {
  const user = await requireActiveUser(request, ["admin"]);
  const periodId = stringField(request.data, "periodId", { maxLength: 160 });
  const periodRef = db.collection("finance_periods").doc(periodId);
  const periodSnapshot = await periodRef.get();
  if (!periodSnapshot.exists) {
    throw new HttpsError("not-found", "Dues period not found.");
  }
  assertSameOrg(user, periodSnapshot.data()?.orgId);

  const chargesSnapshot = await db
    .collection("finance")
    .where("orgId", "==", user.profile.orgId)
    .where("duesPeriodId", "==", periodId)
    .get();
  const hasPayments = chargesSnapshot.docs.some((entry) => {
    const record = entry.data();
    return typeof record.amountPaid === "number" && record.amountPaid > 0;
  });
  if (hasPayments) {
    throw new HttpsError(
      "failed-precondition",
      "Payments have been recorded against this dues period. Reverse them before deleting it.",
    );
  }

  const deletedChargeIds = new Set(chargesSnapshot.docs.map((entry) => entry.id));
  const memberIds = [
    ...new Set(
      chargesSnapshot.docs
        .map((entry) => entry.data().memberId)
        .filter((value): value is string => typeof value === "string"),
    ),
  ];
  // One org-wide read, then recompute each affected member's standing from
  // the charges that will remain after the period is removed.
  const allChargesSnapshot = await db
    .collection("finance")
    .where("orgId", "==", user.profile.orgId)
    .get();
  const remainingByMember = new Map<string, FirebaseFirestore.QueryDocumentSnapshot[]>();
  allChargesSnapshot.docs.forEach((entry) => {
    const record = entry.data();
    const entryMemberId =
      typeof record.memberId === "string" ? record.memberId : "";
    if (
      record.type === "payment" ||
      deletedChargeIds.has(entry.id) ||
      !memberIds.includes(entryMemberId)
    ) {
      return;
    }
    const existing = remainingByMember.get(entryMemberId) ?? [];
    existing.push(entry);
    remainingByMember.set(entryMemberId, existing);
  });
  const memberSnapshots = await Promise.all(
    memberIds.map((memberId) => db.collection("users").doc(memberId).get()),
  );

  const chunkSize = 200;
  const operations: ((batch: FirebaseFirestore.WriteBatch) => void)[] = [
    ...chargesSnapshot.docs.map(
      (entry) => (batch: FirebaseFirestore.WriteBatch) => batch.delete(entry.ref),
    ),
    ...memberSnapshots
      .filter((member) => member.exists)
      .map((member) => (batch: FirebaseFirestore.WriteBatch) => {
        batch.update(
          member.ref,
          recalculateMemberFinance(remainingByMember.get(member.id) ?? []),
        );
      }),
  ];
  for (let index = 0; index < operations.length; index += chunkSize) {
    const batch = db.batch();
    operations
      .slice(index, index + chunkSize)
      .forEach((operation) => operation(batch));
    if (index + chunkSize >= operations.length) {
      batch.delete(periodRef);
      writeAuditLog(user, "finance_period.deleted", periodRef.path, {
          chargeCount: chargesSnapshot.size,
          memberCount: memberIds.length,
          periodId,
        }, batch);
    }
    await batch.commit();
  }

  return { ok: true, periodId, deletedCharges: chargesSnapshot.size };
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
    writeAuditLog(user, "member_finance.recalculated", memberRef.path, {
        chargeCount: chargeSnapshots.length,
        financialStatus: financeStanding.financialStatus,
        outstandingBalance: financeStanding.outstandingBalance,
        uid,
      }, transaction);
  });

  return { ok: true, uid, ...financeStanding };
});
