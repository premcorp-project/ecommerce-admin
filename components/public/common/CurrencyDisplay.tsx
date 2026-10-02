'use client';

/**
 * CurrencyDisplay — formats a price amount with the currency symbol from platform config.
 *
 * Reads currency from GET /config via usePublicQuery with key ['public', 'config'].
 * Falls back to GBP if config is unavailable.
 * Uses t('public.common.currencySymbol') for the formatted output.
 *
 * Requirements: 13.11
 */

import { usePublicQuery } from '@/lib/api/public-hooks';
import { publicQueryKeys } from '@/lib/api/public-query-keys';
import { useTranslations } from 'next-intl';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlatformConfig {
    currency: string;
    taxRate?: number;
    isEmailEnabled?: boolean;
}

interface ConfigResponse {
    success?: boolean;
    config?: PlatformConfig;
    data?: { config?: PlatformConfig };
}

export interface CurrencyDisplayProps {
    /** The numeric amount to format */
    amount: number;
    /** Optional CSS class name for the wrapper span */
    className?: string;
    /** When true, renders a skeleton placeholder while config loads */
    showSkeleton?: boolean;
}

// ─── Currency helpers ─────────────────────────────────────────────────────────

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

function getCurrencySymbol(currencyCode: string, locale: string): string {
    try {
        const parts = new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currencyCode,
            currencyDisplay: 'narrowSymbol',
        }).formatToParts(0);
        return parts.find((p) => p.type === 'currency')?.value ?? currencyCode;
    } catch {
        return currencyCode;
    }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CurrencyDisplay({
    amount,
    className,
    showSkeleton = false,
}: CurrencyDisplayProps) {
    const t = useTranslations('public.common');

    const { data, isLoading } = usePublicQuery<ConfigResponse>(
        publicQueryKeys.config,
        '/config',
        {
            staleTime: 1000 * 60 * 30, // 30 minutes — config rarely changes
            gcTime: 1000 * 60 * 60,
            refetchOnWindowFocus: false,
            retry: 1,
        },
    );

    // Resolve config from either response shape
    const config: PlatformConfig | null =
        (data as any)?.data?.config ?? (data as ConfigResponse)?.config ?? null;

    const currencyCode = config?.currency ?? 'GBP';
    const locale = CURRENCY_LOCALE_MAP[currencyCode] ?? 'en';
    const symbol = getCurrencySymbol(currencyCode, locale);

    // Show skeleton while loading (only when explicitly requested)
    if (isLoading && showSkeleton) {
        return (
            <span
                className={`inline-block h-4 w-16 animate-pulse rounded bg-muted ${className ?? ''}`}
                aria-hidden="true"
            />
        );
    }

    // Use t('public.common.currencySymbol') for the formatted string.
    // The key is "{symbol}{amount}" — we pass the numeric part and the resolved
    // symbol separately so the i18n template controls the layout.
    // Extract just the numeric part from the Intl-formatted string so we can
    // pass symbol and amount separately to the i18n template.
    const numericPart = new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);

    const display = t('currencySymbol', { symbol, amount: numericPart });

    return (
        <span className={className} data-currency={currencyCode}>
            {display}
        </span>
    );
}

export default CurrencyDisplay;
