import { LibraryDocument, LibraryDocumentStatus } from "../types/library";
import { sortLibraryDocuments } from "../utils/libraryFilters";
import { delay, mockLibraryDocuments } from "./mockData";

let documents = mockLibraryDocuments.slice();
const subscribers = new Set<(documents: LibraryDocument[]) => void>();

const visibleDocuments = (includeAdmin = false) =>
  sortLibraryDocuments(
    documents.filter((document) =>
      includeAdmin
        ? true
        : document.status === "published" && document.visibility === "all_members",
    ),
  );

const emitDocuments = () => {
  subscribers.forEach((callback) => callback(visibleDocuments(true)));
};

export const subscribeToLibraryDocuments = (
  callback: (documents: LibraryDocument[]) => void,
  includeAdmin = false,
) => {
  const subscriber = () => callback(visibleDocuments(includeAdmin));
  subscribers.add(subscriber);
  subscriber();
  return () => {
    subscribers.delete(subscriber);
  };
};

export const getLibraryDocument = async (
  documentId: string,
): Promise<LibraryDocument> => {
  await delay();
  const document = documents.find((item) => item.id === documentId);
  if (!document) {
    throw new Error("Document not found.");
  }
  return document;
};

export const createLibraryDocument = async (
  data: Omit<LibraryDocument, "id" | "uploadedAt" | "uploadedBy" | "uploadedByName">,
): Promise<LibraryDocument> => {
  await delay();
  const document: LibraryDocument = {
    ...data,
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
  if (!documents.some((document) => document.id === documentId)) {
    throw new Error("Document not found.");
  }
  documents = documents.map((document) =>
    document.id === documentId ? { ...document, ...data } : document,
  );
  emitDocuments();
};

export const setLibraryDocumentStatus = async (
  documentId: string,
  status: LibraryDocumentStatus,
): Promise<void> => {
  await updateLibraryDocument(documentId, { status });
};

export const unarchiveLibraryDocument = async (documentId: string): Promise<void> => {
  await setLibraryDocumentStatus(documentId, "published");
};

export const deleteLibraryDocument = async (documentId: string): Promise<void> => {
  await delay();
  if (!documents.some((document) => document.id === documentId)) {
    throw new Error("Document not found.");
  }
  documents = documents.filter((document) => document.id !== documentId);
  emitDocuments();
};

export const getLibraryDocumentURL = async (
  documentId: string,
): Promise<string | null> => {
  const document = await getLibraryDocument(documentId);
  return document.fileURL;
};
