import { LibraryDocument } from "../types/library";
import { Listing } from "../types/marketplace";
import { Election } from "../types/voting";
import { canViewLedgerForMember } from "../utils/financeGuards";
import {
  filterLibraryDocumentsByCategory,
  filterLibraryDocumentsBySearch,
  filterLibraryDocumentsByTypeAndYear,
  sortLibraryDocuments,
} from "../utils/libraryFilters";
import {
  canManageLibraryDocuments,
  canViewLibraryManagement,
  isLibraryDocumentTypeAllowed,
  isPublishedMemberLibraryDocument,
  visibleLibraryDocuments,
} from "../utils/libraryGuards";
import {
  canManageMarketplaceListings,
  canAddMarketplaceListing,
  marketplaceListingSlotsRemaining,
  marketplaceListingSlotsUsed,
  visibleMarketplaceListings,
} from "../utils/marketplaceGuards";
import {
  canViewMemberPrivateDetails,
  getVisibleMemberProfileTabs,
  sanitizeMemberProfile,
} from "../utils/memberPrivacy";
import { isElectionBallotComplete } from "../utils/votingGuards";
import {
  canStandForElection,
  findFinanciallyBlockedCandidateNames,
} from "../utils/votingGuards";
import { User } from "../types/user";
import { canViewElectionResults } from "../utils/roleGuard";

const election: Election = {
  id: "election-1",
  title: "Executive Election",
  ballotType: "secret",
  status: "open",
  resultVisibility: "after_close",
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
    expect(isElectionBallotComplete(election, { president: "Ada" })).toBe(
      false,
    );
    expect(
      isElectionBallotComplete(election, {
        president: "Ada",
        treasurer: "Ngozi",
      }),
    ).toBe(true);
  });

  it("allows admins and electoral chairmen to view election results", () => {
    expect(canViewElectionResults(user("admin-1", "admin"))).toBe(true);
    expect(canViewElectionResults(user("chair-1", "electoral_chairman"))).toBe(
      true,
    );
    expect(canViewElectionResults(user("member-1", "member"))).toBe(false);
  });

  it("blocks financially red members from candidacy when matched to directory", () => {
    const redMember = {
      ...user("member-1", "member"),
      fullName: "Tiwalade Adebayo",
      financialStatus: "red" as const,
    };
    const greenMember = {
      ...user("member-2", "member"),
      fullName: "Nkiru Okafor",
      financialStatus: "green" as const,
    };

    expect(canStandForElection(greenMember)).toBe(true);
    expect(canStandForElection(redMember)).toBe(false);
    expect(
      findFinanciallyBlockedCandidateNames(
        ["Tiwalade Adebayo", "Unknown Candidate", "Nkiru Okafor"],
        [redMember, greenMember],
      ),
    ).toEqual(["Tiwalade Adebayo"]);
  });

  it("enforces the marketplace visible listing cap", () => {
    const archivedListing = {
      ...listing("archived"),
      status: "archived" as const,
    };
    const soldListing = { ...listing("sold"), status: "sold" as const };
    const listings = [listing("1"), archivedListing, soldListing, listing("3")];

    expect(visibleMarketplaceListings(listings).map((item) => item.id)).toEqual(
      ["1", "sold"],
    );
    expect(marketplaceListingSlotsUsed(listings)).toBe(2);
    expect(marketplaceListingSlotsRemaining(listings)).toBe(0);
    expect(canAddMarketplaceListing([])).toBe(true);
    expect(canAddMarketplaceListing([listing("1")])).toBe(true);
    expect(canAddMarketplaceListing([listing("1"), listing("2")])).toBe(false);
    expect(canAddMarketplaceListing([listing("1"), archivedListing])).toBe(
      true,
    );
    expect(canManageMarketplaceListings(user("admin-1", "admin"))).toBe(true);
    expect(canManageMarketplaceListings(user("member-1", "member"))).toBe(
      false,
    );
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

    expect(sortLibraryDocuments(docs).map((item) => item.id)).toEqual([
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

  it("guards Library visibility and management by role", () => {
    const draft = document("draft", { status: "draft" });
    const adminOnly = document("admin", { visibility: "admin_only" });
    const archived = document("archived", { status: "archived" });
    const published = document("published", {
      documentDate: new Date("2026-05-01"),
    });
    const docs = [draft, adminOnly, archived, published];

    expect(canManageLibraryDocuments(user("admin-1", "admin"))).toBe(true);
    expect(canViewLibraryManagement(user("member-1", "member"))).toBe(false);
    expect(
      canViewLibraryManagement(user("chair-1", "electoral_chairman")),
    ).toBe(false);
    expect(isPublishedMemberLibraryDocument(published)).toBe(true);
    expect(isPublishedMemberLibraryDocument(adminOnly)).toBe(false);
    expect(visibleLibraryDocuments(docs).map((item) => item.id)).toEqual([
      "published",
    ]);
    expect(visibleLibraryDocuments(docs, true).map((item) => item.id)).toEqual([
      "published",
      "draft",
      "admin",
      "archived",
    ]);
  });

  it("guards Library document types by category", () => {
    expect(isLibraryDocumentTypeAllowed("constitutional", "constitution")).toBe(
      true,
    );
    expect(
      isLibraryDocumentTypeAllowed("constitutional", "meeting_minutes"),
    ).toBe(false);
    expect(
      isLibraryDocumentTypeAllowed("minutes_reports", "financial_report"),
    ).toBe(true);
    expect(isLibraryDocumentTypeAllowed("minutes_reports", "by_laws")).toBe(
      false,
    );
  });

  it("hides private member tabs from ordinary members viewing others", () => {
    const member = user("member-1", "member");

    expect(canViewMemberPrivateDetails(user("admin-1", "admin"), member)).toBe(
      true,
    );
    expect(
      canViewMemberPrivateDetails(user("member-1", "member"), member),
    ).toBe(true);
    expect(
      canViewMemberPrivateDetails(user("member-2", "member"), member),
    ).toBe(false);
    expect(
      getVisibleMemberProfileTabs(user("member-2", "member"), member),
    ).toEqual(["info"]);
    expect(
      getVisibleMemberProfileTabs(user("admin-1", "admin"), member),
    ).toEqual(["info", "family", "finance"]);
  });

  it("sanitizes partial member profile fields for defensive rendering", () => {
    const profile = sanitizeMemberProfile({
      uid: "member-1",
      fullName: "",
      memberSince: "not-a-date",
      children: [{ name: "", dateOfBirth: "" }],
    });

    expect(profile).toMatchObject({
      displayName: "Unnamed member",
      email: "Not provided",
      phone: "Not provided",
      address: "Not provided",
      maritalStatus: "Not provided",
      memberSince: null,
      spouseName: null,
      children: [{ name: "Child 1", dateOfBirth: "Not provided" }],
    });
  });

  it("limits ledger access to admins or the owning member", () => {
    expect(canViewLedgerForMember(user("admin-1", "admin"), "member-1")).toBe(
      true,
    );
    expect(canViewLedgerForMember(user("member-1", "member"), undefined)).toBe(
      true,
    );
    expect(canViewLedgerForMember(user("member-1", "member"), "member-1")).toBe(
      true,
    );
    expect(canViewLedgerForMember(user("member-1", "member"), "member-2")).toBe(
      false,
    );
    expect(canViewLedgerForMember(null, "member-1")).toBe(false);
  });
});
