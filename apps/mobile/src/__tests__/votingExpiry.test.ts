import {
  isVotingItemExpired,
  partitionVotingItems,
  votingDisplayStatus,
} from "../utils/votingExpiry";

const now = new Date("2026-07-08T12:00:00.000Z");
const past = new Date("2026-07-01T12:00:00.000Z");
const future = new Date("2026-07-15T12:00:00.000Z");

describe("votingExpiry", () => {
  it("treats only open items past their expiry as expired", () => {
    expect(isVotingItemExpired({ status: "open", expiresAt: past }, now)).toBe(
      true,
    );
    expect(
      isVotingItemExpired({ status: "open", expiresAt: future }, now),
    ).toBe(false);
    expect(
      isVotingItemExpired({ status: "closed", expiresAt: past }, now),
    ).toBe(false);
    expect(isVotingItemExpired({ status: "open", expiresAt: null }, now)).toBe(
      false,
    );
  });

  it("reports expired as the display status", () => {
    expect(votingDisplayStatus({ status: "open", expiresAt: past }, now)).toBe(
      "expired",
    );
    expect(
      votingDisplayStatus({ status: "open", expiresAt: future }, now),
    ).toBe("open");
  });

  it("partitions closed and expired items below active ones, keeping order within each group", () => {
    const items = [
      { id: "expired-1", status: "open" as const, expiresAt: past },
      { id: "open-1", status: "open" as const, expiresAt: future },
      { id: "closed-1", status: "closed" as const, expiresAt: past },
      { id: "expired-2", status: "open" as const, expiresAt: past },
      { id: "draft-1", status: "draft" as const, expiresAt: null },
    ];

    const { active, closed } = partitionVotingItems(items, now);

    expect(active.map((item) => item.id)).toEqual(["open-1", "draft-1"]);
    expect(closed.map((item) => item.id)).toEqual([
      "expired-1",
      "closed-1",
      "expired-2",
    ]);
  });
});
