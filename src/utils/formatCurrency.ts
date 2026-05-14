export const formatCurrency = (amount: number, symbol = '₦'): string =>
  `${symbol}${amount.toLocaleString('en-NG')}`;
