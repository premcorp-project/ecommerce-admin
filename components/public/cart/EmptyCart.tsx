'use client';

/**
 * EmptyCart — empty state shown when the cart has no items.
 *
 * Renders a shopping cart icon, a heading, a supporting message, and a
 * "Browse Products" CTA that links to /products.
 *
 * Delegates all visual structure to the shared EmptyState primitive so the
 * look-and-feel stays consistent with other empty states across the site.
 *
 * Uses semantic tokens only. All strings via t('public.cart.*').
 *
 * Requirements: 6.8
 */

import { EmptyState } from '@/components/public/common/EmptyState';
import { cn } from '@/lib/utils';
import { ShoppingCart } from 'lucide-react';
import { useTranslations } from 'next-intl';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface EmptyCartProps {
  /** Optional extra class names for the root element */
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EmptyCart({ className }: EmptyCartProps) {
  const t = useTranslations('public.cart');

  return (
    <EmptyState
      icon={
        <ShoppingCart
          className="size-8 text-muted-foreground"
          aria-hidden="true"
          strokeWidth={1.5}
        />
      }
      title={t('empty')}
      description={t('emptyHint')}
      ctaLabel={t('browseCta')}
      ctaHref="/products"
      className={cn('py-20', className)}
    />
  );
}

export default EmptyCart;
