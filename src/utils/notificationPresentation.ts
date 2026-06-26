import { colors } from "../theme";
import { NotificationType } from "../types/notification";

export const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  event: colors.status.info,
  finance: colors.status.success,
  vote: colors.gold.default,
  general: colors.text.secondary,
  marketplace: colors.status.purple,
};

export const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  event: "calendar",
  finance: "credit-card",
  vote: "check-circle",
  general: "bell",
  marketplace: "shopping-bag",
};
