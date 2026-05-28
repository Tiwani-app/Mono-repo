import { DEFAULT_CURRENCY_LOCALE, DEFAULT_CURRENCY_SYMBOL } from "./locale";

export const formatCurrency = (
  amount: number,
  symbol = DEFAULT_CURRENCY_SYMBOL,
): string => `${symbol}${amount.toLocaleString(DEFAULT_CURRENCY_LOCALE)}`;
