export type LibraryCategory = "constitutional" | "minutes_reports";

export type LibraryDocumentType =
  | "constitution"
  | "by_laws"
  | "rules_regulations"
  | "code_of_conduct"
  | "meeting_minutes"
  | "financial_report"
  | "committee_report"
  | "other";

export type LibraryDocumentStatus = "draft" | "published" | "archived";
export type LibraryDocumentVisibility = "all_members" | "admin_only";
export type LibraryFileType = "pdf" | "doc" | "docx" | "image" | "other";

export interface LibraryDocument {
  id: string;
  title: string;
  description: string;
  category: LibraryCategory;
  type: LibraryDocumentType;
  documentDate: Date | null;
  uploadedAt: Date;
  uploadedBy: string;
  uploadedByName: string;
  status: LibraryDocumentStatus;
  visibility: LibraryDocumentVisibility;
  fileName: string;
  fileURL: string | null;
  storagePath: string | null;
  fileType: LibraryFileType;
  fileSize: number | null;
}

export const LIBRARY_CATEGORY_LABELS: Record<LibraryCategory, string> = {
  constitutional: "Constitutional Documents",
  minutes_reports: "Minutes & Reports",
};

export const LIBRARY_TYPE_LABELS: Record<LibraryDocumentType, string> = {
  constitution: "Constitution",
  by_laws: "By-laws",
  rules_regulations: "Rules & Regulations",
  code_of_conduct: "Code of Conduct",
  meeting_minutes: "Meeting Minutes",
  financial_report: "Financial Report",
  committee_report: "Committee Report",
  other: "Other",
};
