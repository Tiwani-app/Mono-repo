import {
  ContributionEntry,
  ContributionWithdrawRequest,
} from "../types/contributions";

export const getContributionTotals = (entries: ContributionEntry[]) => {
  let totalContributed = 0;
  let totalWithdrawn = 0;
  entries.forEach((entry) => {
    if (entry.type === "contribution") {
      totalContributed += entry.amount;
    } else if (entry.type === "payout") {
      totalWithdrawn += entry.amount;
    }
  });
  return {
    totalContributed,
    totalWithdrawn,
    available: Math.max(0, totalContributed - totalWithdrawn),
  };
};

export const getHeldWithdrawAmount = (
  requests: ContributionWithdrawRequest[],
) =>
  requests
    .filter(
      (request) =>
        request.status === "pending" || request.status === "approved",
    )
    .reduce((sum, request) => sum + request.amount, 0);

export const getMemberContributionAvailable = (
  entries: ContributionEntry[],
  requests: ContributionWithdrawRequest[],
  memberId: string,
  poolId?: string,
) => {
  const memberEntries = entries.filter(
    (entry) =>
      entry.uid === memberId && (!poolId || entry.poolId === poolId),
  );
  const memberRequests = requests.filter(
    (request) =>
      request.uid === memberId && (!poolId || request.poolId === poolId),
  );
  const { totalContributed, totalWithdrawn } =
    getContributionTotals(memberEntries);
  const held = getHeldWithdrawAmount(memberRequests);
  return Math.max(0, totalContributed - totalWithdrawn - held);
};
