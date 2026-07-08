export const DEFAULT_CURRENCY_SYMBOL = "$";
export const DEFAULT_CURRENCY_LOCALE = "en-US";

export const getLocalTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Local";
  } catch {
    return "Local";
  }
};

export const formatTimezoneLabel = (timezone: string) =>
  timezone === "Local" ? "Local timezone" : timezone.replace(/_/g, " ");
