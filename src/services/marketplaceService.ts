import { Listing } from "../types/marketplace";
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
>;

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
) =>
  startOrgSubscription(
    "marketplace",
    listingFromRecord,
    (listings) =>
      callback(
        includeArchived ? listings : visibleMarketplaceListings(listings),
      ),
    undefined,
    onError,
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
  await database.runTransaction(async (transaction) => {
    transaction.set(listingRef, {
      listingId: listingRef.id,
      orgId,
      ...data,
      title: data.title.trim(),
      description: data.description.trim(),
      imageURL: data.imageURL?.trim() || null,
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
  data: Partial<Listing>,
): Promise<void> => {
  const database = firestore();
  const ref = database.collection("marketplace").doc(id);
  await getCurrentOrgId();
  const profile = await getCurrentUserRecord();
  await database.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) {
      throw new Error("Listing not found.");
    }
    const current = snapshot.data() as ListingInput;
    const next = { ...current, ...data };
    validateListing(next);
    transaction.update(ref, {
      ...data,
      ...(data.title !== undefined ? { title: data.title.trim() } : {}),
      ...(data.description !== undefined
        ? { description: data.description.trim() }
        : {}),
      ...(data.imageURL !== undefined
        ? { imageURL: data.imageURL?.trim() || null }
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
