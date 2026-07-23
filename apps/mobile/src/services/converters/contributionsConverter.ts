import {
  ContributionEntry,
  ContributionEntryType,
  ContributionPool,
  ContributionPoolStatus,
  ContributionWithdrawRequest,
  WithdrawRequestStatus,
} from "../../types/contributions";
import {
  RawRecord,
  asNullableDate,
  asNullableString,
  requiredEnum,
  requiredNumber,
  requiredString,
} from "./shared";

const entryTypes: ContributionEntryType[] = ["contribution", "payout"];
const poolStatuses: ContributionPoolStatus[] = ["active", "closed"];
const withdrawStatuses: WithdrawRequestStatus[] = [
  "pending",
  "approved",
  "rejected",
  "paid",
];

export const contributionPoolFromRecord = (
  record: RawRecord,
): ContributionPool => {
  const createdBy = asNullableString(record.createdBy);
  const createdByName = asNullableString(record.createdByName);
  const createdByEmail = asNullableString(record.createdByEmail);
  const createdByPhone = asNullableString(record.createdByPhone);
  return {
    id: requiredString(record, "id"),
    name: requiredString({ name: record.label }, "name"),
    expectedAmount:
      typeof record.expectedAmount === "number" ? record.expectedAmount : 0,
    endDate: asNullableDate(record.endDate, "endDate"),
    note: typeof record.note === "string" ? record.note : "",
    status: requiredEnum(record.status, poolStatuses, "status"),
    totalContributed: requiredNumber(record, "totalContributed"),
    totalWithdrawn: requiredNumber(record, "totalWithdrawn"),
    contributorCount: requiredNumber(record, "contributorCount"),
    ...(createdBy ? { createdBy } : {}),
    ...(createdByName ? { createdByName } : {}),
    ...(createdByEmail ? { createdByEmail } : {}),
    ...(createdByPhone ? { createdByPhone } : {}),
    createdAt: asNullableDate(record.createdAt, "createdAt"),
    closedAt: asNullableDate(record.closedAt, "closedAt"),
  };
};

export const contributionEntryFromRecord = (
  record: RawRecord,
): ContributionEntry => {
  const paymentMethod = asNullableString(record.paymentMethod);
  const reference = asNullableString(record.reference);
  const recordedBy = asNullableString(record.recordedBy);
  const recordedByName = asNullableString(record.recordedByName);
  const recordedByEmail = asNullableString(record.recordedByEmail);
  const recordedByPhone = asNullableString(record.recordedByPhone);
  const withdrawRequestId = asNullableString(record.withdrawRequestId);
  return {
    id: requiredString(record, "id"),
    uid: requiredString({ uid: record.memberId }, "uid"),
    poolId: requiredString(record, "poolId"),
    type: requiredEnum(record.type, entryTypes, "type"),
    label: requiredString(record, "label"),
    amount: requiredNumber(record, "amount"),
    ...(paymentMethod ? { paymentMethod } : {}),
    ...(reference ? { reference } : {}),
    note: typeof record.note === "string" ? record.note : "",
    ...(recordedBy ? { recordedBy } : {}),
    ...(recordedByName ? { recordedByName } : {}),
    ...(recordedByEmail ? { recordedByEmail } : {}),
    ...(recordedByPhone ? { recordedByPhone } : {}),
    ...(withdrawRequestId ? { withdrawRequestId } : {}),
    createdAt: asNullableDate(record.createdAt, "createdAt"),
    paidAt: asNullableDate(record.paidAt, "paidAt"),
  };
};

export const contributionWithdrawRequestFromRecord = (
  record: RawRecord,
): ContributionWithdrawRequest => {
  const memberName = asNullableString(record.memberName);
  const reviewedBy = asNullableString(record.reviewedBy);
  const reviewedByName = asNullableString(record.reviewedByName);
  const payoutEntryId = asNullableString(record.payoutEntryId);
  return {
    id: requiredString(record, "id"),
    uid: requiredString({ uid: record.memberId }, "uid"),
    ...(memberName ? { memberName } : {}),
    poolId: requiredString(record, "poolId"),
    amount: requiredNumber(record, "amount"),
    reason: typeof record.reason === "string" ? record.reason : "",
    status: requiredEnum(record.status, withdrawStatuses, "status"),
    reviewNote: typeof record.reviewNote === "string" ? record.reviewNote : "",
    ...(reviewedBy ? { reviewedBy } : {}),
    ...(reviewedByName ? { reviewedByName } : {}),
    ...(payoutEntryId ? { payoutEntryId } : {}),
    createdAt: asNullableDate(record.createdAt, "createdAt"),
    reviewedAt: asNullableDate(record.reviewedAt, "reviewedAt"),
    paidAt: asNullableDate(record.paidAt, "paidAt"),
  };
};
