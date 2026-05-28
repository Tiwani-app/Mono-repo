import {
  Child,
  FinancialStatus,
  JoinRequest,
  MemberStatus,
  NotificationPreferences,
  Role,
  User,
} from "../../types/user";
import {
  DocumentSnapshotLike,
  RawRecord,
  asDate,
  asNullableDate,
  asNullableString,
  asNumber,
  asString,
  enumValue,
  snapshotToRecord,
} from "./shared";
import { DEFAULT_CURRENCY_SYMBOL, getLocalTimezone } from "../../utils/locale";

const roles: Role[] = ["admin", "electoral_chairman", "member"];
const memberStatuses: MemberStatus[] = [
  "active",
  "inactive",
  "suspended",
  "pending",
];
const financialStatuses: FinancialStatus[] = ["green", "red"];
const maritalStatuses: User["maritalStatus"][] = [
  "single",
  "married",
  "divorced",
  "widowed",
];
const requestStatuses: JoinRequest["status"][] = [
  "pending",
  "approved",
  "declined",
];

const preferencesFromRecord = (value: unknown): NotificationPreferences => {
  const record = value && typeof value === "object" ? (value as RawRecord) : {};
  return {
    events: record.events !== false,
    finance: record.finance !== false,
    voting: record.voting !== false,
  };
};

const childrenFromRecord = (value: unknown): Child[] =>
  Array.isArray(value)
    ? value.map((item) => {
        const child =
          item && typeof item === "object" ? (item as RawRecord) : {};
        return {
          name: asString(child.name),
          dateOfBirth: asString(child.dateOfBirth),
        };
      })
    : [];

export const userFromRecord = (record: RawRecord): User => ({
  uid: asString(record.uid, asString(record.id)),
  fullName: asString(record.fullName),
  email: asString(record.email),
  phone: asString(record.phone),
  photoURL: asNullableString(record.photoURL),
  role: enumValue(record.role, roles, "member"),
  status: enumValue(record.status, memberStatuses, "pending"),
  financialStatus: enumValue(
    record.financialStatus,
    financialStatuses,
    "green",
  ),
  outstandingBalance: asNumber(record.outstandingBalance),
  address: asString(record.address),
  maritalStatus: enumValue(record.maritalStatus, maritalStatuses, "single"),
  dateOfBirth: asString(record.dateOfBirth),
  spouseName: asNullableString(record.spouseName),
  spouseDateOfBirth: asNullableString(record.spouseDateOfBirth),
  weddingAnniversary: asNullableString(record.weddingAnniversary),
  children: childrenFromRecord(record.children),
  memberSince: asString(record.memberSince),
  notificationPreferences: preferencesFromRecord(
    record.notificationPreferences,
  ),
  currencySymbol: asString(record.currencySymbol, DEFAULT_CURRENCY_SYMBOL),
  timezone: asString(record.timezone, getLocalTimezone()),
});

export const userFromSnapshot = (snapshot: DocumentSnapshotLike): User =>
  userFromRecord(snapshotToRecord(snapshot));

export const joinRequestFromRecord = (record: RawRecord): JoinRequest => ({
  id: asString(record.id),
  fullName: asString(record.fullName),
  email: asString(record.email),
  phone: asString(record.phone),
  message: asString(record.message),
  status: enumValue(record.status, requestStatuses, "pending"),
  createdAt: asDate(record.createdAt),
  reviewedAt: asNullableDate(record.reviewedAt),
  reviewedBy: asNullableString(record.reviewedBy),
});

export const joinRequestFromSnapshot = (
  snapshot: DocumentSnapshotLike,
): JoinRequest => joinRequestFromRecord(snapshotToRecord(snapshot));
