import { LibraryDocument } from "../types/library";
import { Listing } from "../types/marketplace";
import { JoinRequest, User } from "../types/user";
import type { LibraryDocumentInput } from "../services/libraryService";
import type { ListingInput } from "../services/marketplaceService";

const loadIsolatedService = <T>(path: string): T => {
  let service: T | undefined;
  jest.isolateModules(() => {
    service = require(path);
  });
  return service as T;
};

type LibraryService = typeof import("../services/libraryService");
type MarketplaceService = typeof import("../services/marketplaceService");
type MembersService = typeof import("../services/membersService");

const libraryDocumentInput: LibraryDocumentInput = {
  title: "Board Resolution",
  description: "Approved board decision for member records.",
  category: "minutes_reports",
  type: "committee_report",
  documentDate: new Date("2026-05-01"),
  status: "draft",
  visibility: "admin_only",
  fileName: "board-resolution.pdf",
  fileURL: null,
  fileType: "pdf",
  fileSize: null,
};

describe("service workflows", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("runs the Library document create, publish, update, archive, and delete flow", async () => {
    const service = loadIsolatedService<LibraryService>(
      "../services/libraryService",
    );
    const adminSnapshots: LibraryDocument[][] = [];
    const memberSnapshots: LibraryDocument[][] = [];

    const unsubscribeAdmin = service.subscribeToLibraryDocuments(
      (documents) => adminSnapshots.push(documents),
      true,
    );
    const unsubscribeMember = service.subscribeToLibraryDocuments((documents) =>
      memberSnapshots.push(documents),
    );

    const created = await service.createLibraryDocument(libraryDocumentInput);
    expect(created.uploadedByName).toBe("Chukwuemeka Obi");
    expect(adminSnapshots.at(-1)?.some((item) => item.id === created.id)).toBe(
      true,
    );
    expect(memberSnapshots.at(-1)?.some((item) => item.id === created.id)).toBe(
      false,
    );

    await service.setLibraryDocumentStatus(created.id, "published");
    expect(memberSnapshots.at(-1)?.some((item) => item.id === created.id)).toBe(
      false,
    );

    await service.updateLibraryDocument(created.id, {
      title: "Published Board Resolution",
      visibility: "all_members",
    });
    expect(
      memberSnapshots.at(-1)?.find((item) => item.id === created.id)?.title,
    ).toBe("Published Board Resolution");

    await service.setLibraryDocumentStatus(created.id, "archived");
    expect(memberSnapshots.at(-1)?.some((item) => item.id === created.id)).toBe(
      false,
    );

    await service.unarchiveLibraryDocument(created.id);
    expect(
      adminSnapshots.at(-1)?.find((item) => item.id === created.id)?.status,
    ).toBe("published");
    expect(memberSnapshots.at(-1)?.some((item) => item.id === created.id)).toBe(
      true,
    );

    await service.deleteLibraryDocument(created.id);
    await expect(service.getLibraryDocument(created.id)).rejects.toThrow(
      "Document not found.",
    );
    expect(adminSnapshots.at(-1)?.some((item) => item.id === created.id)).toBe(
      false,
    );
    expect(memberSnapshots.at(-1)?.some((item) => item.id === created.id)).toBe(
      false,
    );

    unsubscribeAdmin();
    unsubscribeMember();
  });

  it("keeps draft, archived, and admin-only Library documents out of member subscriptions", async () => {
    const service = loadIsolatedService<LibraryService>(
      "../services/libraryService",
    );
    const memberSnapshots: LibraryDocument[][] = [];
    const unsubscribeMember = service.subscribeToLibraryDocuments((documents) =>
      memberSnapshots.push(documents),
    );

    const draft = await service.createLibraryDocument({
      ...libraryDocumentInput,
      title: "Draft Minutes",
      status: "draft",
      visibility: "all_members",
    });
    const adminOnly = await service.createLibraryDocument({
      ...libraryDocumentInput,
      title: "Admin Finance Notes",
      status: "published",
      visibility: "admin_only",
    });
    const published = await service.createLibraryDocument({
      ...libraryDocumentInput,
      title: "Member Public Report",
      status: "published",
      visibility: "all_members",
    });

    expect(memberSnapshots.at(-1)?.some((item) => item.id === draft.id)).toBe(
      false,
    );
    expect(
      memberSnapshots.at(-1)?.some((item) => item.id === adminOnly.id),
    ).toBe(false);
    expect(
      memberSnapshots.at(-1)?.some((item) => item.id === published.id),
    ).toBe(true);

    await service.setLibraryDocumentStatus(published.id, "archived");
    expect(
      memberSnapshots.at(-1)?.some((item) => item.id === published.id),
    ).toBe(false);

    unsubscribeMember();
  });

  it("blocks direct member access to hidden Library documents", async () => {
    const service = loadIsolatedService<LibraryService>(
      "../services/libraryService",
    );

    const hiddenDocument = await service.createLibraryDocument({
      ...libraryDocumentInput,
      status: "draft",
      visibility: "admin_only",
      fileURL: "https://example.com/board-resolution.pdf",
    });

    await expect(service.getLibraryDocument(hiddenDocument.id)).rejects.toThrow(
      "Document not found.",
    );
    await expect(
      service.getLibraryDocumentURL(hiddenDocument.id),
    ).rejects.toThrow("Document not found.");

    await expect(
      service.getLibraryDocument(hiddenDocument.id, true),
    ).resolves.toMatchObject({ id: hiddenDocument.id });
    await expect(
      service.getLibraryDocumentURL(hiddenDocument.id, true),
    ).resolves.toBe("https://example.com/board-resolution.pdf");
  });

  it("validates Library document metadata and ignores protected update fields", async () => {
    const service = loadIsolatedService<LibraryService>(
      "../services/libraryService",
    );

    await expect(
      service.createLibraryDocument({
        ...libraryDocumentInput,
        title: " ",
      }),
    ).rejects.toThrow("Document title is required.");

    await expect(
      service.createLibraryDocument({
        ...libraryDocumentInput,
        category: "constitutional",
        type: "meeting_minutes",
      }),
    ).rejects.toThrow("Document type is invalid for this category.");

    await expect(
      service.createLibraryDocument({
        ...libraryDocumentInput,
        fileURL: "not-a-url",
      }),
    ).rejects.toThrow("A valid document file URL is required.");

    await expect(
      service.createLibraryDocument({
        ...libraryDocumentInput,
        fileSize: -1,
      }),
    ).rejects.toThrow("Document file size must be zero or more.");

    await service.updateLibraryDocument("doc-1", {
      title: "  Updated Constitution ",
      uploadedByName: "Changed Admin",
    });

    const document = await service.getLibraryDocument("doc-1");
    expect(document.title).toBe("Updated Constitution");
    expect(document.uploadedByName).toBe("Chukwuemeka Obi");
  });

  it("runs the marketplace cap, status, delete, and create flow", async () => {
    const service = loadIsolatedService<MarketplaceService>(
      "../services/marketplaceService",
    );
    const snapshots: Listing[][] = [];
    const input: ListingInput = {
      title: "Community Laptop",
      price: 120000,
      description: "Clean laptop available for member purchase.",
      condition: "good",
      status: "available",
      imageURL: "https://example.com/laptop.jpg",
      contactInstruction: "Message the admin to inspect.",
    };

    const unsubscribe = service.subscribeToListings((listings) =>
      snapshots.push(listings),
    );

    expect(snapshots.at(-1)?.length).toBe(2);
    await expect(service.createListing(input)).rejects.toThrow(
      "Marketplace listings are limited to 2 active items.",
    );

    await service.updateListing("listing-1", { status: "sold" });
    expect(
      snapshots.at(-1)?.find((item) => item.id === "listing-1")?.status,
    ).toBe("sold");

    await service.archiveListing("listing-2");
    expect(snapshots.at(-1)?.map((item) => item.id)).toEqual(["listing-1"]);

    await service.createListing(input);
    expect(snapshots.at(-1)?.length).toBe(2);

    await expect(service.unarchiveListing("listing-2")).rejects.toThrow(
      "Marketplace listings are limited to 2 active items.",
    );

    await service.deleteListing("listing-2");
    expect(
      snapshots.at(-1)?.find((item) => item.title === "Community Laptop")
        ?.imageURL,
    ).toBe("https://example.com/laptop.jpg");

    unsubscribe();
  });

  it("validates marketplace listing input and ignores protected update fields", async () => {
    const service = loadIsolatedService<MarketplaceService>(
      "../services/marketplaceService",
    );

    await expect(
      service.createListing({
        title: " ",
        price: 120000,
        description: "Clean laptop available for member purchase.",
        condition: "good",
        status: "archived",
        imageURL: "https://example.com/laptop.jpg",
        contactInstruction: "Message the admin to inspect.",
      }),
    ).rejects.toThrow("Listing title is required.");

    await expect(
      service.createListing({
        title: "Community Laptop",
        price: 0,
        description: "Clean laptop available for member purchase.",
        condition: "good",
        status: "archived",
        imageURL: "https://example.com/laptop.jpg",
        contactInstruction: "Message the admin to inspect.",
      }),
    ).rejects.toThrow("Listing price must be greater than zero.");

    await expect(
      service.createListing({
        title: "Community Laptop",
        price: 120000,
        description: "Clean laptop available for member purchase.",
        condition: "excellent",
        status: "archived",
        imageURL: "https://example.com/laptop.jpg",
        contactInstruction: "Message the admin to inspect.",
      } as any),
    ).rejects.toThrow("Listing condition is invalid.");

    await expect(
      service.createListing({
        title: "Community Laptop",
        price: 120000,
        description: "Clean laptop available for member purchase.",
        condition: "good",
        status: "archived",
        imageURL: "not-a-url",
        contactInstruction: "Message the admin to inspect.",
      }),
    ).rejects.toThrow("A valid listing image URL is required.");

    await service.updateListing("listing-1", {
      title: "  Updated Chair ",
      postedByName: "Changed Poster",
    });
    const listing = await service.getListing("listing-1");
    expect(listing.title).toBe("Updated Chair");
    expect(listing.postedByName).toBe("Chukwuemeka Obi");
  });

  it("reviews a join request and creates a member on approval", async () => {
    const service = loadIsolatedService<MembersService>(
      "../services/membersService",
    );
    const requestSnapshots: JoinRequest[][] = [];
    const memberSnapshots: User[][] = [];

    const unsubscribeRequests = service.subscribeToJoinRequests((requests) =>
      requestSnapshots.push(requests),
    );
    const unsubscribeMembers = service.subscribeToMembers((members) =>
      memberSnapshots.push(members),
    );

    await service.reviewJoinRequest("join-1", "approved", "admin-1");

    const reviewedRequest = requestSnapshots
      .at(-1)
      ?.find((request) => request.id === "join-1");
    expect(reviewedRequest?.status).toBe("approved");
    expect(reviewedRequest?.reviewedBy).toBe("admin-1");
    expect(reviewedRequest?.reviewedAt).toBeInstanceOf(Date);

    const createdMember = memberSnapshots
      .at(-1)
      ?.find((member) => member.email === "amaka@example.com");
    expect(createdMember?.fullName).toBe("Amaka Eze");
    expect(createdMember?.role).toBe("member");
    expect(createdMember?.status).toBe("active");

    unsubscribeRequests();
    unsubscribeMembers();
  });

  it("validates member create and edit input", async () => {
    const service = loadIsolatedService<MembersService>(
      "../services/membersService",
    );

    await expect(
      service.createMember({
        fullName: " ",
        email: "new@example.com",
        phone: "08000000000",
        role: "member",
        status: "active",
        financialStatus: "green",
        outstandingBalance: 0,
        address: "Lagos",
      }),
    ).rejects.toThrow("Member name is required.");

    await expect(
      service.createMember({
        fullName: "New Member",
        email: "not-an-email",
        phone: "08000000000",
        role: "member",
        status: "active",
        financialStatus: "green",
        outstandingBalance: 0,
        address: "Lagos",
      }),
    ).rejects.toThrow("A valid email is required.");

    await expect(
      service.createMember({
        fullName: "New Member",
        email: "new@example.com",
        phone: "08000000000",
        role: "member",
        status: "active",
        financialStatus: "green",
        outstandingBalance: -1,
        address: "Lagos",
      }),
    ).rejects.toThrow("Outstanding balance must be zero or more.");

    await expect(
      service.updateMember("member-1", { email: "admin@tiwani.app" }),
    ).rejects.toThrow("A member with this email already exists.");
  });

  it("validates join request input and review state", async () => {
    const service = loadIsolatedService<MembersService>(
      "../services/membersService",
    );

    await expect(
      service.createJoinRequest({
        fullName: "Pending Duplicate",
        email: "amaka@example.com",
        phone: "08000000000",
        message: "Please review.",
      }),
    ).rejects.toThrow("A pending join request already exists for this email.");

    await expect(
      service.createJoinRequest({
        fullName: "Existing Member",
        email: "member@tiwani.app",
        phone: "08000000000",
        message: "Please review.",
      }),
    ).rejects.toThrow("A member with this email already exists.");

    await service.reviewJoinRequest("join-1", "declined", "admin-1");
    await expect(
      service.reviewJoinRequest("join-1", "approved", "admin-1"),
    ).rejects.toThrow("Join request has already been reviewed.");
  });

  it("normalizes profile edits and ignores non-profile fields", async () => {
    const service = loadIsolatedService<MembersService>(
      "../services/membersService",
    );

    await service.updateMemberProfile("member-1", {
      fullName: "  Ada Member  ",
      phone: " 08011112222 ",
      address: "  Lagos Mainland ",
      photoURL: " https://example.com/avatar.jpg ",
      role: "admin",
    } as any);

    const member = await service.getMember("member-1");
    expect(member).toMatchObject({
      fullName: "Ada Member",
      phone: "08011112222",
      address: "Lagos Mainland",
      photoURL: "https://example.com/avatar.jpg",
      role: "member",
    });
  });

  it("validates member profile edits", async () => {
    const service = loadIsolatedService<MembersService>(
      "../services/membersService",
    );

    await expect(
      service.updateMemberProfile("member-1", { fullName: " " }),
    ).rejects.toThrow("Full name is required.");
    await expect(
      service.updateMemberProfile("member-1", { phone: " " }),
    ).rejects.toThrow("Phone number is required.");
    await expect(
      service.updateMemberProfile("member-1", { photoURL: "not-a-url" }),
    ).rejects.toThrow("A valid photo URL is required.");
  });

  it("declines a join request without creating a member", async () => {
    const service = loadIsolatedService<MembersService>(
      "../services/membersService",
    );
    await service.createJoinRequest({
      fullName: "Declined Person",
      email: "declined@example.com",
      phone: "08000000000",
      message: "Please review.",
    });

    const requestSnapshots: JoinRequest[][] = [];
    const memberSnapshots: User[][] = [];
    const unsubscribeRequests = service.subscribeToJoinRequests((requests) =>
      requestSnapshots.push(requests),
    );
    const unsubscribeMembers = service.subscribeToMembers((members) =>
      memberSnapshots.push(members),
    );
    const requestId = requestSnapshots
      .at(-1)
      ?.find((request) => request.email === "declined@example.com")?.id;

    expect(requestId).toBeTruthy();
    await service.reviewJoinRequest(requestId as string, "declined", "admin-1");

    expect(
      requestSnapshots.at(-1)?.find((request) => request.id === requestId)
        ?.status,
    ).toBe("declined");
    expect(
      memberSnapshots
        .at(-1)
        ?.some((member) => member.email === "declined@example.com"),
    ).toBe(false);

    unsubscribeRequests();
    unsubscribeMembers();
  });
});
