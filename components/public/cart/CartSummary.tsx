'use client';

/**
 * CartSummary — displays cart subtotal, delivery estimate note, and
 * "Proceed to Checkout" CTA.
 *
 * Layout:
 *  - Full-width on mobile (stacks below cart items)
 *  - Fixed-width panel on desktop (lg: w-80 xl: w-96)
 *
 * Uses semantic tokens only. All strings via t('public.cart.*').
 * CurrencyDisplay from @/components/public/common/CurrencyDisplay.
 *
 * Requirements: 6.7
 */

import { CurrencyDisplay } from '@/components/public/common/CurrencyDisplay';
import { useCartDrawerStore } from '@/lib/stores/cart-drawer-store';
import { cn } from '@/lib/utils';
import { ArrowRight, Truck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface CartSummaryProps {
  /** Cart subtotal in the platform's base currency unit */
  subtotal: number;
  /** Total number of items in the cart */
  itemCount: number;
  /** Optional extra class names for the root element */
  className?: string;
  /** Optional callback fired when "Proceed to Checkout" is clicked (e.g. to close a drawer) */
  onCheckout?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CartSummary({ subtotal, itemCount, className, onCheckout }: CartSummaryProps) {
  const t = useTranslations('public.cart');
  const closeDrawer = useCartDrawerStore((s) => s.close);

  const handleCheckoutClick = () => {
    if (onCheckout) onCheckout();
    closeDrawer();
  };

  return (
    <aside
      aria-label={t('subtotal')}
      className={cn(
        // Base — card-style panel
        'rounded-xl border border-border bg-card p-6',
        // Responsive width: full on mobile, fixed on desktop
        'w-full lg:w-80 xl:w-96',
        // Vertical rhythm
        'flex flex-col gap-5',
        className,
      )}
    >
      {/* ── Heading ─────────────────────────────────────────────────────── */}
      <h2 className="text-base font-semibold text-foreground tracking-tight">
        {t('subtotal')}
      </h2>

      {/* ── Subtotal row ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-muted-foreground">
          {itemCount === 1
            ? t('itemCount', { count: itemCount })
            : t('itemCountPlural', { count: itemCount })}
        </span>
        <CurrencyDisplay
          amount={subtotal}
          className="text-xl font-bold text-foreground tabular-nums"
        />
      </div>

      {/* ── Divider ──────────────────────────────────────────────────────── */}
      <hr className="border-border" />

      {/* ── Delivery estimate note ───────────────────────────────────────── */}
      <div className="flex items-start gap-2.5 text-sm text-muted-foreground">
        <Truck
          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <span>{t('deliveryEstimate')}</span>
      </div>

      {/* ── Discounts note ───────────────────────────────────────────────── */}
      <p className="text-xs text-muted-foreground/80">
        {t('discountsAtCheckout')}
      </p>

      {/* ── Proceed to Checkout CTA ──────────────────────────────────────── */}
      <Link
        href="/checkout"
        onClick={handleCheckoutClick}
        className={cn(
          'inline-flex items-center justify-center gap-2',
          'w-full rounded-lg px-5 py-3',
          'bg-primary text-primary-foreground',
          'text-sm font-semibold',
          'transition-colors hover:bg-primary/90',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          // Minimum touch target
          'min-h-[44px]',
        )}
        aria-disabled={itemCount === 0}
        tabIndex={itemCount === 0 ? -1 : undefined}
      >
        {t('proceedToCheckout')}
        <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
      </Link>

      {/* ── Continue shopping link ───────────────────────────────────────── */}
      <Link
        href="/products"
        className={cn(
          'text-center text-sm text-muted-foreground underline-offset-4',
          'hover:text-foreground hover:underline transition-colors',
        )}
      >
        {t('continueShopping')}
      </Link>
    </aside>
  );
}

export default CartSummary;
