const mockGet = jest.fn();
const mockSet = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockQueryGet = jest.fn();
const mockWhere = jest.fn();
const mockCollection = jest.fn();
const mockDoc = jest.fn((id = "generated-id") => ({
  id,
  collection: mockCollection,
  delete: mockDelete,
  get: mockGet,
  set: mockSet,
  update: mockUpdate,
}));
const mockTransactionGet = jest.fn(async (ref) => ref.get());
const mockTransactionSet = jest.fn();
const mockTransactionUpdate = jest.fn();
const mockRunTransaction = jest.fn(async (callback) =>
  callback({
    get: mockTransactionGet,
    set: mockTransactionSet,
    update: mockTransactionUpdate,
  }),
);
const mockBatchSet = jest.fn();
const mockBatchUpdate = jest.fn();
const mockBatchCommit = jest.fn();
const mockBatch = jest.fn(() => ({
  commit: mockBatchCommit,
  set: mockBatchSet,
  update: mockBatchUpdate,
}));
const mockStoragePutFile = jest.fn();
const mockStorageGetDownloadURL = jest.fn();
const mockStorageRef = jest.fn(() => ({
  getDownloadURL: mockStorageGetDownloadURL,
  putFile: mockStoragePutFile,
}));
const mockQuery = { get: mockQueryGet, where: mockWhere };
mockWhere.mockImplementation(() => mockQuery);
mockCollection.mockImplementation(() => ({ doc: mockDoc, where: mockWhere }));
const mockFirestore = {
  batch: mockBatch,
  collection: mockCollection,
  runTransaction: mockRunTransaction,
};

jest.mock("../config/firebase", () => ({
  firebaseFirestoreModule: () => ({
    FieldValue: { increment: (value: number) => ({ increment: value }) },
  }),
  firebaseFunctions: jest.fn(),
  firebaseMessaging: jest.fn(),
  firebaseMessagingModule: jest.fn(),
  firebaseStorage: () => ({ ref: mockStorageRef }),
  getFirebaseClientConfigState: jest.fn(),
}));

jest.mock("../config/env", () => ({
  env: { defaultOrgId: "tiwani-org-v1" },
}));

jest.mock("../services/cloudFunctionsService", () => ({
  approveJoinRequestCallable: jest.fn(),
  castElectionBallotCallable: jest.fn(),
  createAdHocChargesCallable: jest.fn(),
  createElectionCallable: jest.fn(),
  createFinancePeriodCallable: jest.fn(),
  createMemberAccountCallable: jest.fn(),
  createPollCallable: jest.fn(),
  declineJoinRequestCallable: jest.fn(),
  listElectionVoterReceiptsCallable: jest.fn(),
  recordPaymentCallable: jest.fn(),
  requestAccountDeletionCallable: jest.fn(),
  sendAnnouncementPushCallable: jest.fn(),
  updateMemberRoleCallable: jest.fn(),
  updatePollCallable: jest.fn(),
  suspendMemberCallable: jest.fn(),
  reactivateMemberCallable: jest.fn(),
  updateElectionCallable: jest.fn(),
}));

jest.mock("../services/firebaseHelpers", () => ({
  currentUid: () => "admin-1",
  firestore: () => mockFirestore,
  getCurrentOrgId: () => Promise.resolve("tiwani-org-v1"),
  getUserRecord: async () => {
    const snapshot = await mockGet();
    if (!snapshot.exists()) {
      throw new Error("Member profile not found.");
    }
    return { id: snapshot.id, ...(snapshot.data() ?? {}) };
  },
  getCurrentUserRecord: () =>
    Promise.resolve({
      id: "admin-1",
      email: "admin@tiwani.app",
      fullName: "Admin User",
      phone: "+2348012345678",
    }),
  serverTimestamp: () => "server-timestamp",
  snapshotRecords: jest.fn(),
  startOrgSubscription: jest.fn(),
}));

import {
  checkInAttendee,
  toggleRsvp,
} from "../services/eventsService";
import {
  createAdHocCharge,
  createDuesPeriod,
  recordPayment,
} from "../services/financeService";
import {
  createLibraryDocument,
  updateLibraryDocument,
} from "../services/libraryService";
import { createListing } from "../services/marketplaceService";
import { createMember, updateMember } from "../services/membersService";
import { sendAnnouncement } from "../services/notificationsService";
import {
  castElectionBallot,
  createPoll,
  updatePoll,
} from "../services/votingService";
import {
  castElectionBallotCallable,
  createAdHocChargesCallable,
  createFinancePeriodCallable,
  createMemberAccountCallable,
  createPollCallable,
  listElectionVoterReceiptsCallable,
  recordPaymentCallable,
  sendAnnouncementPushCallable,
  updatePollCallable,
} from "../services/cloudFunctionsService";

const mockCastElectionBallotCallable = castElectionBallotCallable as jest.Mock;
const mockCreateAdHocChargesCallable = createAdHocChargesCallable as jest.Mock;
const mockCreateFinancePeriodCallable = createFinancePeriodCallable as jest.Mock;
const mockCreateMemberAccountCallable = createMemberAccountCallable as jest.Mock;
const mockCreatePollCallable = createPollCallable as jest.Mock;
const mockListElectionVoterReceiptsCallable =
  listElectionVoterReceiptsCallable as jest.Mock;
const mockRecordPaymentCallable = recordPaymentCallable as jest.Mock;
const mockSendAnnouncementPushCallable = sendAnnouncementPushCallable as jest.Mock;
const mockUpdatePollCallable = updatePollCallable as jest.Mock;

describe("Firebase service contracts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockReset();
    mockQueryGet.mockReset();
    mockStorageGetDownloadURL.mockReset();
    mockStoragePutFile.mockReset();
    mockSet.mockReset();
    mockUpdate.mockReset();
    mockDelete.mockReset();
    mockTransactionSet.mockReset();
    mockTransactionUpdate.mockReset();
    mockBatchSet.mockReset();
    mockBatchUpdate.mockReset();
    mockBatchCommit.mockReset();
    mockGet.mockResolvedValue({
      exists: () => true,
      id: "member-1",
      ref: {},
      data: () => ({ orgId: "tiwani-org-v1" }),
    });
    mockQueryGet.mockResolvedValue({ docs: [], empty: true, size: 0 });
    mockStorageGetDownloadURL.mockResolvedValue("https://storage.example/document.pdf");
    mockCreateMemberAccountCallable.mockResolvedValue({
      ok: true,
      setupEmailError: null,
      setupEmailSent: true,
      setupLink: "https://example.com/setup",
      uid: "member-1",
    });
    mockCreatePollCallable.mockResolvedValue({ ok: true, pollId: "poll-1" });
    mockListElectionVoterReceiptsCallable.mockResolvedValue({
      electionId: "election-1",
      ok: true,
      receipts: [],
    });
    mockUpdatePollCallable.mockResolvedValue({ ok: true, pollId: "poll-1" });
    mockSendAnnouncementPushCallable.mockResolvedValue({
      delivered: 1,
      notifId: "notif-1",
      success: true,
    });
  });

  it("routes privileged finance mutations through Cloud Functions", async () => {
    const dueDate = new Date("2026-07-01T00:00:00.000Z");
    await createAdHocCharge({
      memberIds: ["member-1"],
      type: "levy",
      label: "  Welfare levy ",
      amount: 2500,
      dueDate,
      note: "  July ",
    });
    await createDuesPeriod({
      name: "Q3 2026 Dues",
      amount: 5000,
      dueDate,
      status: "active",
    });
    await recordPayment({
      uid: "member-1",
      chargeEntryId: "charge-1",
      amount: 2500,
      paymentMethod: "Bank transfer",
      reference: "  REF-1 ",
      note: "  paid ",
    });

    expect(mockCreateAdHocChargesCallable).toHaveBeenCalledWith(
      expect.objectContaining({
        memberIds: ["member-1"],
        type: "levy",
      }),
    );
    expect(mockCreateFinancePeriodCallable).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Q3 2026 Dues", amount: 5000 }),
    );
    expect(mockRecordPaymentCallable).toHaveBeenCalledWith(
      expect.objectContaining({ chargeEntryId: "charge-1", uid: "member-1" }),
    );
    expect(mockBatchSet).not.toHaveBeenCalled();
    expect(mockBatchUpdate).not.toHaveBeenCalled();
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  it("writes RSVP and admin check-in through Firestore transactions", async () => {
    mockGet
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          attendeeList: [],
          capacity: 30,
          rsvpList: [],
          status: "published",
        }),
      })
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          attendeeList: [],
          capacity: 30,
          rsvpList: ["member-2"],
          status: "published",
        }),
      });

    await toggleRsvp("event-1", "admin-1");
    await checkInAttendee("event-1", "member-2");

    expect(mockTransactionUpdate).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      { rsvpList: ["admin-1"] },
    );
    expect(mockTransactionUpdate).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      { attendeeList: ["member-2"] },
    );
    expect(mockTransactionSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventId: "event-1",
        method: "admin_tap",
      }),
    );
  });

  it("creates archived marketplace listing metadata with member contact fields", async () => {
    await createListing({
      title: "Chair",
      price: 5000,
      description: "Good condition",
      condition: "good",
      status: "archived",
      imageURL: null,
      contactInstruction: "Message the admin",
    });

    expect(mockTransactionSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        contactEmail: "admin@tiwani.app",
        contactPhone: "+2348012345678",
        title: "Chair",
        status: "archived",
        postedBy: "admin-1",
      }),
    );
  });

  it("sends admin announcements through backend push delivery", async () => {
    const result = await sendAnnouncement({
      title: "Meeting reminder",
      body: "The meeting starts at 10 AM.",
      type: "event",
    });

    expect(mockSendAnnouncementPushCallable).toHaveBeenCalledWith({
      title: "Meeting reminder",
      body: "The meeting starts at 10 AM.",
      type: "event",
    });
    expect(result.delivered).toBe(1);
  });

  it("uploads Library PDFs to Firebase Storage before saving metadata", async () => {
    mockGet.mockResolvedValueOnce({
      exists: () => true,
      id: "generated-id",
      data: () => ({
        id: "generated-id",
        title: "Tiwani Constitution",
        description: "Current constitution",
        category: "constitutional",
        type: "constitution",
        documentDate: null,
        uploadedAt: new Date("2026-06-01"),
        uploadedBy: "admin-1",
        uploadedByName: "Admin User",
        status: "published",
        visibility: "all_members",
        fileName: "constitution.pdf",
        fileURL: "https://storage.example/document.pdf",
        storagePath: "organisations/tiwani-org-v1/library/generated-id/constitution.pdf",
        fileType: "pdf",
        fileSize: 1024,
      }),
    });

    await createLibraryDocument({
      title: "Tiwani Constitution",
      description: "Current constitution",
      category: "constitutional",
      type: "constitution",
      documentDate: null,
      status: "published",
      visibility: "all_members",
      fileName: "constitution.pdf",
      fileURL: null,
      storagePath: null,
      fileType: "pdf",
      fileSize: 1024,
      uploadFile: {
        uri: "file:///tmp/constitution.pdf",
        name: "constitution.pdf",
        size: 1024,
        mimeType: "application/pdf",
      },
    });

    expect(mockStorageRef).toHaveBeenCalledWith(
      "organisations/tiwani-org-v1/library/generated-id/constitution.pdf",
    );
    expect(mockStoragePutFile).toHaveBeenCalledWith(
      "file:///tmp/constitution.pdf",
      { contentType: "application/pdf" },
    );
    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
      fileURL: "https://storage.example/document.pdf",
      storagePath: "organisations/tiwani-org-v1/library/generated-id/constitution.pdf",
      fileType: "pdf",
    }));
  });

  it("creates member accounts through Cloud Functions", async () => {
    mockGet.mockResolvedValueOnce({
      exists: () => true,
      id: "member-1",
      data: () => ({
        uid: "member-1",
        fullName: "Ada Member",
        email: "ada@example.com",
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
      }),
    });

    const member = await createMember({
      fullName: "Ada Member",
      email: "ada@example.com",
      phone: "555-0100",
      role: "member",
      status: "active",
      financialStatus: "green",
      outstandingBalance: 0,
      address: "",
      maritalStatus: "single",
      children: [],
    });

    expect(mockCreateMemberAccountCallable).toHaveBeenCalledWith(expect.objectContaining({
      fullName: "Ada Member",
      email: "ada@example.com",
    }));
    expect(member.setupDelivery?.setupEmailSent).toBe(true);
  });

  it("casts election ballots through Cloud Functions", async () => {
    mockGet.mockResolvedValueOnce({
      exists: () => true,
      id: "election-1",
      data: () => ({
        ballotType: "secret",
        expiresAt: new Date("2026-12-31T23:59:59.000Z"),
        races: [
          {
            candidates: [
              {
                manifestoLine: "",
                name: "Ada Member",
                photoURL: null,
                uid: "member-1",
              },
            ],
            raceId: "president",
            title: "President",
          },
        ],
        resultVisibility: "after_close",
        status: "open",
        title: "Executive Election",
      }),
    });
    mockCastElectionBallotCallable.mockResolvedValueOnce({
      ballotReceipt: "receipt-1",
      electionId: "election-1",
      ok: true,
    });

    await expect(
      castElectionBallot("election-1", { president: "Ada Member" }, "voter-1"),
    ).resolves.toBe("receipt-1");

    expect(mockCastElectionBallotCallable).toHaveBeenCalledWith(
      "election-1",
      { president: "Ada Member" },
    );
  });

  it("rejects date-only child rows before updating member records", async () => {
    await expect(
      updateMember("member-1", {
        children: [{ name: "", dateOfBirth: "2020-03-04" }],
      }),
    ).rejects.toThrow("Enter a name for each child.");

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("rejects creating an already closed poll", async () => {
    await expect(
      createPoll({
        title: "Meeting venue",
        question: "Where should we meet?",
        status: "closed",
        expiresAt: new Date("2026-12-31T23:59:59.000Z"),
        options: ["Hall", "Garden"],
      }),
    ).rejects.toThrow("Create the poll as draft or open");
  });

  it("routes poll edits through Cloud Functions", async () => {
    await updatePoll("poll-1", {
      title: "Updated venue",
      question: "Where should we meet?",
      status: "open",
      expiresAt: new Date("2026-12-31T23:59:59.000Z"),
      options: ["Hall", "Garden"],
    });

    expect(mockUpdatePollCallable).toHaveBeenCalledWith("poll-1", {
      title: "Updated venue",
      question: "Where should we meet?",
      status: "open",
      expiresAt: new Date("2026-12-31T23:59:59.000Z"),
      options: ["Hall", "Garden"],
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("does not pass protected library fields into document updates", async () => {
    await updateLibraryDocument("doc-1", {
      id: "replacement-id",
      title: "Updated title",
      uploadedBy: "member-1",
      uploadedByName: "Someone Else",
      uploadedAt: new Date("2026-01-01"),
    });

    expect(mockUpdate).toHaveBeenCalledWith({ title: "Updated title" });
  });
});
