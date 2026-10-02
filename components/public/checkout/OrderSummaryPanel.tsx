'use client';

/**
 * OrderSummaryPanel — Step 3 content for the checkout flow.
 *
 * Displays:
 *  - Cart items (image, name, variant attributes, quantity, line total)
 *  - Subtotal
 *  - Delivery fee (or "Free" when 0)
 *  - Coupon discount (only when discountAmount > 0)
 *  - Order total
 *
 * Layout:
 *  - Full-width on mobile (stacks vertically)
 *  - Sticky panel on desktop (lg: sticky top-6)
 *
 * Uses semantic tokens only. All strings via t('public.checkout.*').
 * CurrencyDisplay from @/components/public/common/CurrencyDisplay.
 *
 * Requirements: 7.2 (step 3 content)
 */

import { CurrencyDisplay } from '@/components/public/common/CurrencyDisplay';
import { cn } from '@/lib/utils';
import type { CartItem, GuestCartItem } from '@/types/public';
import { ShoppingBag } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Normalised line item for display — works for both server cart and guest cart */
export interface OrderSummaryLineItem {
  id: string;
  productName: string;
  productImage: string | null;
  variantAttributes: { key: string; value: string }[];
  variantSku: string;
  variantWeight?: number | null;
  variantFreeDelivery?: boolean;
  quantity: number;
  /** Effective unit price (after tier/discount applied) */
  unitPrice: number;
  lineTotal: number;
  /** Original price before discount (from preview) */
  basePrice?: number;
  /** Pricing type applied (from preview) */
  pricingType?: 'bulk_tier' | 'retail_discount' | 'coupon_override' | 'retail';
  /** Total savings on this item (from preview) */
  savings?: number;
}

export interface OrderSummaryPanelProps {
  items: OrderSummaryLineItem[];
  subtotal: number;
  /** Subtotal before tier discounts (for strikethrough) */
  subtotalBeforeDiscount?: number;
  /** Total savings from tier pricing */
  totalSavings?: number;
  /** Delivery fee. null = not yet calculated. */
  deliveryFee: number | null;
  /** Coupon discount amount. */
  discountAmount: number;
  /** Tax amount. */
  taxAmount?: number;
  /** Tax rate from preview (e.g. 20) */
  taxRate?: number;
  /** Total weight of all items in kg */
  totalWeight?: number | null;
  /** Weight used for fee calculation (excludes free-delivery items) */
  deliveryWeight?: number | null;
  /** Final order total */
  total: number;
  className?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert server CartItem[] to OrderSummaryLineItem[].
 * CartItemVariant does NOT have effectivePrice — compute as discountedPrice ?? price.
 */
export function cartItemsToLineItems(items: CartItem[]): OrderSummaryLineItem[] {
  return items.map((item) => {
    const unitPrice = item.variant.discountedPrice ?? item.variant.price;
    return {
      id: item._id,
      productName: item.product.name,
      productImage: item.product.images[0]?.url ?? null,
      variantAttributes: item.variant.attributes,
      variantSku: item.variant.sku,
      quantity: item.quantity,
      unitPrice,
      lineTotal: unitPrice * item.quantity,
    };
  });
}

/**
 * Convert GuestCartItem[] to OrderSummaryLineItem[].
 */
export function guestCartItemsToLineItems(items: GuestCartItem[]): OrderSummaryLineItem[] {
  return items.map((item, index) => {
    const unitPrice = item.variantDiscountedPrice ?? item.variantPrice;
    return {
      id: `${item.productId}-${item.variantId}-${index}`,
      productName: item.productName,
      productImage: item.productImage,
      variantAttributes: item.variantAttributes,
      variantSku: item.variantSku,
      quantity: item.quantity,
      unitPrice,
      lineTotal: unitPrice * item.quantity,
    };
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OrderSummaryPanel({
  items,
  subtotal,
  subtotalBeforeDiscount,
  totalSavings = 0,
  deliveryFee,
  discountAmount,
  taxAmount = 0,
  taxRate,
  totalWeight,
  deliveryWeight,
  total,
  className,
}: OrderSummaryPanelProps) {
  const t = useTranslations('public.checkout');

  const isFreeShipping = deliveryFee === 0;
  const hasCoupon = discountAmount > 0;
  const hasTax = taxAmount > 0;
  const hasSavings = totalSavings > 0 && subtotalBeforeDiscount && subtotalBeforeDiscount > subtotal;

  return (
    <aside
      aria-label={t('orderSummary')}
      className={cn(
        // Base — card-style panel
        'rounded-xl border border-border bg-card',
        // Responsive: full-width on mobile, sticky on desktop
        'w-full',
        'lg:sticky lg:top-6',
        className,
      )}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
        <ShoppingBag className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-foreground tracking-tight">
          {t('orderSummary')}
        </h2>
        {items.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">
            {t('itemsCount', { count: items.length })}
          </span>
        )}
      </div>

      {/* ── Items list ──────────────────────────────────────────────────── */}
      <div className="px-5 py-4">
        {items.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{t('noItems')}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border" role="list">
            {items.map((item) => (
              <li key={item.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                {/* Product image */}
                <div className="relative size-14 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                  {item.productImage ? (
                    <Image
                      src={item.productImage}
                      alt={item.productName}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      <ShoppingBag className="size-5 text-muted-foreground" aria-hidden="true" />
                    </div>
                  )}
                </div>

                {/* Item details */}
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="truncate text-sm font-medium text-foreground leading-snug">
                    {item.productName}
                  </p>

                  {/* Variant attributes */}
                  {item.variantAttributes.length > 0 && (
                    <p className="truncate text-xs text-muted-foreground">
                      {item.variantAttributes.map((a) => `${a.key}: ${a.value}`).join(' · ')}
                    </p>
                  )}

                  {/* Quantity + unit price */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>{t('qty', { qty: item.quantity })}</span>
                    <span>×</span>
                    <CurrencyDisplay amount={item.unitPrice} className="text-xs" />
                    {item.basePrice && item.basePrice > item.unitPrice && (
                      <CurrencyDisplay
                        amount={item.basePrice}
                        className="text-xs line-through text-muted-foreground/60"
                      />
                    )}
                  </div>

                  {/* Pricing type badge */}
                  {item.pricingType && item.pricingType !== 'retail' && (
                    <span className={cn(
                      'inline-flex self-start items-center mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium',
                      item.pricingType === 'bulk_tier' && 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
                      item.pricingType === 'retail_discount' && 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
                      item.pricingType === 'coupon_override' && 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
                    )}>
                      {item.pricingType === 'bulk_tier' && t('pricingBulk')}
                      {item.pricingType === 'retail_discount' && t('pricingQtyDiscount')}
                      {item.pricingType === 'coupon_override' && t('pricingCoupon')}
                    </span>
                  )}

                  {/* Free delivery badge — only show if freeDelivery actually reduces weight */}
                  {item.variantFreeDelivery && deliveryWeight != null && totalWeight != null && deliveryWeight < totalWeight && (
                    <span className="inline-flex self-start items-center mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      {t('freeDeliveryBadge')}
                    </span>
                  )}
                </div>

                {/* Line total + savings */}
                <div className="shrink-0 text-right flex flex-col items-end gap-0.5">
                  <CurrencyDisplay
                    amount={item.lineTotal}
                    className="text-sm font-semibold text-foreground tabular-nums"
                  />
                  {item.savings != null && item.savings > 0 && (
                    <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">
                      {t('itemSavings', { amount: item.savings.toFixed(2) })}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Totals breakdown ────────────────────────────────────────────── */}
      <div className="border-t border-border px-5 py-4 flex flex-col gap-2.5">
        {/* Subtotal */}
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">{t('subtotal')}</span>
          <div className="flex items-baseline gap-2">
            <CurrencyDisplay
              amount={subtotal}
              className="text-sm font-medium text-foreground tabular-nums"
            />
            {hasSavings && (
              <CurrencyDisplay
                amount={subtotalBeforeDiscount!}
                className="text-xs text-muted-foreground line-through tabular-nums"
              />
            )}
          </div>
        </div>

        {/* Quantity savings */}
        {hasSavings && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-green-700 dark:text-green-400">{t('quantitySavings')}</span>
            <span className="text-sm font-medium text-green-700 dark:text-green-400 tabular-nums">
              −<CurrencyDisplay amount={totalSavings} className="inline" />
            </span>
          </div>
        )}

        {/* Delivery fee */}
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">{t('deliveryFee')}</span>
          {deliveryFee === null ? (
            <span className="text-sm text-muted-foreground italic">
              {t('deliveryFeeCalculatedAtAddress')}
            </span>
          ) : isFreeShipping ? (
            <span className="text-sm font-medium text-green-700 dark:text-green-400">
              {t('deliveryFeeFree')}
            </span>
          ) : (
            <CurrencyDisplay
              amount={deliveryFee}
              className="text-sm font-medium text-foreground tabular-nums"
            />
          )}
        </div>

        {/* Weight info — shown when delivery fee is calculated */}
        {totalWeight != null && totalWeight > 0 && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">{t('totalWeight')}</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {totalWeight.toFixed(1)}kg
              {deliveryWeight != null && deliveryWeight < totalWeight && (
                <span className="ml-1 text-green-600 dark:text-green-400">
                  ({t('chargedWeight', { weight: deliveryWeight.toFixed(1) })})
                </span>
              )}
            </span>
          </div>
        )}

        {/* Tax */}
        {hasTax && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">
              {t('tax')}{taxRate ? ` (${taxRate}%)` : ''}
            </span>
            <CurrencyDisplay
              amount={taxAmount}
              className="text-sm font-medium text-foreground tabular-nums"
            />
          </div>
        )}

        {/* Coupon discount — only shown when a coupon is applied */}
        {hasCoupon && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">{t('couponDiscount')}</span>
            <span className="text-sm font-medium text-green-700 dark:text-green-400 tabular-nums">
              −<CurrencyDisplay amount={discountAmount} className="inline" />
            </span>
          </div>
        )}

        {/* Divider before total */}
        <hr className="border-border" />

        {/* Total */}
        <div className="flex items-center justify-between gap-4">
          <span className="text-base font-semibold text-foreground">{t('total')}</span>
          <CurrencyDisplay
            amount={total}
            className="text-base font-bold text-foreground tabular-nums"
          />
        </div>
      </div>
    </aside>
  );
}

export default OrderSummaryPanel;
