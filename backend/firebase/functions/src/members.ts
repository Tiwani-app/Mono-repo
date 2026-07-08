import { FieldValue } from "firebase-admin/firestore";
import { CallableRequest, HttpsError, onCall } from "firebase-functions/v2/https";
import { assertSameOrg, requireActiveUser } from "./authz";
import { auth, db } from "./firebase";
import { memberProfileFromInput, stringValue } from "./memberProfiles";
import { sendPasswordSetupEmail } from "./setupEmail";
import { AuthenticatedUser, Role, UserProfileInput } from "./types";
import { normalizeEmail, stringField } from "./validation";

const memberRoles: Role[] = ["admin", "electoral_chairman", "member"];

const getAuthUserByEmail = async (email: string) => {
  try {
    return await auth.getUserByEmail(email);
  } catch (error) {
    const code =
      typeof error === "object" && error && "code" in error
        ? String((error as { code?: unknown }).code)
        : "";
    if (code === "auth/user-not-found") {
      return null;
    }
    throw error;
  }
};

const memberUidFromRequest = (data: unknown) =>
  stringField(data, "uid", { maxLength: 160 });

const roleFromRequest = (data: unknown): Role => {
  const role = stringField(data, "role", { maxLength: 40 });
  if (!memberRoles.includes(role as Role)) {
    throw new HttpsError("invalid-argument", "Member role is not supported.");
  }
  return role as Role;
};

const getTargetMember = async (user: AuthenticatedUser, uid: string) => {
  const memberRef = db.collection("users").doc(uid);
  const memberSnapshot = await memberRef.get();
  if (!memberSnapshot.exists) {
    throw new HttpsError("not-found", "Member profile not found.");
  }
  const member = memberSnapshot.data() ?? {};
  assertSameOrg(user, member.orgId);
  return { member, memberRef };
};

const assertNotSelf = (user: AuthenticatedUser, uid: string) => {
  if (user.uid === uid) {
    throw new HttpsError(
      "failed-precondition",
      "Use another active admin account for changes to your own admin access.",
    );
  }
};

const authUserForMember = async (uid: string) => {
  try {
    return await auth.getUser(uid);
  } catch (error) {
    const code =
      typeof error === "object" && error && "code" in error
        ? String((error as { code?: unknown }).code)
        : "";
    if (code === "auth/user-not-found") {
      throw new HttpsError(
        "failed-precondition",
        "Firebase Auth account not found for this member.",
      );
    }
    throw error;
  }
};

const updateMemberStatus = async (
  request: CallableRequest<unknown>,
  status: "active" | "suspended",
  disabled: boolean,
  action: string,
) => {
  const user = await requireActiveUser(request, ["admin"]);
  const uid = memberUidFromRequest(request.data);
  assertNotSelf(user, uid);
  const { memberRef } = await getTargetMember(user, uid);
  const authUser = await authUserForMember(uid);

  await auth.updateUser(uid, { disabled });
  try {
    await db.runTransaction(async (transaction) => {
      const freshMember = await transaction.get(memberRef);
      if (!freshMember.exists) {
        throw new HttpsError("not-found", "Member profile not found.");
      }
      const member = freshMember.data() ?? {};
      assertSameOrg(user, member.orgId);
      transaction.update(memberRef, {
        status,
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.set(db.collection("audit_logs").doc(), {
        action,
        actorUid: user.uid,
        actorRole: user.profile.role,
        orgId: user.profile.orgId,
        targetPath: memberRef.path,
        details: {
          previousStatus: member.status ?? null,
          status,
          uid,
        },
        createdAt: FieldValue.serverTimestamp(),
      });
    });
  } catch (error) {
    await auth.updateUser(uid, { disabled: authUser.disabled }).catch(() => undefined);
    throw error;
  }

  return { ok: true, status, uid };
};

export const createMemberAccount = onCall(async (request) => {
  const user = await requireActiveUser(request, ["admin"]);
  const input = request.data as UserProfileInput;
  const email = normalizeEmail(stringValue(input.email, "email"));
  const existingAuthUser = await getAuthUserByEmail(email);

  if (existingAuthUser) {
    throw new HttpsError(
      "already-exists",
      "A Firebase Auth account already exists for this email address.",
    );
  }

  const authUser = await auth.createUser({
    displayName: stringValue(input.fullName, "fullName"),
    email,
    emailVerified: false,
    disabled: false,
  });
  const memberRef = db.collection("users").doc(authUser.uid);
  const auditRef = db.collection("audit_logs").doc();
  const memberProfile = memberProfileFromInput(authUser.uid, user.profile.orgId, {
    ...input,
    email,
  });
  let setupLink: string | null = null;

  try {
    setupLink = await auth.generatePasswordResetLink(email);
  } catch {
    setupLink = null;
  }

  try {
    await db.runTransaction(async (transaction) => {
      const existingProfile = await transaction.get(memberRef);
      if (existingProfile.exists) {
        throw new HttpsError("already-exists", "A Tiwani profile already exists for this account.");
      }
      transaction.set(memberRef, memberProfile);
      transaction.set(auditRef, {
        action: "member_account.created",
        actorUid: user.uid,
        actorRole: user.profile.role,
        orgId: user.profile.orgId,
        targetPath: memberRef.path,
        details: { uid: authUser.uid, role: memberProfile.role },
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

  return { ok: true, uid: authUser.uid, ...setupEmail };
});

export const suspendMember = onCall(async (request) =>
  updateMemberStatus(request, "suspended", true, "member.suspended"),
);

export const reactivateMember = onCall(async (request) =>
  updateMemberStatus(request, "active", false, "member.reactivated"),
);

export const updateMemberRole = onCall(async (request) => {
  const user = await requireActiveUser(request, ["admin"]);
  const uid = memberUidFromRequest(request.data);
  const role = roleFromRequest(request.data);
  assertNotSelf(user, uid);
  const { memberRef } = await getTargetMember(user, uid);

  await db.runTransaction(async (transaction) => {
    const freshMember = await transaction.get(memberRef);
    if (!freshMember.exists) {
      throw new HttpsError("not-found", "Member profile not found.");
    }
    const member = freshMember.data() ?? {};
    assertSameOrg(user, member.orgId);
    transaction.update(memberRef, {
      role,
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.set(db.collection("audit_logs").doc(), {
      action: "member.role_updated",
      actorUid: user.uid,
      actorRole: user.profile.role,
      orgId: user.profile.orgId,
      targetPath: memberRef.path,
      details: {
        previousRole: member.role ?? null,
        role,
        uid,
      },
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return { ok: true, role, uid };
});
