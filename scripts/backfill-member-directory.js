/**
 * One-time production backfill for the sanitized member directory.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
 *     GOOGLE_CLOUD_PROJECT=tiwani-backend \
 *     node scripts/backfill-member-directory.js [orgId]
 *
 * The script intentionally mirrors only member-facing fields from users/{uid}
 * into member_directory/{uid}. Finance, address, notification preferences, and
 * other private profile data stay out of the directory mirror.
 */
const admin = require("../functions/node_modules/firebase-admin");

const orgId = process.argv[2] || "tiwani-org-v1";

admin.initializeApp({
  projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT,
});

const db = admin.firestore();
const { FieldValue } = admin.firestore;

const asRecord = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

const stringValue = (value, fallback = "") =>
  typeof value === "string" ? value.trim() : fallback;

const nullableStringValue = (value) => {
  const text = stringValue(value);
  return text || null;
};

const childrenValue = (value) =>
  Array.isArray(value)
    ? value
        .map((child) => {
          const record = asRecord(child);
          const name = stringValue(record.name);
          const dateOfBirth = stringValue(record.dateOfBirth);
          return name ? { dateOfBirth, name } : null;
        })
        .filter(Boolean)
    : [];

const directoryProfileFromUser = (uid, profile) => ({
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

const run = async () => {
  console.log(`Backfilling member_directory for org ${orgId}...`);

  const usersSnapshot = await db.collection("users").where("orgId", "==", orgId).get();
  if (usersSnapshot.empty) {
    console.log("No users found for this organisation. Nothing written.");
    return;
  }

  let batch = db.batch();
  let pendingWrites = 0;
  let written = 0;

  for (const userDoc of usersSnapshot.docs) {
    const directoryProfile = directoryProfileFromUser(userDoc.id, userDoc.data());
    if (!directoryProfile.orgId) {
      console.warn(`Skipping ${userDoc.id}: missing orgId.`);
      continue;
    }

    batch.set(db.collection("member_directory").doc(userDoc.id), directoryProfile, {
      merge: true,
    });
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

  console.log(`Backfill complete. Wrote ${written} member_directory document(s).`);
};

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Backfill failed:", error.message);
    process.exit(1);
  });
