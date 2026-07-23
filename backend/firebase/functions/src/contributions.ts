import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  formatNotificationCurrency,
  publishOrgAnnouncement,
} from "./activityNotifications";
import { assertSameOrg, requireActiveUser } from "./authz";
import { db } from "./firebase";
import { AuthenticatedUser } from "./types";
import { stringField } from "./validation";

type WithdrawStatus = "pending" | "approved" | "rejected" | "paid";
type PoolStatus = "active" | "closed";
type ContributionEntryType = "contribution" | "payout";

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

const optionalPositiveAmountField = (data: unknown, field: string): number => {
  const value = recordFromData(data)[field];
  if (value === undefined || value === null || value === "" || value === 0) {
    return 0;
  }
  return positiveAmountField(data, field);
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
    throw new HttpsError("invalid-argument", 'Field "memberIds" must be an array.');
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

const assertMemberInOrg = (
  user: AuthenticatedUser,
  memberSnapshot: FirebaseFirestore.DocumentSnapshot,
) => {
  if (!memberSnapshot.exists) {
    throw new HttpsError("not-found", "One or more members could not be found.");
  }
  assertSameOrg(user, memberSnapshot.data()?.orgId);
};

const actorFields = (user: AuthenticatedUser) => ({
  recordedBy: user.uid,
  recordedByName: user.profile.fullName,
  recordedByEmail: user.profile.email,
  recordedByPhone: user.profile.phone,
});

const creatorFields = (user: AuthenticatedUser) => ({
  createdBy: user.uid,
  createdByName: user.profile.fullName,
  createdByEmail: user.profile.email,
  createdByPhone: user.profile.phone,
});

const getActivePool = async (orgId: string, poolId?: string) => {
  if (poolId) {
    const snapshot = await db.collection("contribution_pools").doc(poolId).get();
    if (!snapshot.exists) {
      throw new HttpsError("not-found", "Contribution pool not found.");
    }
    const data = snapshot.data() ?? {};
    if (data.orgId !== orgId) {
      throw new HttpsError(
        "permission-denied",
        "This record does not belong to your organisation.",
      );
    }
    return snapshot;
  }

  const pools = await db
    .collection("contribution_pools")
    .where("orgId", "==", orgId)
    .where("status", "==", "active")
    .limit(2)
    .get();
  if (pools.empty) {
    throw new HttpsError(
      "failed-precondition",
      "Create an active contribution pool before recording contributions.",
    );
  }
  if (pools.size > 1) {
    throw new HttpsError(
      "failed-precondition",
      "Multiple active contribution pools found. Close extras before continuing.",
    );
  }
  return pools.docs[0];
};

const memberAvailableBalance = async (
  orgId: string,
  memberId: string,
  poolId: string,
): Promise<number> => {
  const [entriesSnap, requestsSnap] = await Promise.all([
    db
      .collection("contributions")
      .where("orgId", "==", orgId)
      .where("memberId", "==", memberId)
      .where("poolId", "==", poolId)
      .get(),
    db
      .collection("contribution_withdraw_requests")
      .where("orgId", "==", orgId)
      .where("memberId", "==", memberId)
      .where("poolId", "==", poolId)
      .get(),
  ]);

  let contributed = 0;
  let withdrawn = 0;
  entriesSnap.docs.forEach((doc) => {
    const data = doc.data();
    const amount = typeof data.amount === "number" ? data.amount : 0;
    if (data.type === "contribution") {
      contributed += amount;
    } else if (data.type === "payout") {
      withdrawn += amount;
    }
  });

  let held = 0;
  requestsSnap.docs.forEach((doc) => {
    const data = doc.data();
    const amount = typeof data.amount === "number" ? data.amount : 0;
    const status = data.status as WithdrawStatus;
    if (status === "pending" || status === "approved") {
      held += amount;
    }
  });

  return Math.max(0, contributed - withdrawn - held);
};

export const createContributionPool = onCall(async (request) => {
  const user = await requireActiveUser(request, ["admin"]);
  const name = stringField(request.data, "name", { maxLength: 120 });
  const expectedAmount = optionalPositiveAmountField(request.data, "expectedAmount");
  const endDate = optionalDateField(request.data, "endDate");
  const note = optionalStringField(request.data, "note", { maxLength: 500 });

  const activePools = await db
    .collection("contribution_pools")
    .where("orgId", "==", user.profile.orgId)
    .where("status", "==", "active")
    .limit(1)
    .get();
  if (!activePools.empty) {
    throw new HttpsError(
      "failed-precondition",
      "Close the current contribution pool before creating a new one.",
    );
  }

  const poolRef = db.collection("contribution_pools").doc();
  const status: PoolStatus = "active";
  await poolRef.set({
    poolId: poolRef.id,
    orgId: user.profile.orgId,
    label: name,
    expectedAmount,
    endDate,
    note,
    status,
    totalContributed: 0,
    totalWithdrawn: 0,
    contributorCount: 0,
    ...creatorFields(user),
    createdAt: FieldValue.serverTimestamp(),
  });

  await db.collection("audit_logs").doc().set({
    action: "contribution_pool.created",
    actorUid: user.uid,
    actorRole: user.profile.role,
    orgId: user.profile.orgId,
    targetPath: poolRef.path,
    details: { poolId: poolRef.id, name, expectedAmount },
    createdAt: FieldValue.serverTimestamp(),
  });

  await publishOrgAnnouncement({
    orgId: user.profile.orgId,
    type: "finance",
    title: "New contribution pool",
    body: `${name} is open for contributions.`,
    relatedDocId: poolRef.id,
    sentBy: user.uid,
    target: { route: "my_contributions" },
    audit: {
      action: "contribution_pool.announced",
      actorUid: user.uid,
      actorRole: user.profile.role,
      details: { poolId: poolRef.id },
    },
  });

  return { ok: true, poolId: poolRef.id };
});

export const closeContributionPool = onCall(async (request) => {
  const user = await requireActiveUser(request, ["admin"]);
  const poolId = stringField(request.data, "poolId", { maxLength: 160 });
  const poolRef = db.collection("contribution_pools").doc(poolId);

  const snapshot = await poolRef.get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "Contribution pool not found.");
  }
  const data = snapshot.data() ?? {};
  assertSameOrg(user, data.orgId);
  if (data.status !== "active") {
    throw new HttpsError("failed-precondition", "Only active pools can be closed.");
  }

  const pending = await db
    .collection("contribution_withdraw_requests")
    .where("orgId", "==", user.profile.orgId)
    .where("poolId", "==", poolId)
    .where("status", "in", ["pending", "approved"])
    .limit(1)
    .get();
  if (!pending.empty) {
    throw new HttpsError(
      "failed-precondition",
      "Resolve pending or approved withdrawal requests before closing the pool.",
    );
  }

  await poolRef.update({
    status: "closed" satisfies PoolStatus,
    closedAt: FieldValue.serverTimestamp(),
    closedBy: user.uid,
  });
  await db.collection("audit_logs").doc().set({
    action: "contribution_pool.closed",
    actorUid: user.uid,
    actorRole: user.profile.role,
    orgId: user.profile.orgId,
    targetPath: poolRef.path,
    details: { poolId },
    createdAt: FieldValue.serverTimestamp(),
  });

  return { ok: true, poolId };
});

const writeContributionEntry = async ({
  user,
  memberId,
  amount,
  paymentMethod,
  reference,
  note,
  poolSnap,
}: {
  user: AuthenticatedUser;
  memberId: string;
  amount: number;
  paymentMethod: string;
  reference: string;
  note: string;
  poolSnap: FirebaseFirestore.DocumentSnapshot;
}) => {
  const poolData = poolSnap.data() ?? {};
  if (poolData.status !== "active") {
    throw new HttpsError(
      "failed-precondition",
      "Contributions can only be recorded against an active pool.",
    );
  }

  const existingForMember = await db
    .collection("contributions")
    .where("orgId", "==", user.profile.orgId)
    .where("memberId", "==", memberId)
    .where("poolId", "==", poolSnap.id)
    .where("type", "==", "contribution")
    .limit(1)
    .get();
  const isFirstContribution = existingForMember.empty;

  const entryRef = db.collection("contributions").doc();
  const entryType: ContributionEntryType = "contribution";
  const label = `${poolData.label ?? "Contribution"}`;

  await db.runTransaction(async (transaction) => {
    transaction.set(entryRef, {
      entryId: entryRef.id,
      orgId: user.profile.orgId,
      memberId,
      poolId: poolSnap.id,
      type: entryType,
      label,
      amount,
      paymentMethod,
      reference: reference || null,
      note,
      ...actorFields(user),
      createdAt: FieldValue.serverTimestamp(),
      paidAt: FieldValue.serverTimestamp(),
    });
    transaction.update(poolSnap.ref, {
      totalContributed: FieldValue.increment(amount),
      ...(isFirstContribution
        ? { contributorCount: FieldValue.increment(1) }
        : {}),
    });
    transaction.set(db.collection("audit_logs").doc(), {
      action: "contribution.recorded",
      actorUid: user.uid,
      actorRole: user.profile.role,
      orgId: user.profile.orgId,
      targetPath: entryRef.path,
      details: {
        entryId: entryRef.id,
        memberId,
        poolId: poolSnap.id,
        amount,
      },
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return { entryId: entryRef.id, poolId: poolSnap.id };
};

export const recordContribution = onCall(async (request) => {
  const user = await requireActiveUser(request, ["admin"]);
  const memberId = stringField(request.data, "memberId", { maxLength: 160 });
  const amount = positiveAmountField(request.data, "amount");
  const paymentMethod = stringField(request.data, "paymentMethod", {
    maxLength: 120,
  });
  const reference = optionalStringField(request.data, "reference", {
    maxLength: 160,
  });
  const note = optionalStringField(request.data, "note", { maxLength: 500 });
  const poolIdInput = optionalStringField(request.data, "poolId", {
    maxLength: 160,
  });

  const memberSnap = await db.collection("users").doc(memberId).get();
  assertMemberInOrg(user, memberSnap);
  const poolSnap = await getActivePool(
    user.profile.orgId,
    poolIdInput || undefined,
  );
  const result = await writeContributionEntry({
    user,
    memberId,
    amount,
    paymentMethod,
    reference,
    note,
    poolSnap,
  });

  return { ok: true, ...result };
});

export const recordBulkContributions = onCall(async (request) => {
  const user = await requireActiveUser(request, ["admin"]);
  const memberIds = memberIdsField(request.data);
  if (memberIds.length > 50) {
    throw new HttpsError(
      "invalid-argument",
      "Bulk contributions are limited to 50 members at a time.",
    );
  }
  const amount = positiveAmountField(request.data, "amount");
  const paymentMethod = stringField(request.data, "paymentMethod", {
    maxLength: 120,
  });
  const reference = optionalStringField(request.data, "reference", {
    maxLength: 160,
  });
  const note = optionalStringField(request.data, "note", { maxLength: 500 });
  const poolIdInput = optionalStringField(request.data, "poolId", {
    maxLength: 160,
  });

  const poolSnap = await getActivePool(
    user.profile.orgId,
    poolIdInput || undefined,
  );

  const memberSnaps = await Promise.all(
    memberIds.map((memberId) => db.collection("users").doc(memberId).get()),
  );
  memberSnaps.forEach((snap) => assertMemberInOrg(user, snap));

  const results: { entryId: string; memberId: string; ok: boolean }[] = [];
  for (const memberId of memberIds) {
    const result = await writeContributionEntry({
      user,
      memberId,
      amount,
      paymentMethod,
      reference,
      note,
      poolSnap,
    });
    results.push({
      ok: true,
      memberId,
      entryId: result.entryId,
    });
  }

  return { ok: true, count: results.length, results };
});

export const requestContributionWithdrawal = onCall(async (request) => {
  const user = await requireActiveUser(request);
  const amount = positiveAmountField(request.data, "amount");
  const reason = optionalStringField(request.data, "reason", { maxLength: 500 });
  const poolIdInput = optionalStringField(request.data, "poolId", {
    maxLength: 160,
  });

  const poolSnap = await getActivePool(
    user.profile.orgId,
    poolIdInput || undefined,
  );
  if ((poolSnap.data() ?? {}).status !== "active") {
    throw new HttpsError(
      "failed-precondition",
      "Withdrawals can only be requested from an active pool.",
    );
  }

  const openRequests = await db
    .collection("contribution_withdraw_requests")
    .where("orgId", "==", user.profile.orgId)
    .where("memberId", "==", user.uid)
    .where("poolId", "==", poolSnap.id)
    .where("status", "in", ["pending", "approved"])
    .limit(1)
    .get();
  if (!openRequests.empty) {
    throw new HttpsError(
      "failed-precondition",
      "You already have an open withdrawal request.",
    );
  }

  const available = await memberAvailableBalance(
    user.profile.orgId,
    user.uid,
    poolSnap.id,
  );
  if (amount > available) {
    throw new HttpsError(
      "failed-precondition",
      `Requested amount exceeds your available balance of ${formatNotificationCurrency(available)}.`,
    );
  }

  const requestRef = db.collection("contribution_withdraw_requests").doc();
  const status: WithdrawStatus = "pending";
  await requestRef.set({
    requestId: requestRef.id,
    orgId: user.profile.orgId,
    memberId: user.uid,
    memberName: user.profile.fullName,
    poolId: poolSnap.id,
    amount,
    reason,
    status,
    createdAt: FieldValue.serverTimestamp(),
  });

  await db.collection("audit_logs").doc().set({
    action: "contribution_withdrawal.requested",
    actorUid: user.uid,
    actorRole: user.profile.role,
    orgId: user.profile.orgId,
    targetPath: requestRef.path,
    details: {
      requestId: requestRef.id,
      poolId: poolSnap.id,
      amount,
    },
    createdAt: FieldValue.serverTimestamp(),
  });

  return { ok: true, requestId: requestRef.id };
});

export const reviewContributionWithdrawal = onCall(async (request) => {
  const user = await requireActiveUser(request, ["admin"]);
  const requestId = stringField(request.data, "requestId", { maxLength: 160 });
  const decision = stringField(request.data, "decision", { maxLength: 40 });
  if (decision !== "approve" && decision !== "reject") {
    throw new HttpsError(
      "invalid-argument",
      'Decision must be "approve" or "reject".',
    );
  }
  const reviewNote = optionalStringField(request.data, "reviewNote", {
    maxLength: 500,
  });

  const requestRef = db.collection("contribution_withdraw_requests").doc(requestId);
  const nextStatus: WithdrawStatus =
    decision === "approve" ? "approved" : "rejected";

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(requestRef);
    if (!snapshot.exists) {
      throw new HttpsError("not-found", "Withdrawal request not found.");
    }
    const data = snapshot.data() ?? {};
    assertSameOrg(user, data.orgId);
    if (data.status !== "pending") {
      throw new HttpsError(
        "failed-precondition",
        "Only pending withdrawal requests can be reviewed.",
      );
    }
    transaction.update(requestRef, {
      status: nextStatus,
      reviewNote,
      reviewedAt: FieldValue.serverTimestamp(),
      reviewedBy: user.uid,
      reviewedByName: user.profile.fullName,
    });
    transaction.set(db.collection("audit_logs").doc(), {
      action:
        decision === "approve"
          ? "contribution_withdrawal.approved"
          : "contribution_withdrawal.rejected",
      actorUid: user.uid,
      actorRole: user.profile.role,
      orgId: user.profile.orgId,
      targetPath: requestRef.path,
      details: { requestId, decision, reviewNote },
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return { ok: true, requestId, status: nextStatus };
});

export const recordContributionPayout = onCall(async (request) => {
  const user = await requireActiveUser(request, ["admin"]);
  const requestId = stringField(request.data, "requestId", { maxLength: 160 });
  const paymentMethod = stringField(request.data, "paymentMethod", {
    maxLength: 120,
  });
  const reference = optionalStringField(request.data, "reference", {
    maxLength: 160,
  });
  const note = optionalStringField(request.data, "note", { maxLength: 500 });

  const requestRef = db.collection("contribution_withdraw_requests").doc(requestId);
  const payoutRef = db.collection("contributions").doc();

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(requestRef);
    if (!snapshot.exists) {
      throw new HttpsError("not-found", "Withdrawal request not found.");
    }
    const data = snapshot.data() ?? {};
    assertSameOrg(user, data.orgId);
    if (data.status !== "approved") {
      throw new HttpsError(
        "failed-precondition",
        "Approve the withdrawal request before recording a payout.",
      );
    }

    const poolRef = db.collection("contribution_pools").doc(String(data.poolId));
    const poolSnap = await transaction.get(poolRef);
    if (!poolSnap.exists) {
      throw new HttpsError("not-found", "Contribution pool not found.");
    }
    assertSameOrg(user, poolSnap.data()?.orgId);

    const amount = typeof data.amount === "number" ? data.amount : 0;
    if (amount <= 0) {
      throw new HttpsError("failed-precondition", "Withdrawal amount is invalid.");
    }

    const entryType: ContributionEntryType = "payout";
    transaction.set(payoutRef, {
      entryId: payoutRef.id,
      orgId: user.profile.orgId,
      memberId: data.memberId,
      poolId: data.poolId,
      type: entryType,
      label: "Withdrawal payout",
      amount,
      paymentMethod,
      reference: reference || null,
      note,
      withdrawRequestId: requestId,
      ...actorFields(user),
      createdAt: FieldValue.serverTimestamp(),
      paidAt: FieldValue.serverTimestamp(),
    });
    transaction.update(requestRef, {
      status: "paid" satisfies WithdrawStatus,
      paidAt: FieldValue.serverTimestamp(),
      payoutEntryId: payoutRef.id,
      paidBy: user.uid,
    });
    transaction.update(poolRef, {
      totalWithdrawn: FieldValue.increment(amount),
    });
    transaction.set(db.collection("audit_logs").doc(), {
      action: "contribution_payout.recorded",
      actorUid: user.uid,
      actorRole: user.profile.role,
      orgId: user.profile.orgId,
      targetPath: payoutRef.path,
      details: {
        requestId,
        payoutEntryId: payoutRef.id,
        memberId: data.memberId,
        amount,
      },
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return { ok: true, requestId, payoutEntryId: payoutRef.id };
});
