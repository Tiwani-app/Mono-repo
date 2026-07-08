import { FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { FinancialStatus, MemberStatus, Role, UserProfileInput } from "./types";
import { normalizeEmail } from "./validation";

const roles: Role[] = ["admin", "electoral_chairman", "member"];
const memberStatuses: MemberStatus[] = ["active", "inactive", "suspended", "pending"];
const financialStatuses: FinancialStatus[] = ["green", "red"];
const maritalStatuses = ["single", "married", "divorced", "widowed"] as const;

export const stringValue = (
  value: unknown,
  field: string,
): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpsError("failed-precondition", `Field "${field}" is missing.`);
  }
  return value.trim();
};

export const optionalStringValue = (value: unknown): string | null => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    throw new HttpsError("invalid-argument", "Optional text fields must be strings.");
  }
  return value.trim() || null;
};

export const roleValue = (value: unknown): Role => {
  if (typeof value === "string" && roles.includes(value as Role)) {
    return value as Role;
  }
  return "member";
};

export const memberStatusValue = (value: unknown): MemberStatus => {
  if (typeof value === "string" && memberStatuses.includes(value as MemberStatus)) {
    return value as MemberStatus;
  }
  return "active";
};

export const financialStatusValue = (value: unknown): FinancialStatus => {
  if (
    typeof value === "string" &&
    financialStatuses.includes(value as FinancialStatus)
  ) {
    return value as FinancialStatus;
  }
  return "green";
};

export const outstandingBalanceValue = (value: unknown): number => {
  if (value === undefined || value === null || value === "") {
    return 0;
  }
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new HttpsError("invalid-argument", "Outstanding balance must be zero or more.");
  }
  return value;
};

export const maritalStatusValue = (value: unknown): typeof maritalStatuses[number] => {
  if (typeof value === "string" && maritalStatuses.includes(value as typeof maritalStatuses[number])) {
    return value as typeof maritalStatuses[number];
  }
  return "single";
};

export const childrenValue = (value: unknown) => {
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new HttpsError("invalid-argument", "Children must be an array.");
  }
  return value
    .map((item) => {
      const child = item && typeof item === "object" ? item as Record<string, unknown> : {};
      const name = typeof child.name === "string" ? child.name.trim() : "";
      const dateOfBirth =
        typeof child.dateOfBirth === "string" ? child.dateOfBirth.trim() : "";
      if (!name && !dateOfBirth) {
        return null;
      }
      if (!name) {
        throw new HttpsError("invalid-argument", "Enter a name for each child.");
      }
      return { name, dateOfBirth };
    })
    .filter((child): child is { name: string; dateOfBirth: string } => child !== null);
};

export const memberProfileFromInput = (
  uid: string,
  orgId: string,
  input: UserProfileInput,
) => ({
  uid,
  orgId,
  fullName: stringValue(input.fullName, "fullName"),
  email: normalizeEmail(stringValue(input.email, "email")),
  phone: stringValue(input.phone, "phone"),
  photoURL: null,
  role: roleValue(input.role),
  status: memberStatusValue(input.status),
  financialStatus: financialStatusValue(input.financialStatus),
  outstandingBalance: outstandingBalanceValue(input.outstandingBalance),
  address: typeof input.address === "string" ? input.address.trim() : "",
  maritalStatus: maritalStatusValue(input.maritalStatus),
  dateOfBirth: "",
  spouseName: optionalStringValue(input.spouseName),
  spouseDateOfBirth: optionalStringValue(input.spouseDateOfBirth),
  weddingAnniversary: optionalStringValue(input.weddingAnniversary),
  children: childrenValue(input.children),
  memberSince: new Date().toISOString().slice(0, 10),
  joinedAt: FieldValue.serverTimestamp(),
  notificationPreferences: { events: true, finance: true, voting: true },
  currencySymbol: "$",
  timezone: "UTC",
});
