import {
  LibraryDocument,
  LibraryDocumentStatus,
} from "../types/library";
import { firebaseStorage } from "../config/firebase";
import { libraryDocumentFromRecord } from "./converters/libraryConverter";
import {
  currentUid,
  firestore,
  getCurrentOrgId,
  getCurrentUserRecord,
  serverTimestamp,
  startOrgSubscription,
} from "./firebaseHelpers";

export type LibraryDocumentInput = Omit<
  LibraryDocument,
  "id" | "uploadedAt" | "uploadedBy" | "uploadedByName"
> & {
  uploadFile?: LibraryUploadFile | null;
};

export interface LibraryUploadFile {
  uri: string;
  name: string;
  size: number | null;
  mimeType: string | null;
}

type UploadedLibraryFileMetadata = Pick<
  LibraryDocument,
  "fileName" | "fileURL" | "fileSize" | "fileType" | "storagePath"
>;

const MAX_LIBRARY_UPLOAD_BYTES = 20 * 1024 * 1024;

const sanitizeStorageFileName = (name: string) =>
  name
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "library-document.pdf";

const assertPdfUpload = (file: LibraryUploadFile) => {
  const lowerName = file.name.trim().toLowerCase();
  if (!lowerName.endsWith(".pdf") && file.mimeType !== "application/pdf") {
    throw new Error("Library uploads currently support PDF files only.");
  }
  if (file.size !== null && file.size > MAX_LIBRARY_UPLOAD_BYTES) {
    throw new Error("Library PDF uploads must be 20MB or smaller.");
  }
};

const uploadLibraryFile = async (
  orgId: string,
  documentId: string,
  file: LibraryUploadFile,
): Promise<UploadedLibraryFileMetadata> => {
  assertPdfUpload(file);
  const storagePath = `organisations/${orgId}/library/${documentId}/${sanitizeStorageFileName(file.name)}`;
  const ref = firebaseStorage().ref(storagePath);
  await ref.putFile(file.uri, { contentType: "application/pdf" });
  const fileURL = await ref.getDownloadURL();
  return {
    fileName: file.name.trim(),
    fileURL,
    fileSize: file.size,
    fileType: "pdf" as const,
    storagePath,
  };
};

export const subscribeToLibraryDocuments = (
  callback: (documents: LibraryDocument[]) => void,
  includeAdmin = false,
  onError?: (error: Error) => void,
) =>
  startOrgSubscription(
    "library_documents",
    libraryDocumentFromRecord,
    callback,
    (query) =>
      includeAdmin
        ? query
        : query
            .where("status", "==", "published")
            .where("visibility", "==", "all_members"),
    onError,
  );

export const getLibraryDocument = async (
  documentId: string,
  _includeAdmin = false,
): Promise<LibraryDocument> => {
  const snapshot = await firestore()
    .collection("library_documents")
    .doc(documentId)
    .get();
  if (!snapshot.exists()) {
    throw new Error("Document not found.");
  }
  return libraryDocumentFromRecord({
    id: snapshot.id,
    ...(snapshot.data() ?? {}),
  });
};

export const createLibraryDocument = async (
  data: LibraryDocumentInput,
): Promise<LibraryDocument> => {
  const [orgId, uploader] = await Promise.all([
    getCurrentOrgId(),
    getCurrentUserRecord(),
  ]);
  const ref = firestore().collection("library_documents").doc();
  const { uploadFile, ...documentData } = data;
  const uploadData: Partial<UploadedLibraryFileMetadata> = uploadFile
    ? await uploadLibraryFile(orgId, ref.id, uploadFile)
    : {};
  await ref.set({
    documentId: ref.id,
    orgId,
    ...documentData,
    ...uploadData,
    title: data.title.trim(),
    description: data.description.trim(),
    fileName: uploadData.fileName ?? data.fileName.trim(),
    fileURL: uploadData.fileURL ?? (data.fileURL?.trim() || null),
    fileSize: uploadData.fileSize ?? data.fileSize,
    fileType: uploadData.fileType ?? data.fileType,
    storagePath: uploadData.storagePath ?? data.storagePath ?? null,
    uploadedBy: currentUid(),
    uploadedByName:
      typeof uploader.fullName === "string" ? uploader.fullName : "",
    uploadedAt: serverTimestamp(),
  });
  return getLibraryDocument(ref.id, true);
};

export const updateLibraryDocument = async (
  documentId: string,
  data: Partial<LibraryDocument> & { uploadFile?: LibraryUploadFile | null },
): Promise<void> => {
  const orgId = await getCurrentOrgId();
  const uploadData: Partial<UploadedLibraryFileMetadata> = data.uploadFile
    ? await uploadLibraryFile(orgId, documentId, data.uploadFile)
    : {};
  const editableFields: (keyof LibraryDocument)[] = [
    "title",
    "description",
    "category",
    "type",
    "documentDate",
    "status",
    "visibility",
    "fileName",
    "fileURL",
    "storagePath",
    "fileType",
    "fileSize",
  ];
  const updates = Object.fromEntries(
    editableFields
      .filter((field) => Object.prototype.hasOwnProperty.call(data, field))
      .map((field) => [field, data[field]]),
  );
  await firestore()
    .collection("library_documents")
    .doc(documentId)
    .update({
      ...updates,
      ...uploadData,
    });
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
  await firestore().collection("library_documents").doc(documentId).delete();
};

export const getLibraryDocumentURL = async (
  documentId: string,
  includeAdmin = false,
): Promise<string | null> => {
  const document = await getLibraryDocument(documentId, includeAdmin);
  if (document.fileURL) {
    return document.fileURL;
  }
  return document.storagePath
    ? firebaseStorage().ref(document.storagePath).getDownloadURL()
    : null;
};
