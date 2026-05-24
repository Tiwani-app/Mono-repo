import { LibraryDocument } from "../types/library";
import { JoinRequest, User } from "../types/user";

const loadIsolatedService = <T>(path: string): T => {
  let service: T | undefined;
  jest.isolateModules(() => {
    service = require(path);
  });
  return service as T;
};

type LibraryService = typeof import("../services/libraryService");
type MembersService = typeof import("../services/membersService");

const libraryDocumentInput: Omit<
  LibraryDocument,
  "id" | "uploadedAt" | "uploadedBy" | "uploadedByName"
> = {
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
    const service = loadIsolatedService<LibraryService>("../services/libraryService");
    const adminSnapshots: LibraryDocument[][] = [];
    const memberSnapshots: LibraryDocument[][] = [];

    const unsubscribeAdmin = service.subscribeToLibraryDocuments(
      documents => adminSnapshots.push(documents),
      true,
    );
    const unsubscribeMember = service.subscribeToLibraryDocuments(documents =>
      memberSnapshots.push(documents),
    );

    const created = await service.createLibraryDocument(libraryDocumentInput);
    expect(created.uploadedByName).toBe("Chukwuemeka Obi");
    expect(adminSnapshots.at(-1)?.some(item => item.id === created.id)).toBe(true);
    expect(memberSnapshots.at(-1)?.some(item => item.id === created.id)).toBe(false);

    await service.setLibraryDocumentStatus(created.id, "published");
    expect(memberSnapshots.at(-1)?.some(item => item.id === created.id)).toBe(false);

    await service.updateLibraryDocument(created.id, {
      title: "Published Board Resolution",
      visibility: "all_members",
    });
    expect(
      memberSnapshots.at(-1)?.find(item => item.id === created.id)?.title,
    ).toBe("Published Board Resolution");

    await service.setLibraryDocumentStatus(created.id, "archived");
    expect(memberSnapshots.at(-1)?.some(item => item.id === created.id)).toBe(false);

    await service.deleteLibraryDocument(created.id);
    await expect(service.getLibraryDocument(created.id)).rejects.toThrow(
      "Document not found.",
    );
    expect(adminSnapshots.at(-1)?.some(item => item.id === created.id)).toBe(false);

    unsubscribeAdmin();
    unsubscribeMember();
  });

  it("reviews a join request and creates a member on approval", async () => {
    const service = loadIsolatedService<MembersService>("../services/membersService");
    const requestSnapshots: JoinRequest[][] = [];
    const memberSnapshots: User[][] = [];

    const unsubscribeRequests = service.subscribeToJoinRequests(requests =>
      requestSnapshots.push(requests),
    );
    const unsubscribeMembers = service.subscribeToMembers(members =>
      memberSnapshots.push(members),
    );

    await service.reviewJoinRequest("join-1", "approved", "admin-1");

    const reviewedRequest = requestSnapshots
      .at(-1)
      ?.find(request => request.id === "join-1");
    expect(reviewedRequest?.status).toBe("approved");
    expect(reviewedRequest?.reviewedBy).toBe("admin-1");
    expect(reviewedRequest?.reviewedAt).toBeInstanceOf(Date);

    const createdMember = memberSnapshots
      .at(-1)
      ?.find(member => member.email === "amaka@example.com");
    expect(createdMember?.fullName).toBe("Amaka Eze");
    expect(createdMember?.role).toBe("member");
    expect(createdMember?.status).toBe("active");

    unsubscribeRequests();
    unsubscribeMembers();
  });

  it("declines a join request without creating a member", async () => {
    const service = loadIsolatedService<MembersService>("../services/membersService");
    await service.createJoinRequest({
      fullName: "Declined Person",
      email: "declined@example.com",
      phone: "08000000000",
      message: "Please review.",
    });

    const requestSnapshots: JoinRequest[][] = [];
    const memberSnapshots: User[][] = [];
    const unsubscribeRequests = service.subscribeToJoinRequests(requests =>
      requestSnapshots.push(requests),
    );
    const unsubscribeMembers = service.subscribeToMembers(members =>
      memberSnapshots.push(members),
    );
    const requestId = requestSnapshots
      .at(-1)
      ?.find(request => request.email === "declined@example.com")?.id;

    expect(requestId).toBeTruthy();
    await service.reviewJoinRequest(requestId as string, "declined", "admin-1");

    expect(
      requestSnapshots.at(-1)?.find(request => request.id === requestId)?.status,
    ).toBe("declined");
    expect(
      memberSnapshots
        .at(-1)
        ?.some(member => member.email === "declined@example.com"),
    ).toBe(false);

    unsubscribeRequests();
    unsubscribeMembers();
  });
});
