import {
  LibraryCategory,
  LibraryDocument,
  LibraryDocumentStatus,
  LibraryDocumentType,
  LibraryDocumentVisibility,
  LibraryFileType,
} from "../types/library";
import {
  isLibraryDocumentTypeAllowed,
  visibleLibraryDocuments,
} from "../utils/libraryGuards";
import { delay, mockLibraryDocuments } from "./mockData";

export type LibraryDocumentInput = Omit<
  LibraryDocument,
  "id" | "uploadedAt" | "uploadedBy" | "uploadedByName"
>;

let documents = mockLibraryDocuments.slice();
const subscribers = new Set<(documents: LibraryDocument[]) => void>();
const categories: LibraryCategory[] = ["constitutional", "minutes_reports"];
const statuses: LibraryDocumentStatus[] = ["draft", "published", "archived"];
const visibilities: LibraryDocumentVisibility[] = ["all_members", "admin_only"];
const fileTypes: LibraryFileType[] = ["pdf", "doc", "docx", "image", "other"];
const supportedFileTypes: LibraryFileType[] = ["pdf", "doc", "docx", "image"];
const urlPattern = /^https?:\/\/\S+$/i;
const emitDocuments = () => {
  subscribers.forEach((callback) =>
    callback(visibleLibraryDocuments(documents, true)),
  );
};

export const subscribeToLibraryDocuments = (
  callback: (documents: LibraryDocument[]) => void,
  includeAdmin = false,
) => {
  const subscriber = () =>
    callback(visibleLibraryDocuments(documents, includeAdmin));
  subscribers.add(subscriber);
  subscriber();
  return () => {
    subscribers.delete(subscriber);
  };
};

export const getLibraryDocument = async (
  documentId: string,
  includeAdmin = false,
): Promise<LibraryDocument> => {
  await delay();
  const document = documents.find((item) => item.id === documentId);
  if (
    !document ||
    !visibleLibraryDocuments([document], includeAdmin).some(
      (visibleDocument) => visibleDocument.id === documentId,
    )
  ) {
    throw new Error("Document not found.");
  }
  return document;
};

const normalizeLibraryDocumentInput = (
  data: LibraryDocumentInput,
): LibraryDocumentInput => {
  const fileURL = data.fileURL?.trim() ?? "";
  return {
    ...data,
    title: data.title.trim(),
    description: data.description.trim(),
    fileName: data.fileName.trim(),
    fileURL: fileURL || null,
  };
};

const validateLibraryDocumentInput = (data: LibraryDocumentInput) => {
  if (!data.title) {
    throw new Error("Document title is required.");
  }
  if (!data.description) {
    throw new Error("Document description is required.");
  }
  if (!categories.includes(data.category)) {
    throw new Error("Document category is invalid.");
  }
  if (!isLibraryDocumentTypeAllowed(data.category, data.type)) {
    throw new Error("Document type is invalid for this category.");
  }
  if (
    data.documentDate !== null &&
    (!(data.documentDate instanceof Date) ||
      Number.isNaN(data.documentDate.getTime()))
  ) {
    throw new Error("Document date is invalid.");
  }
  if (!statuses.includes(data.status)) {
    throw new Error("Document status is invalid.");
  }
  if (!visibilities.includes(data.visibility)) {
    throw new Error("Document visibility is invalid.");
  }
  if (!data.fileName) {
    throw new Error("File name is required.");
  }
  if (!fileTypes.includes(data.fileType)) {
    throw new Error("Document file type is invalid.");
  }
  if (!supportedFileTypes.includes(data.fileType)) {
    throw new Error("Unsupported file type.");
  }
  if (data.fileURL && !urlPattern.test(data.fileURL)) {
    throw new Error("A valid document file URL is required.");
  }
  if (
    data.fileSize !== null &&
    (!Number.isFinite(data.fileSize) || data.fileSize < 0)
  ) {
    throw new Error("Document file size must be zero or more.");
  }
};

const libraryDocumentInputFromUpdate = (
  document: LibraryDocument,
  data: Partial<LibraryDocument>,
): LibraryDocumentInput => {
  const has = (key: keyof LibraryDocument) =>
    Object.prototype.hasOwnProperty.call(data, key);

  return {
    title: has("title") ? (data.title as string) : document.title,
    description: has("description")
      ? (data.description as string)
      : document.description,
    category: has("category")
      ? (data.category as LibraryCategory)
      : document.category,
    type: has("type") ? (data.type as LibraryDocumentType) : document.type,
    documentDate: has("documentDate")
      ? (data.documentDate as Date | null)
      : document.documentDate,
    status: has("status")
      ? (data.status as LibraryDocumentStatus)
      : document.status,
    visibility: has("visibility")
      ? (data.visibility as LibraryDocumentVisibility)
      : document.visibility,
    fileName: has("fileName") ? (data.fileName as string) : document.fileName,
    fileURL: has("fileURL")
      ? (data.fileURL as string | null)
      : document.fileURL,
    fileType: has("fileType")
      ? (data.fileType as LibraryFileType)
      : document.fileType,
    fileSize: has("fileSize")
      ? (data.fileSize as number | null)
      : document.fileSize,
  };
};

export const createLibraryDocument = async (
  data: LibraryDocumentInput,
): Promise<LibraryDocument> => {
  await delay();
  const normalized = normalizeLibraryDocumentInput(data);
  validateLibraryDocumentInput(normalized);
  const document: LibraryDocument = {
    ...normalized,
    id: `doc-${Date.now()}`,
    uploadedAt: new Date(),
    uploadedBy: "admin-1",
    uploadedByName: "Chukwuemeka Obi",
  };
  documents = [document, ...documents];
  emitDocuments();
  return document;
};

export const updateLibraryDocument = async (
  documentId: string,
  data: Partial<LibraryDocument>,
): Promise<void> => {
  await delay();
  const existingDocument = documents.find(
    (document) => document.id === documentId,
  );
  if (!existingDocument) {
    throw new Error("Document not found.");
  }
  const normalized = normalizeLibraryDocumentInput(
    libraryDocumentInputFromUpdate(existingDocument, data),
  );
  validateLibraryDocumentInput(normalized);
  documents = documents.map((document) =>
    document.id === documentId ? { ...document, ...normalized } : document,
  );
  emitDocuments();
};

export const setLibraryDocumentStatus = async (
  documentId: string,
  status: LibraryDocumentStatus,
): Promise<void> => {
  await updateLibraryDocument(documentId, { status });
};

export const unarchiveLibraryDocument = async (
  documentId: string,
): Promise<void> => {
  await setLibraryDocumentStatus(documentId, "published");
};

export const deleteLibraryDocument = async (
  documentId: string,
): Promise<void> => {
  await delay();
  if (!documents.some((document) => document.id === documentId)) {
    throw new Error("Document not found.");
  }
  documents = documents.filter((document) => document.id !== documentId);
  emitDocuments();
};

export const getLibraryDocumentURL = async (
  documentId: string,
  includeAdmin = false,
): Promise<string | null> => {
  const document = await getLibraryDocument(documentId, includeAdmin);
  return document.fileURL;
};
