import {
  LibraryCategory,
  LibraryDocument,
  LibraryDocumentStatus,
  LibraryDocumentType,
  LibraryDocumentVisibility,
  LibraryFileType,
} from "../../types/library";
import {
  RawRecord,
  asDate,
  asNullableDate,
  asNullableString,
  requiredEnum,
  requiredNumber,
  requiredString,
} from "./shared";

const categories: LibraryCategory[] = ["constitutional", "minutes_reports"];
const documentTypes: LibraryDocumentType[] = [
  "constitution",
  "by_laws",
  "rules_regulations",
  "code_of_conduct",
  "meeting_minutes",
  "financial_report",
  "committee_report",
  "other",
];
const statuses: LibraryDocumentStatus[] = ["draft", "published", "archived"];
const visibilities: LibraryDocumentVisibility[] = ["all_members", "admin_only"];
const fileTypes: LibraryFileType[] = ["pdf", "doc", "docx", "image", "other"];

export const libraryDocumentFromRecord = (
  record: RawRecord,
): LibraryDocument => ({
  id: requiredString(record, "id"),
  title: requiredString(record, "title"),
  description: requiredString(record, "description"),
  category: requiredEnum(record.category, categories, "category"),
  type: requiredEnum(record.type, documentTypes, "type"),
  documentDate: asNullableDate(record.documentDate, "documentDate"),
  uploadedAt: asDate(record.uploadedAt, new Date()),
  uploadedBy: requiredString(record, "uploadedBy"),
  uploadedByName: requiredString(record, "uploadedByName"),
  status: requiredEnum(record.status, statuses, "status"),
  visibility: requiredEnum(record.visibility, visibilities, "visibility"),
  fileName: requiredString(record, "fileName"),
  fileURL: asNullableString(record.fileURL, "fileURL"),
  storagePath: asNullableString(record.storagePath, "storagePath"),
  fileType: requiredEnum(record.fileType, fileTypes, "fileType"),
  fileSize:
    record.fileSize === null || record.fileSize === undefined
      ? null
      : requiredNumber(record, "fileSize"),
});
