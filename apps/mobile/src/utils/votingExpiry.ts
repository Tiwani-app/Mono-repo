import { Election, Poll } from "../types/voting";

type ExpirableVotingItem = Pick<Poll | Election, "expiresAt" | "status">;

export const isVotingItemExpired = (
  item: ExpirableVotingItem,
  now = new Date(),
) =>
  item.status === "open" &&
  item.expiresAt instanceof Date &&
  !Number.isNaN(item.expiresAt.getTime()) &&
  item.expiresAt.getTime() <= now.getTime();

export const canAcceptVotingInput = (
  item: ExpirableVotingItem,
  now = new Date(),
) => item.status === "open" && !isVotingItemExpired(item, now);

export const votingDisplayStatus = (
  item: ExpirableVotingItem,
  now = new Date(),
) => (isVotingItemExpired(item, now) ? "expired" : item.status);

// Active means still open for participation (draft or open, not past
// expiry); closed collects closed and expired items for the bottom sections.
export const partitionVotingItems = <T extends ExpirableVotingItem>(
  items: T[],
  now = new Date(),
) => {
  const isClosed = (item: T) =>
    item.status === "closed" || isVotingItemExpired(item, now);
  return {
    active: items.filter((item) => !isClosed(item)),
    closed: items.filter(isClosed),
  };
};
