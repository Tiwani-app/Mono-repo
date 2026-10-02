import type { PaystackRateSource } from "../services/paymentsService";

// Same rounding as the backend's quoteNairaAmount (functions/src/fxRates.ts):
// round to kobo, then up to the next ₦50. Keep the two identical so the amount
// on the button is the amount Paystack charges. initiatePayment's returned
// amount stays authoritative.
const NAIRA_ROUNDING_STEP = 50;

export const quoteNairaAmount = (orgAmount: number, appliedRate: number): number =>
  Math.ceil(Math.round(orgAmount * appliedRate * 100) / 100 / NAIRA_ROUNDING_STEP) *
  NAIRA_ROUNDING_STEP;

export const formatNaira = (amount: number): string =>
  `₦${amount.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;

// "▲ 0.42%", "▼ 0.10%", or "0.00%" for no movement.
export const formatRateChange = (percent: number): string => {
  const magnitude = Math.abs(percent).toFixed(2);
  if (magnitude === "0.00") {
    return "0.00%";
  }
  return `${percent > 0 ? "▲" : "▼"} ${magnitude}%`;
};

export const rateSourceLabel = (source: PaystackRateSource): string => {
  switch (source) {
    case "automatic":
      return "Live market rate";
    case "override":
      return "Temporary rate set by Tiwani";
    case "manual":
      return "Set by your admin (live rate unavailable)";
  }
};
