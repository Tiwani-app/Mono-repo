import { User } from "../types/user";
import { isAdmin } from "./roleGuard";

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
