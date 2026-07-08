import { Listing } from "../types/marketplace";
import { User } from "../types/user";
import { isAdmin } from "./roleGuard";

export const canManageMarketplaceListings = (user: User | null) =>
  isAdmin(user);

export const isVisibleMarketplaceListing = (listing: Listing) =>
  listing.status !== "archived";

export const visibleMarketplaceListings = (listings: Listing[]) =>
  listings.filter(isVisibleMarketplaceListing);

export const canAddMarketplaceListing = (_listings: Listing[]) => true;

export const marketplaceListingSlotsUsed = (listings: Listing[]) =>
  visibleMarketplaceListings(listings).length;

export const marketplaceListingSlotsRemaining = (_listings: Listing[]) =>
  Number.POSITIVE_INFINITY;
