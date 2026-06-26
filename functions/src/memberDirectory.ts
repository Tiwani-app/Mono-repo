import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  Change,
  DocumentSnapshot,
  FirestoreEvent,
  onDocumentWritten,
} from "firebase-functions/v2/firestore";
import { requireActiveUser } from "./authz";
import { db } from "./firebase";

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const stringValue = (value: unknown, fallback = "") =>
  typeof value === "string" ? value.trim() : fallback;

const nullableStringValue = (value: unknown) => {
  const text = stringValue(value);
  return text || null;
};

const childrenValue = (value: unknown) =>
  Array.isArray(value)
    ? value
        .map((child) => {
          const record = asRecord(child);
          const name = stringValue(record.name);
          const dateOfBirth = stringValue(record.dateOfBirth);
          return name ? { dateOfBirth, name } : null;
        })
        .filter((child): child is { dateOfBirth: string; name: string } => Boolean(child))
    : [];

const directoryProfileFromUser = (
  uid: string,
  profile: Record<string, unknown>,
) => ({
  children: childrenValue(profile.children),
  dateOfBirth: stringValue(profile.dateOfBirth),
  email: stringValue(profile.email),
  fullName: stringValue(profile.fullName, "Unnamed member"),
  maritalStatus: stringValue(profile.maritalStatus, "single"),
  memberSince: stringValue(profile.memberSince),
  orgId: stringValue(profile.orgId),
  phone: stringValue(profile.phone),
  photoURL: nullableStringValue(profile.photoURL),
  role: stringValue(profile.role, "member"),
  spouseDateOfBirth: nullableStringValue(profile.spouseDateOfBirth),
  spouseName: nullableStringValue(profile.spouseName),
  status: stringValue(profile.status, "active"),
  uid,
  updatedAt: FieldValue.serverTimestamp(),
  weddingAnniversary: nullableStringValue(profile.weddingAnniversary),
});

const syncDirectorySnapshot = async (
  uid: string,
  snapshot: DocumentSnapshot | undefined,
) => {
  const directoryRef = db.collection("member_directory").doc(uid);
  if (!snapshot?.exists) {
    await directoryRef.delete();
    return;
  }
  const profile = snapshot.data() ?? {};
  const directoryProfile = directoryProfileFromUser(uid, profile);
  if (!directoryProfile.orgId) {
    throw new HttpsError(
      "failed-precondition",
      "Member profile is missing an organisation.",
    );
  }
  await directoryRef.set(directoryProfile, { merge: true });
};

export const syncMemberDirectoryOnUserWrite = onDocumentWritten(
  "users/{userId}",
  async (event: FirestoreEvent<Change<DocumentSnapshot> | undefined>) => {
    const uid = event.params.userId;
    await syncDirectorySnapshot(uid, event.data?.after);
  },
);

export const backfillMemberDirectory = onCall(async (request) => {
  const user = await requireActiveUser(request, ["admin"]);
  const usersSnapshot = await db
    .collection("users")
    .where("orgId", "==", user.profile.orgId)
    .get();

  let batch = db.batch();
  let pendingWrites = 0;
  let written = 0;

  for (const userDoc of usersSnapshot.docs) {
    batch.set(
      db.collection("member_directory").doc(userDoc.id),
      directoryProfileFromUser(userDoc.id, userDoc.data()),
      { merge: true },
    );
    pendingWrites += 1;
    written += 1;
    if (pendingWrites === 450) {
      await batch.commit();
      batch = db.batch();
      pendingWrites = 0;
    }
  }

  if (pendingWrites > 0) {
    await batch.commit();
  }

  return { ok: true, written };
});
