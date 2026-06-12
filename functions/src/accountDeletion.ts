import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { assertSameOrg, requireActiveUser } from "./authz";
import { auth, db } from "./firebase";
import { stringField } from "./validation";

const deletedMemberName = "Deleted member";

const deleteAuthUser = async (uid: string) => {
  try {
    await auth.deleteUser(uid);
    return true;
  } catch (error) {
    const code =
      typeof error === "object" && error && "code" in error
        ? String((error as { code?: unknown }).code)
        : "";
    if (code === "auth/user-not-found") {
      return false;
    }
    throw error;
  }
};

const anonymizedMemberProfile = (uid: string) => ({
  address: "",
  children: [],
  dateOfBirth: "",
  deletedAt: FieldValue.serverTimestamp(),
  deletionRequestId: uid,
  email: `deleted-${uid}@tiwani.local`,
  financialStatus: "green",
  fullName: deletedMemberName,
  maritalStatus: "single",
  notificationPreferences: { events: false, finance: false, voting: false },
  outstandingBalance: 0,
  phone: "N/A",
  photoURL: null,
  role: "member",
  spouseDateOfBirth: null,
  spouseName: null,
  status: "inactive",
  weddingAnniversary: null,
});

export const requestAccountDeletion = onCall(async (request) => {
  const user = await requireActiveUser(request);
  const reason = stringField(request.data, "reason", { maxLength: 1000 });
  const requestRef = db.collection("account_deletion_requests").doc(user.uid);
  const auditRef = db.collection("audit_logs").doc();

  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(requestRef);
    if (existing.exists && existing.data()?.status === "requested") {
      throw new HttpsError("already-exists", "You already have an account deletion request pending.");
    }
    transaction.set(requestRef, {
      requestId: user.uid,
      orgId: user.profile.orgId,
      uid: user.uid,
      fullName: user.profile.fullName,
      email: user.profile.email,
      reason,
      status: "requested",
      requestedAt: FieldValue.serverTimestamp(),
      reviewedAt: null,
      reviewedBy: null,
      completedAt: null,
    });
    transaction.set(auditRef, {
      action: "account_deletion.requested",
      actorUid: user.uid,
      actorRole: user.profile.role,
      orgId: user.profile.orgId,
      targetPath: requestRef.path,
      details: { status: "requested" },
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return { ok: true, requestId: user.uid };
});

export const completeAccountDeletion = onCall(async (request) => {
  const user = await requireActiveUser(request, ["admin"]);
  const requestId = stringField(request.data, "requestId", { maxLength: 160 });
  const requestRef = db.collection("account_deletion_requests").doc(requestId);
  const memberRef = db.collection("users").doc(requestId);
  const directoryRef = db.collection("member_directory").doc(requestId);
  const tokenSnapshot = await db
    .collection("device_tokens")
    .where("uid", "==", requestId)
    .get();
  const deletionRequestSnapshot = await requestRef.get();

  if (!deletionRequestSnapshot.exists) {
    throw new HttpsError("not-found", "Account deletion request not found.");
  }
  const deletionRequest = deletionRequestSnapshot.data() ?? {};
  assertSameOrg(user, deletionRequest.orgId);
  if (deletionRequest.status !== "requested") {
    throw new HttpsError(
      "failed-precondition",
      "Only requested account deletions can be completed.",
    );
  }

  const authDeleted = await deleteAuthUser(requestId);
  let profileAnonymized = false;

  await db.runTransaction(async (transaction) => {
    const [freshRequest, memberSnapshot] = await Promise.all([
      transaction.get(requestRef),
      transaction.get(memberRef),
    ]);
    if (!freshRequest.exists) {
      throw new HttpsError("not-found", "Account deletion request not found.");
    }
    const latestRequest = freshRequest.data() ?? {};
    assertSameOrg(user, latestRequest.orgId);
    if (latestRequest.status !== "requested") {
      throw new HttpsError(
        "failed-precondition",
        "Only requested account deletions can be completed.",
      );
    }
    if (memberSnapshot.exists) {
      assertSameOrg(user, memberSnapshot.data()?.orgId);
      profileAnonymized = true;
      transaction.update(memberRef, anonymizedMemberProfile(requestId));
      transaction.set(
        directoryRef,
        {
          deletedAt: FieldValue.serverTimestamp(),
          fullName: deletedMemberName,
          orgId: user.profile.orgId,
          photoURL: null,
          uid: requestId,
        },
        { merge: true },
      );
    }
    transaction.update(requestRef, {
      authDeleted,
      completedAt: FieldValue.serverTimestamp(),
      completedBy: user.uid,
      profileAnonymized: memberSnapshot.exists,
      reviewedAt: FieldValue.serverTimestamp(),
      reviewedBy: user.uid,
      status: "completed",
    });
    transaction.set(db.collection("audit_logs").doc(), {
      action: "account_deletion.completed",
      actorUid: user.uid,
      actorRole: user.profile.role,
      orgId: user.profile.orgId,
      targetPath: requestRef.path,
      details: {
        authDeleted,
        profileAnonymized: memberSnapshot.exists,
        requestId,
        tokenCount: tokenSnapshot.size,
      },
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  if (!tokenSnapshot.empty) {
    const batch = db.batch();
    tokenSnapshot.docs.forEach((token) => batch.delete(token.ref));
    await batch.commit();
  }

  return {
    authDeleted,
    ok: true,
    profileAnonymized,
    requestId,
    tokenCount: tokenSnapshot.size,
  };
});
