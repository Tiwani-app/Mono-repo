import { Listing } from "../types/marketplace";
import { delay, mockListings } from "./mockData";

let listings = mockListings.slice(0, 2);
const subscribers = new Set<(listings: Listing[]) => void>();

export type ListingInput = Omit<
  Listing,
  "id" | "postedBy" | "postedByName" | "createdAt" | "updatedAt"
>;

const emitListings = () => {
  const snapshot = listings.slice(0, 2);
  subscribers.forEach((callback) => callback(snapshot));
};

export const subscribeToListings = (
  callback: (listings: Listing[]) => void,
) => {
  subscribers.add(callback);
  callback(listings.slice(0, 2));
  return () => {
    subscribers.delete(callback);
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
  if (listings.length >= 2) {
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
  listings = listings.map((listing) =>
    listing.id === id ? { ...listing, ...data, updatedAt: new Date() } : listing,
  );
  emitListings();
};

export const deleteListing = async (id: string): Promise<void> => {
  await delay();
  listings = listings.filter((listing) => listing.id !== id);
  emitListings();
};
