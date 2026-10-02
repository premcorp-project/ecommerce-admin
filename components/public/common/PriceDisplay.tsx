'use client';

import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay';
import { cn } from '@/lib/utils';
import type { PricingTier, RetailDiscountTier } from '@/types/public';
import { useTranslations } from 'next-intl';

interface PriceDisplayProps {
  /** Pre-calculated by backend: discountedPrice ?? price. Always a number. */
  effectivePrice: number;
  /** Original price — shown with strikethrough when discountedPrice !== null */
  originalPrice?: number;
  /** When non-null, a discount is active and originalPrice should be struck through */
  discountedPrice: number | null;
  /** Tiered bulk pricing — only applied when hasBulkAccess === true */
  bulkPricingTiers?: PricingTier[];
  /** Retail discount tiers — applied for normal/guest users when no coupon active */
  retailDiscountTiers?: RetailDiscountTier[];
  /** Current quantity selected by the user */
  quantity?: number;
  /** When true: apply bulk tier pricing. When false: apply retail discount tiers. */
  hasBulkAccess?: boolean;
  /** Whether a coupon is active (skips retail discount tiers) */
  hasCoupon?: boolean;
  className?: string;
  /** Size variant for the main price */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Find the matching tier for a given quantity.
 */
function findMatchingTier<T extends { minQty: number; maxQty: number | null }>(
  tiers: T[] | undefined,
  quantity: number,
): T | null {
  if (!tiers?.length) return null;
  return tiers.find(
    (t) => quantity >= t.minQty && (t.maxQty === null || quantity <= t.maxQty),
  ) ?? null;
}

/**
 * Calculate the unit price from a tier.
 * - Bulk: fixed = tier.value IS the unit price; percentage = retailPrice × (1 - value/100)
 * - Retail: fixed = retailPrice - tier.value; percentage = retailPrice × (1 - value/100)
 */
function applyTier(
  retailPrice: number,
  tier: PricingTier | RetailDiscountTier,
  isBulk: boolean,
): number {
  if (tier.type === 'percentage') {
    return Math.round(retailPrice * (1 - tier.value / 100) * 100) / 100;
  }
  // Fixed type
  return isBulk ? tier.value : Math.round((retailPrice - tier.value) * 100) / 100;
}

/**
 * PriceDisplay — renders the correct price based on tiered pricing rules.
 *
 * Logic:
 * - Bulk buyer + matching bulk tier → show tier price
 * - Normal user + no coupon + matching retail tier → show tier price
 * - Otherwise → show effectivePrice
 */
export function PriceDisplay({
  effectivePrice,
  originalPrice,
  discountedPrice,
  bulkPricingTiers,
  retailDiscountTiers,
  quantity = 1,
  hasBulkAccess = false,
  hasCoupon = false,
  className,
  size = 'md',
}: PriceDisplayProps) {
  const t = useTranslations('public.product');
  const retailPrice = effectivePrice;
  let mainPrice = retailPrice;
  let isTierActive = false;
  let tierLabel = '';

  if (hasBulkAccess) {
    // Bulk buyer: check bulk pricing tiers
    const tier = findMatchingTier(bulkPricingTiers, quantity);
    if (tier) {
      mainPrice = applyTier(retailPrice, tier, true);
      isTierActive = true;
      tierLabel = tier.type === 'percentage' ? `${tier.value}% off` : '';
    }
  } else if (!hasCoupon) {
    // Normal/guest user without coupon: check retail discount tiers
    const tier = findMatchingTier(retailDiscountTiers, quantity);
    if (tier) {
      mainPrice = applyTier(retailPrice, tier, false);
      isTierActive = true;
      tierLabel = tier.type === 'percentage' ? `${tier.value}% off` : '';
    }
  }

  // Show strikethrough only when there is a sale discount AND tier is not active
  const showStrikethrough = !isTierActive && discountedPrice !== null && originalPrice != null;

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl font-bold',
  };

  const strikeSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex flex-wrap items-baseline gap-2">
        {/* Main price */}
        <CurrencyDisplay
          amount={mainPrice}
          className={cn('font-semibold text-foreground', sizeClasses[size])}
        />

        {/* Original price with strikethrough — only when discount is active */}
        {showStrikethrough && (
          <CurrencyDisplay
            amount={originalPrice!}
            className={cn(
              'line-through text-muted-foreground',
              strikeSizeClasses[size],
            )}
          />
        )}

        {/* Tier active badge */}
        {isTierActive && (
          <span className="text-xs font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded">
            {hasBulkAccess ? t('bulkPricing') : t('quantityDiscounts')}
            {tierLabel && ` · ${tierLabel}`}
          </span>
        )}

        {/* Strikethrough effective price when tier gives a lower price */}
        {isTierActive && mainPrice < retailPrice && (
          <CurrencyDisplay
            amount={retailPrice}
            className={cn(
              'line-through text-muted-foreground',
              strikeSizeClasses[size],
            )}
          />
        )}
      </div>
    </div>
  );
}
