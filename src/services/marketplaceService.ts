import { Listing } from "../types/marketplace";
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

const emitListings = () => {
  subscribers.forEach((subscriber) => {
    subscriber.callback(
      subscriber.includeArchived ? listings : visibleMarketplaceListings(listings),
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

export const createListing = async (data: ListingInput): Promise<void> => {
  await delay();
  if (data.status !== "archived" && !canAddMarketplaceListing(listings)) {
    throw new Error("Marketplace listings are limited to 2 active items.");
  }
  const now = new Date();
  listings = [
    ...listings,
    {
      ...data,
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
  const nextStatus = data.status ?? currentListing.status;
  if (
    currentListing.status === "archived" &&
    nextStatus !== "archived" &&
    !canAddMarketplaceListing(listings.filter((listing) => listing.id !== id))
  ) {
    throw new Error("Marketplace listings are limited to 2 active items.");
  }
  listings = listings.map((listing) =>
    listing.id === id ? { ...listing, ...data, updatedAt: new Date() } : listing,
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
