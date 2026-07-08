import {
  LibraryCategory,
  LibraryDocument,
  LibraryDocumentType,
} from "../types/library";
import { User } from "../types/user";
import { isAdmin } from "./roleGuard";
import { sortLibraryDocuments } from "./libraryFilters";

export const documentTypesByLibraryCategory: Record<
  LibraryCategory,
  LibraryDocumentType[]
> = {
  constitutional: [
    "constitution",
    "by_laws",
    "rules_regulations",
    "code_of_conduct",
    "other",
  ],
  minutes_reports: [
    "meeting_minutes",
    "financial_report",
    "committee_report",
    "other",
  ],
};

export const canManageLibraryDocuments = (user: User | null) => isAdmin(user);

export const canViewLibraryManagement = (user: User | null) =>
  canManageLibraryDocuments(user);

export const isPublishedMemberLibraryDocument = (document: LibraryDocument) =>
  document.status === "published" && document.visibility === "all_members";

export const visibleLibraryDocuments = (
  documents: LibraryDocument[],
  includeAdmin = false,
) =>
  sortLibraryDocuments(
    documents.filter((document) =>
      includeAdmin ? true : isPublishedMemberLibraryDocument(document),
    ),
  );

export const isLibraryDocumentTypeAllowed = (
  category: LibraryCategory,
  type: LibraryDocumentType,
) => documentTypesByLibraryCategory[category]?.includes(type) ?? false;
