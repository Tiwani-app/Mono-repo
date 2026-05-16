import { Listing } from "../types/marketplace";
import { delay, mockListings } from "./mockData";

let listings = mockListings.slice(0, 2);
const subscribers = new Set<(listings: Listing[]) => void>();

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

export const createListing = async (
  data: Omit<Listing, "id" | "postedBy" | "postedByName">,
): Promise<void> => {
  await delay();
  if (listings.length >= 2) {
    throw new Error("Marketplace listings are limited to 2 active items.");
  }
  listings = [
    ...listings,
    {
      ...data,
      id: `listing-${Date.now()}`,
      postedBy: "admin-1",
      postedByName: "Chukwuemeka Obi",
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
    listing.id === id ? { ...listing, ...data } : listing,
  );
  emitListings();
};

export const deleteListing = async (id: string): Promise<void> => {
  await delay();
  listings = listings.filter((listing) => listing.id !== id);
  emitListings();
};
