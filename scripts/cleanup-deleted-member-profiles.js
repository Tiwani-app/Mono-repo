/**
 * One-time production cleanup for legacy deleted member profiles.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
 *     GOOGLE_CLOUD_PROJECT=tiwani-backend \
 *     node scripts/cleanup-deleted-member-profiles.js [orgId]
 *
 * Older account deletion completions anonymised users/{uid} into a visible
 * "Deleted member" record. Current deletion completions remove app-facing
 * profile documents instead. This script removes the old visible profiles and
 * their member_directory mirrors while preserving account_deletion_requests,
 * audit_logs, finance records, library_documents, and Storage objects.
 */
const admin = require("../functions/node_modules/firebase-admin");

const orgId = process.argv[2] || "tiwani-org-v1";

admin.initializeApp({
  projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT,
});

const db = admin.firestore();

const stringValue = (value) => (typeof value === "string" ? value.trim() : "");

const isLegacyDeletedProfile = (uid, profile) => {
  const fullName = stringValue(profile.fullName).toLowerCase();
  const email = stringValue(profile.email).toLowerCase();
  const deletionRequestId = stringValue(profile.deletionRequestId);
  return (
    Boolean(profile.deletedAt) ||
    Boolean(deletionRequestId) ||
    fullName === "deleted member" ||
    email === `deleted-${uid.toLowerCase()}@tiwani.local`
  );
};

const commitIfNeeded = async (state, force = false) => {
  if (state.pendingWrites === 0 || (!force && state.pendingWrites < 450)) {
    return state;
  }
  await state.batch.commit();
  return {
    batch: db.batch(),
    pendingWrites: 0,
  };
};

const run = async () => {
  console.log(`Cleaning legacy deleted member profiles for org ${orgId}...`);

  const usersSnapshot = await db.collection("users").where("orgId", "==", orgId).get();
  if (usersSnapshot.empty) {
    console.log("No users found for this organisation. Nothing deleted.");
    return;
  }

  let state = {
    batch: db.batch(),
    pendingWrites: 0,
  };
  let deletedProfiles = 0;

  for (const userDoc of usersSnapshot.docs) {
    const profile = userDoc.data();
    if (!isLegacyDeletedProfile(userDoc.id, profile)) {
      continue;
    }

    state.batch.delete(userDoc.ref);
    state.batch.delete(db.collection("member_directory").doc(userDoc.id));
    state.pendingWrites += 2;
    deletedProfiles += 1;
    state = await commitIfNeeded(state);
  }

  await commitIfNeeded(state, true);

  console.log(
    `Cleanup complete. Deleted ${deletedProfiles} legacy deleted member profile(s).`,
  );
};

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Cleanup failed:", error.message);
    process.exit(1);
  });
