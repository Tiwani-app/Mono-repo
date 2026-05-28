import { Listing, ListingCondition, ListingStatus } from "../types/marketplace";
import {
  canAddMarketplaceListing,
  visibleMarketplaceListings,
} from "../utils/marketplaceGuards";
import { delay, mockListings } from "./mockData";

let listings = mockListings.slice(0, 2);
const subscribers = new Set<{
  callback: (listings: Listing[]) => void;
  includeArchived: boolean;
}>();

export type ListingInput = Omit<
  Listing,
  "id" | "postedBy" | "postedByName" | "createdAt" | "updatedAt"
>;

const listingConditions: ListingCondition[] = [
  "new",
  "like_new",
  "good",
  "fair",
  "used",
];
const listingStatuses: ListingStatus[] = ["available", "sold", "archived"];
const urlPattern = /^https?:\/\/\S+$/i;

const emitListings = () => {
  subscribers.forEach((subscriber) => {
    subscriber.callback(
      subscriber.includeArchived
        ? listings
        : visibleMarketplaceListings(listings),
    );
  });
};

export const subscribeToListings = (
  callback: (listings: Listing[]) => void,
  includeArchived = false,
) => {
  const subscriber = { callback, includeArchived };
  subscribers.add(subscriber);
  callback(includeArchived ? listings : visibleMarketplaceListings(listings));
  return () => {
    subscribers.delete(subscriber);
  };
};

export const getListing = async (id: string): Promise<Listing> => {
  await delay();
  const listing = listings.find((item) => item.id === id);
  if (!listing) {
    throw new Error("Listing not found.");
  }
  return listing;
};

const normalizeListingInput = (data: ListingInput): ListingInput => {
  const imageURL = data.imageURL?.trim() ?? "";
  return {
    ...data,
    title: data.title.trim(),
    description: data.description.trim(),
    contactInstruction: data.contactInstruction.trim(),
    imageURL: imageURL || null,
  };
};

const validateListingInput = (data: ListingInput) => {
  if (!data.title) {
    throw new Error("Listing title is required.");
  }
  if (!Number.isFinite(data.price) || data.price <= 0) {
    throw new Error("Listing price must be greater than zero.");
  }
  if (!data.description) {
    throw new Error("Listing description is required.");
  }
  if (!listingConditions.includes(data.condition)) {
    throw new Error("Listing condition is invalid.");
  }
  if (!listingStatuses.includes(data.status)) {
    throw new Error("Listing status is invalid.");
  }
  if (data.imageURL && !urlPattern.test(data.imageURL)) {
    throw new Error("A valid listing image URL is required.");
  }
  if (!data.contactInstruction) {
    throw new Error("Listing contact instruction is required.");
  }
};

const listingInputFromUpdate = (
  listing: Listing,
  data: Partial<Listing>,
): ListingInput => ({
  title: data.title ?? listing.title,
  price: data.price ?? listing.price,
  description: data.description ?? listing.description,
  condition: data.condition ?? listing.condition,
  status: data.status ?? listing.status,
  imageURL: data.imageURL ?? listing.imageURL,
  contactInstruction: data.contactInstruction ?? listing.contactInstruction,
});

export const createListing = async (data: ListingInput): Promise<void> => {
  await delay();
  const normalized = normalizeListingInput(data);
  validateListingInput(normalized);
  if (normalized.status !== "archived" && !canAddMarketplaceListing(listings)) {
    throw new Error("Marketplace listings are limited to 2 active items.");
  }
  const now = new Date();
  listings = [
    ...listings,
    {
      ...normalized,
      id: `listing-${Date.now()}`,
      postedBy: "admin-1",
      postedByName: "Chukwuemeka Obi",
      createdAt: now,
      updatedAt: now,
    },
  ];
  emitListings();
};

export const updateListing = async (
  id: string,
  data: Partial<Listing>,
): Promise<void> => {
  await delay();
  const currentListing = listings.find((listing) => listing.id === id);
  if (!currentListing) {
    throw new Error("Listing not found.");
  }
  const normalized = normalizeListingInput(
    listingInputFromUpdate(currentListing, data),
  );
  validateListingInput(normalized);
  const nextStatus = normalized.status;
  if (
    currentListing.status === "archived" &&
    nextStatus !== "archived" &&
    !canAddMarketplaceListing(listings.filter((listing) => listing.id !== id))
  ) {
    throw new Error("Marketplace listings are limited to 2 active items.");
  }
  listings = listings.map((listing) =>
    listing.id === id
      ? { ...listing, ...normalized, updatedAt: new Date() }
      : listing,
  );
  emitListings();
};

export const archiveListing = async (id: string): Promise<void> => {
  await updateListing(id, { status: "archived" });
};

export const unarchiveListing = async (id: string): Promise<void> => {
  await updateListing(id, { status: "available" });
};

export const deleteListing = async (id: string): Promise<void> => {
  await delay();
  if (!listings.some((listing) => listing.id === id)) {
    throw new Error("Listing not found.");
  }
  listings = listings.filter((listing) => listing.id !== id);
  emitListings();
};
