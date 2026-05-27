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

export const canViewMemberPrivateDetails = (
  viewer: User | null,
  member: Pick<User, "uid">,
) => isAdmin(viewer) || viewer?.uid === member.uid;

export const getVisibleMemberProfileTabs = (
  viewer: User | null,
  member: Pick<User, "uid">,
) =>
  canViewMemberPrivateDetails(viewer, member)
    ? (["info", "family", "finance"] as const)
    : (["info"] as const);

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
