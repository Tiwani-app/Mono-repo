import {
  ContributionEntry,
  ContributionPool,
  ContributionWithdrawRequest,
} from "../types/contributions";
import { DataSyncSnapshotMeta } from "../types/sync";
import {
  closeContributionPoolCallable,
  createContributionPoolCallable,
  recordBulkContributionsCallable,
  recordContributionCallable,
  recordContributionPayoutCallable,
  requestContributionWithdrawalCallable,
  reviewContributionWithdrawalCallable,
} from "./cloudFunctionsService";
import {
  contributionEntryFromRecord,
  contributionPoolFromRecord,
  contributionWithdrawRequestFromRecord,
} from "./converters/contributionsConverter";
import { startOrgSubscription } from "./firebaseHelpers";

export interface ContributionPoolInput {
  name: string;
  expectedAmount: number;
  endDate: Date | null;
  note: string;
}

export interface RecordContributionInput {
  memberId: string;
  amount: number;
  paymentMethod: string;
  reference: string;
  note: string;
  poolId?: string;
}

export interface BulkContributionInput {
  memberIds: string[];
  amount: number;
  paymentMethod: string;
  reference: string;
  note: string;
  poolId?: string;
}

export interface WithdrawRequestInput {
  amount: number;
  reason: string;
  poolId?: string;
}

export const subscribeToContributionPools = (
  callback: (pools: ContributionPool[]) => void,
  onError?: (error: Error) => void,
  onSnapshotMeta?: (meta: DataSyncSnapshotMeta) => void,
) =>
  startOrgSubscription(
    "contribution_pools",
    contributionPoolFromRecord,
    callback,
    undefined,
    onError,
    onSnapshotMeta,
  );

export const subscribeToContributions = (
  uid: string | null,
  callback: (entries: ContributionEntry[]) => void,
  onError?: (error: Error) => void,
  onSnapshotMeta?: (meta: DataSyncSnapshotMeta) => void,
) =>
  startOrgSubscription(
    "contributions",
    contributionEntryFromRecord,
    callback,
    (query) => (uid ? query.where("memberId", "==", uid) : query),
    onError,
    onSnapshotMeta,
  );

export const subscribeToWithdrawRequests = (
  uid: string | null,
  callback: (requests: ContributionWithdrawRequest[]) => void,
  onError?: (error: Error) => void,
  onSnapshotMeta?: (meta: DataSyncSnapshotMeta) => void,
) =>
  startOrgSubscription(
    "contribution_withdraw_requests",
    contributionWithdrawRequestFromRecord,
    callback,
    (query) => (uid ? query.where("memberId", "==", uid) : query),
    onError,
    onSnapshotMeta,
  );

export const createContributionPool = async (
  data: ContributionPoolInput,
): Promise<void> => {
  await createContributionPoolCallable(data);
};

export const closeContributionPool = async (poolId: string): Promise<void> => {
  const id = poolId.trim();
  if (!id) {
    throw new Error("Contribution pool is required.");
  }
  await closeContributionPoolCallable(id);
};

export const recordContribution = async (
  data: RecordContributionInput,
): Promise<void> => {
  await recordContributionCallable(data);
};

export const recordBulkContributions = async (
  data: BulkContributionInput,
): Promise<number> => {
  const result = await recordBulkContributionsCallable(data);
  return result.count;
};

export const requestContributionWithdrawal = async (
  data: WithdrawRequestInput,
): Promise<void> => {
  await requestContributionWithdrawalCallable(data);
};

export const reviewContributionWithdrawal = async (
  requestId: string,
  decision: "approve" | "reject",
  reviewNote = "",
): Promise<void> => {
  const id = requestId.trim();
  if (!id) {
    throw new Error("Withdrawal request is required.");
  }
  await reviewContributionWithdrawalCallable(id, decision, reviewNote);
};

export const recordContributionPayout = async (data: {
  requestId: string;
  paymentMethod: string;
  reference: string;
  note: string;
}): Promise<void> => {
  const id = data.requestId.trim();
  if (!id) {
    throw new Error("Withdrawal request is required.");
  }
  await recordContributionPayoutCallable({
    ...data,
    requestId: id,
  });
};
