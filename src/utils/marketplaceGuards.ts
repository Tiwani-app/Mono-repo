import { Listing } from "../types/marketplace";

export const MARKETPLACE_VISIBLE_LISTING_LIMIT = 2;

export const visibleMarketplaceListings = (listings: Listing[]) =>
  listings.slice(0, MARKETPLACE_VISIBLE_LISTING_LIMIT);

export const canAddMarketplaceListing = (listings: Listing[]) =>
  visibleMarketplaceListings(listings).length < MARKETPLACE_VISIBLE_LISTING_LIMIT;
