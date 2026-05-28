import { Listing } from "../types/marketplace";
import { User } from "../types/user";
import { isAdmin } from "./roleGuard";

export const MARKETPLACE_VISIBLE_LISTING_LIMIT = 2;

export const canManageMarketplaceListings = (user: User | null) =>
  isAdmin(user);

export const isVisibleMarketplaceListing = (listing: Listing) =>
  listing.status !== "archived";

export const visibleMarketplaceListings = (listings: Listing[]) =>
  listings
    .filter(isVisibleMarketplaceListing)
    .slice(0, MARKETPLACE_VISIBLE_LISTING_LIMIT);

export const canAddMarketplaceListing = (listings: Listing[]) =>
  visibleMarketplaceListings(listings).length <
  MARKETPLACE_VISIBLE_LISTING_LIMIT;

export const marketplaceListingSlotsUsed = (listings: Listing[]) =>
  visibleMarketplaceListings(listings).length;

export const marketplaceListingSlotsRemaining = (listings: Listing[]) =>
  Math.max(
    0,
    MARKETPLACE_VISIBLE_LISTING_LIMIT - marketplaceListingSlotsUsed(listings),
  );
