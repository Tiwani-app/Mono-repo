import { FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { db } from "./firebase";

export type ContributionEntryType = "contribution" | "payout";

/**
 * Distinguishes an admin manually keying in a bank-transfer/cash
 * contribution from a payment gateway confirming one, per
 * payment-feature.md §5.1 — both land in the same `contributions` document
 * shape via `applyContributionEntry`.
 */
export type ContributionSource =
  | { kind: "admin_recorded"; paymentMethod: string; reference: string }
  | {
      kind: "gateway";
      provider: "stripe" | "paystack";
      paymentIntentId: string;
      paymentMethod: string;
      reference: string;
    };

export interface ApplyContributionEntryInput {
  orgId: string;
  memberId: string;
  amount: number;
  note: string;
  poolSnap: FirebaseFirestore.DocumentSnapshot;
  source: ContributionSource;
  actor: { uid: string; role: string; fullName: string; email: string; phone: string };
}

export interface ApplyContributionEntryResult {
  entryId: string;
  poolId: string;
}

/**
 * Records a contribution against an active pool: validates the pool is
 * open, writes the `contributions` entry, updates the pool's
 * `totalContributed`/`contributorCount` bookkeeping, and writes the audit
 * log — the exact mechanic `recordContribution` and `recordBulkContributions`
 * both need, so a fix here reaches every caller.
 */
export const applyContributionEntry = async (
  input: ApplyContributionEntryInput,
): Promise<ApplyContributionEntryResult> => {
  const { orgId, memberId, amount, note, poolSnap, source, actor } = input;
  const poolData = poolSnap.data() ?? {};
  if (poolData.status !== "active") {
    throw new HttpsError(
      "failed-precondition",
      "Contributions can only be recorded against an active pool.",
    );
  }

  const existingForMember = await db
    .collection("contributions")
    .where("orgId", "==", orgId)
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
      orgId,
      memberId,
      poolId: poolSnap.id,
      type: entryType,
      label,
      amount,
      paymentMethod: source.paymentMethod,
      reference: source.reference || null,
      note,
      recordedBy: actor.uid,
      recordedByName: actor.fullName,
      recordedByEmail: actor.email,
      recordedByPhone: actor.phone,
      createdAt: FieldValue.serverTimestamp(),
      paidAt: FieldValue.serverTimestamp(),
      ...(source.kind === "gateway"
        ? { paymentIntentId: source.paymentIntentId, provider: source.provider }
        : {}),
    });
    transaction.update(poolSnap.ref, {
      totalContributed: FieldValue.increment(amount),
      ...(isFirstContribution
        ? { contributorCount: FieldValue.increment(1) }
        : {}),
    });
    transaction.set(db.collection("audit_logs").doc(), {
      action: "contribution.recorded",
      actorUid: actor.uid,
      actorRole: actor.role,
      orgId,
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
