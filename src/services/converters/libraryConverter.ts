import {
  LibraryCategory,
  LibraryDocument,
  LibraryDocumentStatus,
  LibraryDocumentType,
  LibraryDocumentVisibility,
  LibraryFileType,
} from '../../types/library';
import {
  DocumentSnapshotLike,
  RawRecord,
  asDate,
  asNullableDate,
  asNullableString,
  asNumber,
  asString,
  enumValue,
  snapshotToRecord,
} from './shared';

const categories: LibraryCategory[] = ['constitutional', 'minutes_reports'];
const documentTypes: LibraryDocumentType[] = [
  'constitution',
  'by_laws',
  'rules_regulations',
  'code_of_conduct',
  'meeting_minutes',
  'financial_report',
  'committee_report',
  'other',
];
const statuses: LibraryDocumentStatus[] = ['draft', 'published', 'archived'];
const visibilities: LibraryDocumentVisibility[] = ['all_members', 'admin_only'];
const fileTypes: LibraryFileType[] = ['pdf', 'doc', 'docx', 'image', 'other'];

export const libraryDocumentFromRecord = (record: RawRecord): LibraryDocument => ({
  id: asString(record.id),
  title: asString(record.title),
  description: asString(record.description),
  category: enumValue(record.category, categories, 'constitutional'),
  type: enumValue(record.type, documentTypes, 'other'),
  documentDate: asNullableDate(record.documentDate),
  uploadedAt: asDate(record.uploadedAt),
  uploadedBy: asString(record.uploadedBy),
  uploadedByName: asString(record.uploadedByName),
  status: enumValue(record.status, statuses, 'draft'),
  visibility: enumValue(record.visibility, visibilities, 'all_members'),
  fileName: asString(record.fileName),
  fileURL: asNullableString(record.fileURL),
  fileType: enumValue(record.fileType, fileTypes, 'other'),
  fileSize: record.fileSize === null ? null : asNumber(record.fileSize),
});

export const libraryDocumentFromSnapshot = (snapshot: DocumentSnapshotLike): LibraryDocument =>
  libraryDocumentFromRecord(snapshotToRecord(snapshot));

