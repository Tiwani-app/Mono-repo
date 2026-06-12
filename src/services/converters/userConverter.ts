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
  RawRecord,
  asNullableDate,
  asNullableString,
  requiredDate,
  requiredEnum,
  asNumber,
  requiredString,
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
  value === null || value === undefined
    ? []
    : Array.isArray(value)
      ? value
          .map((item, index) => {
            const child =
              item && typeof item === "object" ? (item as RawRecord) : {};
            const name =
              typeof child.name === "string" ? child.name.trim() : "";
            const dateOfBirth =
              typeof child.dateOfBirth === "string"
                ? child.dateOfBirth.trim()
                : "";
            if (!name && !dateOfBirth) {
              return null;
            }
            return {
              name: name || `Child ${index + 1}`,
              dateOfBirth,
            };
          })
          .filter((child): child is Child => child !== null)
      : (() => {
          throw new Error('Field "children" must be an array.');
        })();

export const userFromRecord = (record: RawRecord): User => ({
  uid:
    typeof record.uid === "string" && record.uid.trim()
      ? record.uid
      : requiredString(record, "id"),
  fullName: requiredString(record, "fullName"),
  email: requiredString(record, "email"),
  phone: typeof record.phone === "string" ? record.phone : "",
  photoURL: asNullableString(record.photoURL, "photoURL"),
  role: requiredEnum(record.role, roles, "role"),
  status: requiredEnum(record.status, memberStatuses, "status"),
  financialStatus: requiredEnum(
    record.financialStatus,
    financialStatuses,
    "financialStatus",
  ),
  outstandingBalance: asNumber(record.outstandingBalance, 0),
  address: typeof record.address === "string" ? record.address : "",
  maritalStatus: requiredEnum(
    record.maritalStatus,
    maritalStatuses,
    "maritalStatus",
  ),
  dateOfBirth: typeof record.dateOfBirth === "string" ? record.dateOfBirth : "",
  spouseName: asNullableString(record.spouseName, "spouseName"),
  spouseDateOfBirth: asNullableString(
    record.spouseDateOfBirth,
    "spouseDateOfBirth",
  ),
  weddingAnniversary: asNullableString(
    record.weddingAnniversary,
    "weddingAnniversary",
  ),
  children: childrenFromRecord(record.children),
  memberSince:
    typeof record.memberSince === "string" && record.memberSince.trim()
      ? record.memberSince
      : requiredDate({ memberSince: record.joinedAt }, "memberSince")
          .toISOString()
          .slice(0, 10),
  notificationPreferences: preferencesFromRecord(
    record.notificationPreferences,
  ),
  currencySymbol:
    typeof record.currencySymbol === "string" && record.currencySymbol.trim()
      ? record.currencySymbol
      : DEFAULT_CURRENCY_SYMBOL,
  timezone:
    typeof record.timezone === "string" && record.timezone.trim()
      ? record.timezone
      : getLocalTimezone(),
});

export const joinRequestFromRecord = (record: RawRecord): JoinRequest => ({
  id: requiredString(record, "id"),
  fullName: requiredString(record, "fullName"),
  email: requiredString(record, "email"),
  phone: requiredString(record, "phone"),
  message: typeof record.message === "string" ? record.message : "",
  status: requiredEnum(record.status, requestStatuses, "status"),
  createdAt: requiredDate(record, "createdAt"),
  reviewedAt: asNullableDate(record.reviewedAt, "reviewedAt"),
  reviewedBy: asNullableString(record.reviewedBy, "reviewedBy"),
});
