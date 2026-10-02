'use client';

import { useCurrency } from '@/hooks/use-currency';
import { cn } from '@/lib/utils';

interface CurrencyDisplayProps {
  amount: number | string;
  className?: string;
  showCode?: boolean;
  decimals?: number;
}

/**
 * Component to display amount with currency symbol
 * Usage: <CurrencyDisplay amount={1250.50} />
 * Output: ﷼ 1,250.50
 */
export function CurrencyDisplay({
  amount,
  className,
  showCode = false,
  decimals = 2,
}: CurrencyDisplayProps) {
  const { currencySymbol, currencyCode, currencyIsLoading, currencyIsError } =
    useCurrency();

  // Convert to number if string
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);

  // Handle null/undefined/NaN
  if (numAmount === null || numAmount === undefined || isNaN(numAmount)) {
    return <span className={cn('inline-flex items-center gap-1', className)}>—</span>;
  }

  // Handle loading or error state
  if (currencyIsLoading) {
    return <span className={cn('inline-flex items-center gap-1', className)}>...</span>;
  }

  if (currencyIsError || !currencySymbol) {
    return (
      <span className={cn('inline-flex items-center gap-1', className)}>
        {numAmount.toLocaleString(undefined, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })}
      </span>
    );
  }

  // Format the amount with locale
  const formattedAmount = numAmount.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span>{currencySymbol}</span>
      <span>{formattedAmount}</span>
      {showCode && <span className="text-xs opacity-70">({currencyCode})</span>}
    </span>
  );
}

interface CurrencySymbolProps {
  className?: string;
}

/**
 * Component to display only the currency symbol
 * Usage: <CurrencySymbol />
 * Output: ﷼
 */
export function CurrencySymbol({ className }: CurrencySymbolProps) {
  const { currencySymbol, currencyIsLoading, currencyIsError } = useCurrency();

  if (currencyIsLoading || currencyIsError || !currencySymbol) {
    return null;
  }

  return <span className={className}>{currencySymbol}</span>;
}

interface CurrencyCodeProps {
  className?: string;
}

/**
 * Component to display only the currency code
 * Usage: <CurrencyCode />
 * Output: QAR
 */
export function CurrencyCode({ className }: CurrencyCodeProps) {
  const { currencyCode, currencyIsLoading, currencyIsError } = useCurrency();

  if (currencyIsLoading || currencyIsError || !currencyCode) {
    return null;
  }

  return <span className={className}>{currencyCode}</span>;
}
