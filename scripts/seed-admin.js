/**
 * One-time bootstrap for a fresh Firebase project.
 * Ensures the organisation doc exists and promotes a user to active admin.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
 *     node scripts/seed-admin.js <email> [orgId]
 */
const admin = require("../functions/node_modules/firebase-admin");

const email = process.argv[2];
const orgId = process.argv[3] || "tiwani-org-v1";

if (!email) {
  console.error("Usage: node scripts/seed-admin.js <email> [orgId]");
  process.exit(1);
}

admin.initializeApp();
const db = admin.firestore();

const run = async () => {
  const authUser = await admin.auth().getUserByEmail(email);
  console.log(`Found auth user ${authUser.uid} for ${email}`);

  const orgRef = db.collection("organisations").doc(orgId);
  const orgSnapshot = await orgRef.get();
  if (orgSnapshot.exists) {
    console.log(`Organisation ${orgId} already exists, leaving it unchanged.`);
  } else {
    await orgRef.set({
      orgId,
      name: "Tiwani",
      currencySymbol: "$",
      timezone: "Europe/London",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`Created organisation ${orgId}.`);
  }

  const userRef = db.collection("users").doc(authUser.uid);
  const userSnapshot = await userRef.get();
  const profile = {
    orgId,
    role: "admin",
    status: "active",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  if (userSnapshot.exists) {
    await userRef.set(profile, { merge: true });
    console.log(`Updated existing profile ${authUser.uid}: role=admin, status=active, orgId=${orgId}.`);
  } else {
    await userRef.set({
      ...profile,
      uid: authUser.uid,
      fullName: authUser.displayName || email,
      email,
      phone: "",
      photoURL: null,
      financialStatus: "green",
      outstandingBalance: 0,
      address: "",
      maritalStatus: "single",
      dateOfBirth: "",
      spouseName: null,
      spouseDateOfBirth: null,
      weddingAnniversary: null,
      children: [],
      memberSince: new Date().toISOString(),
      notificationPreferences: { events: true, finance: true, voting: true },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`Created new admin profile for ${authUser.uid}.`);
  }

  const finalProfile = (await userRef.get()).data();
  console.log("Final profile:", JSON.stringify(finalProfile, null, 2));
};

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed failed:", error.message);
    process.exit(1);
  });
