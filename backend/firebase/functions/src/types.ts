export type Role = "admin" | "electoral_chairman" | "member";
export type MemberStatus = "active" | "inactive" | "suspended" | "pending";
export type FinancialStatus = "green" | "red";

export interface UserProfile {
  uid: string;
  orgId: string;
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  status: MemberStatus;
}

export interface AuthenticatedUser {
  uid: string;
  profile: UserProfile;
}

export interface UserProfileInput {
  fullName: unknown;
  email: unknown;
  phone: unknown;
  role?: unknown;
  status?: unknown;
  financialStatus?: unknown;
  outstandingBalance?: unknown;
  address?: unknown;
  maritalStatus?: unknown;
  spouseName?: unknown;
  spouseDateOfBirth?: unknown;
  weddingAnniversary?: unknown;
  children?: unknown;
}
