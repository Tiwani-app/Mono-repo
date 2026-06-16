import { CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { db } from "./firebase";
import { AuthenticatedUser, Role, UserProfile } from "./types";

const roles: Role[] = ["admin", "electoral_chairman", "member"];

const profileFromRecord = (uid: string, data: FirebaseFirestore.DocumentData): UserProfile => {
  const role = data.role;
  const status = data.status;
  if (typeof data.orgId !== "string" || !data.orgId.trim()) {
    throw new HttpsError("failed-precondition", "Your member profile is missing an organisation.");
  }
  if (typeof data.fullName !== "string" || !data.fullName.trim()) {
    throw new HttpsError("failed-precondition", "Your member profile is missing a name.");
  }
  if (typeof data.email !== "string" || !data.email.trim()) {
    throw new HttpsError("failed-precondition", "Your member profile is missing an email.");
  }
  if (typeof role !== "string" || !roles.includes(role as Role)) {
    throw new HttpsError("permission-denied", "Your member role is not supported.");
  }
  if (
    status !== "active" &&
    status !== "inactive" &&
    status !== "suspended" &&
    status !== "pending"
  ) {
    throw new HttpsError("permission-denied", "Your member status is not supported.");
  }
  return {
    uid,
    orgId: data.orgId.trim(),
    fullName: data.fullName.trim(),
    email: data.email.trim(),
    phone: typeof data.phone === "string" ? data.phone.trim() : "",
    role: role as Role,
    status,
  };
};

export const requireActiveUser = async (
  request: CallableRequest<unknown>,
  allowedRoles?: Role[],
): Promise<AuthenticatedUser> => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in before continuing.");
  }
  const profileSnapshot = await db.collection("users").doc(request.auth.uid).get();
  if (!profileSnapshot.exists) {
    throw new HttpsError("permission-denied", "No Tiwani member profile was found for this account.");
  }
  const profile = profileFromRecord(request.auth.uid, profileSnapshot.data() ?? {});
  if (profile.status !== "active") {
    throw new HttpsError("permission-denied", "Your account is not active.");
  }
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    throw new HttpsError("permission-denied", "You do not have permission to perform this action.");
  }
  return { uid: request.auth.uid, profile };
};

export const assertSameOrg = (user: AuthenticatedUser, orgId: unknown) => {
  if (typeof orgId !== "string" || orgId !== user.profile.orgId) {
    throw new HttpsError("permission-denied", "This record does not belong to your organisation.");
  }
};
