import { User } from "../types/user";
import { isAdmin } from "./roleGuard";

export interface SanitizedMemberProfile {
  displayName: string;
  email: string;
  phone: string;
  address: string;
  maritalStatus: string;
  memberSince: Date | null;
  spouseName: string | null;
  children: {name: string; dateOfBirth: string}[];
}

export type MemberProfileTab = "info" | "family" | "finance";

export const canViewMemberFinanceDetails = (
  viewer: User | null,
  member: Pick<User, "uid">,
) => isAdmin(viewer) || viewer?.uid === member.uid;

export const canViewMemberPrivateDetails = canViewMemberFinanceDetails;

export const canViewMemberFamilyDetails = (
  viewer: User | null,
  member: Pick<User, "uid">,
) =>
  canViewMemberFinanceDetails(viewer, member) || viewer?.status === "active";

export const getVisibleMemberProfileTabs = (
  viewer: User | null,
  member: Pick<User, "uid">,
) => {
  const tabs: MemberProfileTab[] = ["info"];
  if (canViewMemberFamilyDetails(viewer, member)) {
    tabs.push("family");
  }
  if (canViewMemberFinanceDetails(viewer, member)) {
    tabs.push("finance");
  }
  return tabs;
};

const hasValue = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const fallbackText = (value: unknown, fallback = "Not provided") =>
  hasValue(value) ? value.trim() : fallback;

export const sanitizeMemberProfile = (
  member: Partial<User> & Pick<User, "uid">,
): SanitizedMemberProfile => {
  const memberSince = hasValue(member.memberSince)
    ? new Date(member.memberSince)
    : null;
  return {
    displayName: fallbackText(member.fullName, "Unnamed member"),
    email: fallbackText(member.email),
    phone: fallbackText(member.phone),
    address: fallbackText(member.address),
    maritalStatus: fallbackText(member.maritalStatus),
    memberSince:
      memberSince && !Number.isNaN(memberSince.getTime()) ? memberSince : null,
    spouseName: hasValue(member.spouseName) ? member.spouseName.trim() : null,
    children: Array.isArray(member.children)
      ? member.children.map((child, index) => ({
          name: fallbackText(child.name, `Child ${index + 1}`),
          dateOfBirth: fallbackText(child.dateOfBirth),
        }))
      : [],
  };
};
