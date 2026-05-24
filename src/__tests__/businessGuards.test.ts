import { LibraryDocument } from "../types/library";
import { Listing } from "../types/marketplace";
import { Election } from "../types/voting";
import {
  filterLibraryDocumentsByCategory,
  filterLibraryDocumentsBySearch,
  filterLibraryDocumentsByTypeAndYear,
  sortLibraryDocuments,
} from "../utils/libraryFilters";
import {
  canAddMarketplaceListing,
  visibleMarketplaceListings,
} from "../utils/marketplaceGuards";
import {
  canViewMemberPrivateDetails,
  getVisibleMemberProfileTabs,
} from "../utils/memberPrivacy";
import { isElectionBallotComplete } from "../utils/votingGuards";
import { User } from "../types/user";

const election: Election = {
  id: "election-1",
  title: "Executive Election",
  ballotType: "secret",
  status: "open",
  races: [
    {
      raceId: "president",
      office: "President",
      candidates: [],
    },
    {
      raceId: "treasurer",
      office: "Treasurer",
      candidates: [],
    },
  ],
};

const listing = (id: string): Listing => ({
  id,
  title: `Listing ${id}`,
  price: 100,
  description: "Test listing",
  condition: "good",
  status: "available",
  imageURL: null,
  postedBy: "admin-1",
  postedByName: "Admin",
  contactInstruction: "Message admin",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
});

const document = (
  id: string,
  overrides: Partial<LibraryDocument>,
): LibraryDocument => ({
  id,
  title: `Document ${id}`,
  description: "Association document",
  category: "constitutional",
  type: "constitution",
  documentDate: null,
  uploadedAt: new Date("2026-01-01"),
  uploadedBy: "admin-1",
  uploadedByName: "Admin",
  status: "published",
  visibility: "all_members",
  fileName: `${id}.pdf`,
  fileURL: null,
  fileType: "pdf",
  fileSize: null,
  ...overrides,
});

const user = (uid: string, role: User["role"]): User => ({
  uid,
  fullName: "Test User",
  email: `${uid}@example.com`,
  phone: "",
  photoURL: null,
  role,
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
  currencySymbol: "₦",
  timezone: "WAT",
});

describe("business guardrails", () => {
  it("requires one election choice per race", () => {
    expect(isElectionBallotComplete(election, {})).toBe(false);
    expect(isElectionBallotComplete(election, { president: "Ada" })).toBe(false);
    expect(
      isElectionBallotComplete(election, {
        president: "Ada",
        treasurer: "Ngozi",
      }),
    ).toBe(true);
  });

  it("enforces the marketplace visible listing cap", () => {
    const listings = [listing("1"), listing("2"), listing("3")];

    expect(visibleMarketplaceListings(listings).map(item => item.id)).toEqual([
      "1",
      "2",
    ]);
    expect(canAddMarketplaceListing([])).toBe(true);
    expect(canAddMarketplaceListing([listing("1")])).toBe(true);
    expect(canAddMarketplaceListing([listing("1"), listing("2")])).toBe(false);
  });

  it("sorts and filters library documents", () => {
    const docs = [
      document("old", {
        title: "Old Minutes",
        category: "minutes_reports",
        type: "meeting_minutes",
        documentDate: new Date("2026-01-15"),
      }),
      document("new", {
        title: "New Constitution",
        description: "Updated governance reference",
        documentDate: new Date("2026-04-01"),
      }),
      document("uploaded", {
        title: "Uploaded Report",
        category: "minutes_reports",
        type: "financial_report",
        uploadedAt: new Date("2026-03-01"),
      }),
    ];

    expect(sortLibraryDocuments(docs).map(item => item.id)).toEqual([
      "new",
      "uploaded",
      "old",
    ]);
    expect(filterLibraryDocumentsBySearch(docs, "governance")).toEqual([
      docs[1],
    ]);
    expect(filterLibraryDocumentsByCategory(docs, "minutes_reports")).toEqual([
      docs[0],
      docs[2],
    ]);
    expect(
      filterLibraryDocumentsByTypeAndYear(docs, "financial_report", "2026"),
    ).toEqual([docs[2]]);
  });

  it("hides private member tabs from ordinary members viewing others", () => {
    const member = user("member-1", "member");

    expect(canViewMemberPrivateDetails(user("admin-1", "admin"), member)).toBe(
      true,
    );
    expect(canViewMemberPrivateDetails(user("member-1", "member"), member)).toBe(
      true,
    );
    expect(canViewMemberPrivateDetails(user("member-2", "member"), member)).toBe(
      false,
    );
    expect(getVisibleMemberProfileTabs(user("member-2", "member"), member)).toEqual([
      "info",
    ]);
    expect(getVisibleMemberProfileTabs(user("admin-1", "admin"), member)).toEqual([
      "info",
      "family",
      "finance",
    ]);
  });
});
