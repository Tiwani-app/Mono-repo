import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";

const fs = require("fs");

const projectId = "tiwani-dev";
let testEnv: RulesTestEnvironment;

const userRecord = (
  uid: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  uid,
  orgId: "org-1",
  fullName: uid,
  email: `${uid}@example.com`,
  phone: "555-0100",
  photoURL: null,
  role: "member",
  status: "active",
  financialStatus: "green",
  outstandingBalance: 0,
  address: "",
  maritalStatus: "single",
  dateOfBirth: "",
  spouseName: null,
  spouseDateOfBirth: null,
  weddingAnniversary: null,
  children: [],
  memberSince: "2026-01-01",
  notificationPreferences: { events: true, finance: true, voting: true },
  currencySymbol: "$",
  timezone: "Africa/Lagos",
  ...overrides,
});

const seed = async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.doc("users/member-1").set(userRecord("member-1"));
    await db.doc("users/member-2").set(userRecord("member-2"));
    await db.doc("users/admin-1").set(
      userRecord("admin-1", {
        email: "admin@example.com",
        role: "admin",
      }),
    );
    await db.doc("users/other-org-member").set(
      userRecord("other-org-member", { orgId: "org-2" }),
    );
    await db.doc("users/suspended-1").set(
      userRecord("suspended-1", { status: "suspended" }),
    );
    await db.doc("events/event-1").set({
      eventId: "event-1",
      orgId: "org-1",
      title: "Town Hall",
      description: "Monthly meeting",
      category: "meeting",
      startTime: new Date("2026-07-01T18:00:00.000Z"),
      location: "Main Hall",
      capacity: 50,
      createdBy: "admin-1",
      status: "published",
      rsvpList: [],
      attendeeList: [],
    });
    await db.doc("finance/charge-1").set({
      entryId: "charge-1",
      orgId: "org-1",
      memberId: "member-1",
      type: "dues",
      label: "Q3 Dues",
      amount: 100,
      amountPaid: 0,
      dueDate: new Date("2026-08-01T00:00:00.000Z"),
      paidStatus: "unpaid",
      note: "",
      recordedBy: "admin-1",
    });
    await db.doc("join_requests/request-1").set({
      requestId: "request-1",
      orgId: "org-1",
      fullName: "Applicant",
      email: "applicant@example.com",
      phone: "555-0102",
      message: "Please approve me",
      status: "pending",
      createdAt: new Date("2026-06-01T00:00:00.000Z"),
      reviewedAt: null,
      reviewedBy: null,
    });
    await db.doc("polls/poll-1").set({
      pollId: "poll-1",
      orgId: "org-1",
      title: "Venue",
      question: "Where should we meet?",
      status: "open",
      resultVisibility: "after_vote",
      totalVotes: 0,
      options: [{ optionId: "hall", label: "Hall", voteCount: 0 }],
    });
  });
};

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: fs.readFileSync("firestore.rules", "utf8"),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await seed();
});

afterAll(async () => {
  await testEnv?.cleanup();
});

describe("Firestore security rules", () => {
  it("blocks unauthenticated reads", async () => {
    const db = testEnv.unauthenticatedContext().firestore();

    await assertFails(db.doc("users/member-1").get());
  });

  it("allows active members to read same-org users only", async () => {
    const db = testEnv.authenticatedContext("member-1").firestore();

    await assertSucceeds(db.doc("users/member-1").get());
    await assertSucceeds(db.doc("users/member-2").get());
    await assertFails(db.doc("users/other-org-member").get());
  });

  it("allows signed-in users to restore their own profile state", async () => {
    const suspendedDb = testEnv.authenticatedContext("suspended-1").firestore();
    const unprovisionedDb = testEnv.authenticatedContext("unprovisioned-1").firestore();

    await assertSucceeds(suspendedDb.doc("users/suspended-1").get());
    await assertFails(suspendedDb.doc("users/member-1").get());
    await assertSucceeds(unprovisionedDb.doc("users/unprovisioned-1").get());
  });

  it("allows members to update profile preferences but not role or finance status", async () => {
    const db = testEnv.authenticatedContext("member-1").firestore();

    await assertSucceeds(
      db.doc("users/member-1").update({
        notificationPreferences: { events: false, finance: true, voting: true },
      }),
    );
    await assertFails(db.doc("users/member-1").update({ role: "admin" }));
    await assertFails(db.doc("users/member-1").update({ outstandingBalance: 25 }));
  });

  it("allows members to RSVP but blocks cross-user finance writes", async () => {
    const memberDb = testEnv.authenticatedContext("member-1").firestore();

    await assertSucceeds(
      memberDb.doc("events/event-1").update({ rsvpList: ["member-1"] }),
    );
    await assertFails(
      memberDb.doc("finance/charge-1").update({ amountPaid: 100 }),
    );
  });

  it("allows admins to decline join requests but not approve them client-side", async () => {
    const db = testEnv.authenticatedContext("admin-1").firestore();

    await assertSucceeds(
      db.doc("join_requests/request-1").update({
        status: "declined",
        reviewedAt: new Date("2026-06-02T00:00:00.000Z"),
        reviewedBy: "admin-1",
      }),
    );

    await testEnv.clearFirestore();
    await seed();

    await assertFails(
      db.doc("join_requests/request-1").update({
        status: "approved",
        reviewedAt: new Date("2026-06-02T00:00:00.000Z"),
        reviewedBy: "admin-1",
      }),
    );
  });

  it("allows members to request their own account deletion only", async () => {
    const memberDb = testEnv.authenticatedContext("member-1").firestore();

    await assertSucceeds(
      memberDb.doc("account_deletion_requests/member-1").set({
        requestId: "member-1",
        orgId: "org-1",
        uid: "member-1",
        fullName: "Member One",
        email: "member-1@example.com",
        reason: "I no longer want to use the app.",
        status: "requested",
        requestedAt: new Date("2026-06-03T00:00:00.000Z"),
        reviewedAt: null,
        reviewedBy: null,
        completedAt: null,
      }),
    );

    await assertFails(
      memberDb.doc("account_deletion_requests/member-2").set({
        requestId: "member-2",
        orgId: "org-1",
        uid: "member-2",
        fullName: "Member Two",
        email: "member-2@example.com",
        reason: "Trying to delete someone else.",
        status: "requested",
        requestedAt: new Date("2026-06-03T00:00:00.000Z"),
        reviewedAt: null,
        reviewedBy: null,
        completedAt: null,
      }),
    );
  });

  it("blocks direct poll vote writes until secure voting functions exist", async () => {
    const db = testEnv.authenticatedContext("member-1").firestore();

    await assertFails(
      db.doc("polls/poll-1/votes/member-1").set({
        optionId: "hall",
        votedAt: new Date("2026-06-02T00:00:00.000Z"),
      }),
    );
  });
});
