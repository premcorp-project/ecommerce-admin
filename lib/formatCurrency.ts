export const resolveCurrencySymbol = (symbol?: string) => symbol || '$';

// Helper function to format currency
export const formatCurrency = (amount: number, currencySymbol?: string) => {
  const resolvedCurrencySymbol = resolveCurrencySymbol(currencySymbol);

  return `${resolvedCurrencySymbol} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};
