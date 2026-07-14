import { DEFAULT_CURRENCY_LOCALE, DEFAULT_CURRENCY_SYMBOL } from "./locale";

export const formatCurrency = (
  amount: number,
  symbol = DEFAULT_CURRENCY_SYMBOL,
): string => `${symbol}${amount.toLocaleString(DEFAULT_CURRENCY_LOCALE)}`;

// Abbreviates amounts from a million upward (e.g. $1M, $2.5M) so large
// totals still fit in compact stat tiles.
export const formatCompactCurrency = (
  amount: number,
  symbol = DEFAULT_CURRENCY_SYMBOL,
): string => {
  if (Math.abs(amount) < 1_000_000) {
    return formatCurrency(amount, symbol);
  }
  const sign = amount < 0 ? "-" : "";
  const millions = Math.round((Math.abs(amount) / 1_000_000) * 10) / 10;
  const label = Number.isInteger(millions)
    ? String(millions)
    : millions.toFixed(1);
  return `${sign}${symbol}${label}M`;
};
