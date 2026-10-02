'use client';

/**
 * PricingTiersTable — renders a tiered pricing breakdown table.
 *
 * - Bulk buyers: shows bulkPricingTiers only (never retail prices)
 * - Normal/guest users: shows retailDiscountTiers
 * - Hidden when no tiers exist for the user type
 */

import { CurrencyDisplay } from '@/components/public/common/CurrencyDisplay';
import { useHydrated } from '@/lib/hooks/useHydrated';
import { useCustomerAuthStore } from '@/lib/stores/customer-auth-store';
import type { PricingTier, RetailDiscountTier } from '@/types/public';
import { useTranslations } from 'next-intl';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface BulkPricingTableProps {
    /** Tiered bulk pricing for bulk buyers */
    bulkPricingTiers?: PricingTier[];
    /** Retail discount tiers for normal/guest users */
    retailDiscountTiers?: RetailDiscountTier[];
    /** Effective retail price (for calculating display prices) */
    effectivePrice: number;
    /** Currently selected quantity — highlights the active tier */
    quantity?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeUnitPrice(
    retailPrice: number,
    tier: PricingTier | RetailDiscountTier,
    isBulk: boolean,
): number {
    if (tier.type === 'percentage') {
        return Math.round(retailPrice * (1 - tier.value / 100) * 100) / 100;
    }
    // fixed → value IS the final unit price (consistent for both bulk and retail)
    return tier.value;
}

function computeSaving(retailPrice: number, unitPrice: number): number {
    if (retailPrice <= 0) return 0;
    return Math.round(((retailPrice - unitPrice) / retailPrice) * 100);
}

function getMaxSaving(
    tiers: (PricingTier | RetailDiscountTier)[],
    retailPrice: number,
    isBulk: boolean,
): number {
    let max = 0;
    for (const tier of tiers) {
        const unitPrice = computeUnitPrice(retailPrice, tier, isBulk);
        const saving = computeSaving(retailPrice, unitPrice);
        if (saving > max) max = saving;
    }
    return max;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BulkPricingTable({
    bulkPricingTiers,
    retailDiscountTiers,
    effectivePrice,
    quantity = 1,
}: BulkPricingTableProps) {
    const t = useTranslations('public.product');
    const hydrated = useHydrated();
    const { user } = useCustomerAuthStore();
    const hasBulkAccess = hydrated ? (user?.hasBulkAccess ?? false) : false;

    // Determine which tiers to show
    const tiers = hasBulkAccess ? bulkPricingTiers : retailDiscountTiers;
    const isBulk = hasBulkAccess;

    // Gate: only render when tiers exist
    if (!tiers || tiers.length === 0) {
        return null;
    }

    const maxSaving = getMaxSaving(tiers, effectivePrice, isBulk);
    const title = isBulk ? t('bulkPricing') : t('quantityDiscounts');

    return (
        <section
            aria-label={title}
            className="rounded-lg border border-border overflow-hidden"
        >
            {/* Header banner */}
            <div className="bg-primary px-4 py-2.5 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-primary-foreground">
                    {title}
                </h3>
                {maxSaving > 0 && (
                    <span className="text-xs font-bold text-primary-foreground/90">
                        {t('saveUpTo', { percent: maxSaving })}
                    </span>
                )}
            </div>

            {/* Tier table */}
            <div className="divide-y divide-border">
                {/* Column headers */}
                <div className="grid grid-cols-3 bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground">
                    <span>{t('tierQuantity')}</span>
                    <span className="text-center">{t('tierUnitPrice')}</span>
                    <span className="text-right">{t('tierSaving')}</span>
                </div>

                {/* Rows */}
                {tiers.map((tier, index) => {
                    const unitPrice = computeUnitPrice(effectivePrice, tier, isBulk);
                    const saving = computeSaving(effectivePrice, unitPrice);
                    const isActive = quantity >= tier.minQty &&
                        (tier.maxQty === null || quantity <= tier.maxQty);

                    return (
                        <div
                            key={index}
                            className={`grid grid-cols-3 px-4 py-2.5 text-sm transition-colors ${
                                isActive
                                    ? 'bg-green-50 dark:bg-green-900/20 border-l-2 border-l-green-500'
                                    : 'bg-card'
                            }`}
                        >
                            <span className="font-mono text-foreground">
                                {tier.minQty === tier.maxQty
                                    ? tier.minQty
                                    : `${tier.minQty}–${tier.maxQty ?? '∞'}`}
                            </span>
                            <span className="text-center font-semibold text-foreground">
                                <CurrencyDisplay amount={unitPrice} />
                            </span>
                            <span className="text-right">
                                {saving > 0 ? (
                                    <span className="text-green-700 dark:text-green-400 font-medium">
                                        {t('savePct', { percent: saving })}
                                    </span>
                                ) : (
                                    <span className="text-muted-foreground">—</span>
                                )}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Footer note */}
            <div className="px-4 py-2 bg-muted/30 border-t border-border">
                <p className="text-[11px] text-muted-foreground">
                    {isBulk ? t('bulkPricingNote') : t('retailDiscountNote')}
                </p>
            </div>
        </section>
    );
}

export default BulkPricingTable;
