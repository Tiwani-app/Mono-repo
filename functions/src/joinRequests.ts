import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { auth } from "./firebase";
import { assertSameOrg, requireActiveUser } from "./authz";
import { db } from "./firebase";
import { memberProfileFromInput, stringValue } from "./memberProfiles";
import { sendPasswordSetupEmail } from "./setupEmail";
import { normalizeEmail, stringField } from "./validation";

export const declineJoinRequest = onCall(async (request) => {
  const user = await requireActiveUser(request, ["admin"]);
  const requestId = stringField(request.data, "requestId", { maxLength: 160 });
  const requestRef = db.collection("join_requests").doc(requestId);
  const auditRef = db.collection("audit_logs").doc();

  await db.runTransaction(async (transaction) => {
    const requestSnapshot = await transaction.get(requestRef);
    if (!requestSnapshot.exists) {
      throw new HttpsError("not-found", "Join request not found.");
    }
    const joinRequest = requestSnapshot.data() ?? {};
    assertSameOrg(user, joinRequest.orgId);
    if (joinRequest.status !== "pending") {
      throw new HttpsError("failed-precondition", "Only pending join requests can be declined.");
    }
    transaction.update(requestRef, {
      status: "declined",
      reviewedAt: FieldValue.serverTimestamp(),
      reviewedBy: user.uid,
    });
    transaction.set(auditRef, {
      action: "join_request.declined",
      actorUid: user.uid,
      actorRole: user.profile.role,
      orgId: user.profile.orgId,
      targetPath: requestRef.path,
      details: { requestId },
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return { ok: true, requestId };
});

export const approveJoinRequest = onCall(async (request) => {
  const user = await requireActiveUser(request, ["admin"]);
  const requestId = stringField(request.data, "requestId", { maxLength: 160 });
  const requestRef = db.collection("join_requests").doc(requestId);
  const auditRef = db.collection("audit_logs").doc();
  const requestSnapshot = await requestRef.get();

  if (!requestSnapshot.exists) {
    throw new HttpsError("not-found", "Join request not found.");
  }

  const joinRequest = requestSnapshot.data() ?? {};
  assertSameOrg(user, joinRequest.orgId);
  if (joinRequest.status !== "pending") {
    throw new HttpsError("failed-precondition", "Only pending join requests can be approved.");
  }

  const email = normalizeEmail(stringValue(joinRequest.email, "email"));
  try {
    await auth.getUserByEmail(email);
    throw new HttpsError(
      "already-exists",
      "A Firebase Auth account already exists for this email address.",
    );
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    const code =
      typeof error === "object" && error && "code" in error
        ? String((error as { code?: unknown }).code)
        : "";
    if (code !== "auth/user-not-found") {
      throw error;
    }
  }

  const authUser = await auth.createUser({
    displayName: stringValue(joinRequest.fullName, "fullName"),
    email,
    emailVerified: false,
    disabled: false,
  });
  const memberRef = db.collection("users").doc(authUser.uid);
  const memberProfile = memberProfileFromInput(authUser.uid, user.profile.orgId, {
    fullName: stringValue(joinRequest.fullName, "fullName"),
    email,
    phone: stringValue(joinRequest.phone, "phone"),
    role: "member",
    status: "active",
    financialStatus: "green",
    outstandingBalance: 0,
    address: "",
    maritalStatus: "single",
    children: [],
  });
  let setupLink: string | null = null;

  try {
    setupLink = await auth.generatePasswordResetLink(email);
  } catch {
    setupLink = null;
  }

  try {
    await db.runTransaction(async (transaction) => {
      const freshRequest = await transaction.get(requestRef);
      if (!freshRequest.exists) {
        throw new HttpsError("not-found", "Join request not found.");
      }
      const latestJoinRequest = freshRequest.data() ?? {};
      assertSameOrg(user, latestJoinRequest.orgId);
      if (latestJoinRequest.status !== "pending") {
        throw new HttpsError("failed-precondition", "Only pending join requests can be approved.");
      }
      transaction.set(memberRef, memberProfile);
      transaction.update(requestRef, {
        status: "approved",
        approvedUid: authUser.uid,
        reviewedAt: FieldValue.serverTimestamp(),
        reviewedBy: user.uid,
      });
      transaction.set(auditRef, {
        action: "join_request.approved",
        actorUid: user.uid,
        actorRole: user.profile.role,
        orgId: user.profile.orgId,
        targetPath: requestRef.path,
        details: { requestId, uid: authUser.uid },
        createdAt: FieldValue.serverTimestamp(),
      });
    });
  } catch (error) {
    await auth.deleteUser(authUser.uid).catch(() => undefined);
    throw error;
  }

  const setupEmail = await sendPasswordSetupEmail({
    email,
    fullName: memberProfile.fullName,
    setupLink,
  });

  return { ok: true, requestId, uid: authUser.uid, ...setupEmail };
});
