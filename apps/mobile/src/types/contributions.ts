export type ContributionEntryType = "contribution" | "payout";
export type ContributionPoolStatus = "active" | "closed";
export type WithdrawRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "paid";

export interface ContributionPool {
  id: string;
  name: string;
  expectedAmount: number;
  endDate: Date | null;
  note: string;
  status: ContributionPoolStatus;
  totalContributed: number;
  totalWithdrawn: number;
  contributorCount: number;
  createdBy?: string;
  createdByName?: string;
  createdByEmail?: string;
  createdByPhone?: string;
  createdAt: Date | null;
  closedAt: Date | null;
}

export interface ContributionEntry {
  id: string;
  uid: string;
  poolId: string;
  type: ContributionEntryType;
  label: string;
  amount: number;
  paymentMethod?: string;
  reference?: string;
  note: string;
  recordedBy?: string;
  recordedByName?: string;
  recordedByEmail?: string;
  recordedByPhone?: string;
  withdrawRequestId?: string;
  createdAt: Date | null;
  paidAt: Date | null;
}

export interface ContributionWithdrawRequest {
  id: string;
  uid: string;
  memberName?: string;
  poolId: string;
  amount: number;
  reason: string;
  status: WithdrawRequestStatus;
  reviewNote: string;
  reviewedBy?: string;
  reviewedByName?: string;
  payoutEntryId?: string;
  createdAt: Date | null;
  reviewedAt: Date | null;
  paidAt: Date | null;
}

export type FinanceDomain = "contributions" | "dues";
