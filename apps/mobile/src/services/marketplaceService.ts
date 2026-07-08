import { Listing } from "../types/marketplace";
import { firebaseStorage } from "../config/firebase";
import { DataSyncSnapshotMeta } from "../types/sync";
import { visibleMarketplaceListings } from "../utils/marketplaceGuards";
import { listingFromRecord } from "./converters/marketplaceConverter";
import {
  currentUid,
  firestore,
  getCurrentOrgId,
  getCurrentUserRecord,
  serverTimestamp,
  startOrgSubscription,
} from "./firebaseHelpers";

export type ListingInput = Omit<
  Listing,
  | "id"
  | "postedBy"
  | "postedByName"
  | "contactPhone"
  | "contactEmail"
  | "createdAt"
  | "updatedAt"
> & {
  uploadImage?: ListingImageUploadFile | null;
};

export interface ListingImageUploadFile {
  uri: string;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
}

const MAX_LISTING_IMAGE_BYTES = 5 * 1024 * 1024;

const sanitizeStorageFileName = (name: string) =>
  name
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "listing-image.jpg";

const extensionForImage = (file: ListingImageUploadFile) => {
  if (file.mimeType === "image/png") {
    return "png";
  }
  if (file.mimeType === "image/webp") {
    return "webp";
  }
  if (file.mimeType === "image/heic") {
    return "heic";
  }
  const extension = file.fileName?.split(".").pop()?.toLowerCase();
  return extension && ["jpg", "jpeg", "png", "webp", "heic"].includes(extension)
    ? extension
    : "jpg";
};

const assertListingImageUpload = (file: ListingImageUploadFile) => {
  if (file.mimeType && !file.mimeType.startsWith("image/")) {
    throw new Error("Choose an image file for this listing.");
  }
  if (file.fileSize !== null && file.fileSize > MAX_LISTING_IMAGE_BYTES) {
    throw new Error("Listing images must be 5MB or smaller.");
  }
};

const uploadListingImage = async (
  orgId: string,
  listingId: string,
  file: ListingImageUploadFile,
): Promise<string> => {
  assertListingImageUpload(file);
  const extension = extensionForImage(file);
  const fileName = sanitizeStorageFileName(
    file.fileName ?? `listing-image-${Date.now()}.${extension}`,
  );
  const storagePath = `organisations/${orgId}/marketplace/${listingId}/${Date.now()}-${fileName}`;
  const ref = firebaseStorage().ref(storagePath);
  await ref.putFile(file.uri, {
    contentType: file.mimeType ?? `image/${extension === "jpg" ? "jpeg" : extension}`,
  });
  return ref.getDownloadURL();
};

const contactFromProfile = (profile: Record<string, unknown>) => ({
  contactPhone:
    typeof profile.phone === "string" && profile.phone.trim()
      ? profile.phone.trim()
      : null,
  contactEmail:
    typeof profile.email === "string" && profile.email.trim()
      ? profile.email.trim()
      : null,
});

const validateListing = (data: ListingInput) => {
  if (!data.title.trim()) {
    throw new Error("Listing title is required.");
  }
  if (!Number.isFinite(data.price) || data.price <= 0) {
    throw new Error("Listing price must be greater than zero.");
  }
  if (!data.description.trim()) {
    throw new Error("Listing description is required.");
  }
  if (data.description.trim().length > 120) {
    throw new Error("Description must be 120 characters or less.");
  }
  if (!data.contactInstruction.trim()) {
    throw new Error("Contact instruction is required.");
  }
};

export const subscribeToListings = (
  callback: (listings: Listing[]) => void,
  includeArchived = false,
  onError?: (error: Error) => void,
  onSnapshotMeta?: (meta: DataSyncSnapshotMeta) => void,
) =>
  startOrgSubscription(
    "marketplace",
    listingFromRecord,
    (listings) =>
      callback(
        includeArchived ? listings : visibleMarketplaceListings(listings),
      ),
    includeArchived
      ? undefined
      : (query) => query.where("status", "==", "available"),
    onError,
    onSnapshotMeta,
  );

export const getListing = async (id: string): Promise<Listing> => {
  const snapshot = await firestore().collection("marketplace").doc(id).get();
  if (!snapshot.exists()) {
    throw new Error("Listing not found.");
  }
  return listingFromRecord({ id: snapshot.id, ...(snapshot.data() ?? {}) });
};

export const createListing = async (data: ListingInput): Promise<void> => {
  validateListing(data);
  const database = firestore();
  const [orgId, profile] = await Promise.all([
    getCurrentOrgId(),
    getCurrentUserRecord(),
  ]);
  const listingRef = database.collection("marketplace").doc();
  const imageURL = data.uploadImage
    ? await uploadListingImage(orgId, listingRef.id, data.uploadImage)
    : data.imageURL?.trim() || null;
  const listingData = { ...data };
  delete listingData.uploadImage;
  await database.runTransaction(async (transaction) => {
    transaction.set(listingRef, {
      listingId: listingRef.id,
      orgId,
      ...listingData,
      title: data.title.trim(),
      description: data.description.trim(),
      imageURL,
      contactInstruction: data.contactInstruction.trim(),
      postedBy: currentUid(),
      postedByName:
        typeof profile.fullName === "string" ? profile.fullName.trim() : "",
      ...contactFromProfile(profile),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
};

export const updateListing = async (
  id: string,
  data: Partial<Listing> & { uploadImage?: ListingImageUploadFile | null },
): Promise<void> => {
  const database = firestore();
  const ref = database.collection("marketplace").doc(id);
  const orgId = await getCurrentOrgId();
  const profile = await getCurrentUserRecord();
  const imageURL = data.uploadImage
    ? await uploadListingImage(orgId, id, data.uploadImage)
    : data.imageURL;
  const listingData = { ...data };
  delete listingData.uploadImage;
  await database.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) {
      throw new Error("Listing not found.");
    }
    const current = snapshot.data() as ListingInput;
    const next = {
      ...current,
      ...listingData,
      ...(imageURL !== undefined ? { imageURL } : {}),
    };
    validateListing(next);
    transaction.update(ref, {
      ...listingData,
      ...(data.title !== undefined ? { title: data.title.trim() } : {}),
      ...(data.description !== undefined
        ? { description: data.description.trim() }
        : {}),
      ...(imageURL !== undefined
        ? { imageURL: imageURL?.trim() || null }
        : {}),
      ...(data.contactInstruction !== undefined
        ? { contactInstruction: data.contactInstruction.trim() }
        : {}),
      ...contactFromProfile(profile),
      updatedAt: serverTimestamp(),
    });
  });
};

export const archiveListing = async (id: string): Promise<void> => {
  await updateListing(id, { status: "archived" });
};

export const unarchiveListing = async (id: string): Promise<void> => {
  await updateListing(id, { status: "available" });
};

export const deleteListing = async (id: string): Promise<void> => {
  await firestore().collection("marketplace").doc(id).delete();
};
