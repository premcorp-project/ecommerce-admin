'use client';

import { useConfig } from '@/hooks/use-config';

/**
 * Map ISO 4217 currency codes to their preferred Intl locale for formatting.
 * Falls back to 'en' if not listed.
 */
const CURRENCY_LOCALE_MAP: Record<string, string> = {
    GBP: 'en-GB',
    USD: 'en-US',
    EUR: 'de-DE',
    AED: 'en-AE',
    SAR: 'ar-SA',
    PKR: 'en-PK',
    INR: 'en-IN',
    CAD: 'en-CA',
    AUD: 'en-AU',
    JPY: 'ja-JP',
    CNY: 'zh-CN',
};

/**
 * Resolve a currency code to its symbol using Intl.NumberFormat.
 * Works for any valid ISO 4217 currency code.
 */
function getCurrencySymbol(currencyCode: string, locale: string): string {
    try {
        const parts = new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currencyCode,
            currencyDisplay: 'narrowSymbol',
        }).formatToParts(0);
        return parts.find((p) => p.type === 'currency')?.value || currencyCode;
    } catch {
        return currencyCode;
    }
}

/**
 * Format a currency value using Intl.NumberFormat with the given code/locale.
 */
function formatValue(
    value: number | string | null | undefined,
    currencyCode: string,
    locale: string
): string {
    if (value === null || value === undefined || value === '') return 'N/A';

    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return 'N/A';

    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currencyCode,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(num);
    } catch {
        return `${getCurrencySymbol(currencyCode, locale)}${num.toFixed(2)}`;
    }
}

/**
 * Hook providing currency formatting based on platform config.
 * Reads the currency code from /config and formats using Intl.NumberFormat.
 */
export const useCurrency = () => {
    const { currency: currencyCode, isLoading, isError } = useConfig();
    const locale = CURRENCY_LOCALE_MAP[currencyCode] || 'en';
    const currencySymbol = getCurrencySymbol(currencyCode, locale);

    return {
        currencyCode,
        currencySymbol,
        locale,
        currencyIsLoading: isLoading,
        currencyIsError: isError,
        formatCurrency: (value: number | string | null | undefined) =>
            formatValue(value, currencyCode, locale),
        format: (value: number | string | null | undefined) =>
            formatValue(value, currencyCode, locale),
    };
};
