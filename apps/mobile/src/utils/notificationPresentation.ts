import {AppColors, ThemeId, colors} from "../theme";
import {NotificationType} from "../types/notification";

export const getNotificationColors = (
  themeColors: AppColors = colors,
  themeId: ThemeId = "original",
): Record<NotificationType, string> => {
  // Original keeps classic semantic greens / blues / purple.
  if (themeId === "original") {
    return {
      event: themeColors.status.info,
      finance: themeColors.status.success,
      vote: themeColors.gold.default,
      general: themeColors.text.secondary,
      marketplace: themeColors.status.purple,
      library: themeColors.gold.default,
    };
  }

  // All other themes use the theme accent family for borders & icons.
  return {
    event: themeColors.gold.default,
    finance: themeColors.gold.default,
    vote: themeColors.gold.light,
    general: themeColors.text.secondary,
    marketplace: themeColors.gold.dark,
    library: themeColors.gold.default,
  };
};

export const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  event: "calendar",
  finance: "credit-card",
  vote: "check-circle",
  general: "bell",
  marketplace: "shopping-bag",
  library: "book-open",
};
