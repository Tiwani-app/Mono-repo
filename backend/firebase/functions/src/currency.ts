// Stripe's documented zero-decimal currencies — these are passed to the
// gateway as-is (e.g. 100 JPY, not 10000). Every other currency (including
// NGN and USD, the two this app cares about today) uses minor units
// (kobo/cents), so the amount is multiplied/divided by 100.
const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG",
  "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
]);

const minorUnitMultiplier = (currency: string): number =>
  ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 1 : 100;

export const toMinorUnits = (amount: number, currency: string): number =>
  Math.round(amount * minorUnitMultiplier(currency));

export const fromMinorUnits = (amountMinorUnits: number, currency: string): number =>
  amountMinorUnits / minorUnitMultiplier(currency);
