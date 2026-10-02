'use client';

/**
 * Cart Page Content — app/(public)/cart/CartPageContent.tsx
 *
 * Client component extracted from page.tsx to allow metadata export in the
 * server component page.
 *
 * Authenticated users:
 *  - Fetch GET /orders/cart via usePublicQuery(['public', 'cart'], '/orders/cart')
 *  - Optimistic updates for quantity changes and item removal via onMutate/onError/onSettled
 *  - Detect silently removed variants (items in previous cart but not in new response) → toast
 *  - Always re-render from API response (source of truth)
 *
 * Guest users:
 *  - Render from useGuestCartStore() (localStorage)
 *  - All mutations are synchronous localStorage operations (handled inside CartItem)
 *
 * On login:
 *  - Call useCartMerge to sync GuestCart to server
 *
 * Requirements: 6.1, 6.6, 6.9, 6.10, 6.11
 */

import { CartItem } from '@/components/public/cart/CartItem';
import { CartSummary } from '@/components/public/cart/CartSummary';
import { EmptyCart } from '@/components/public/cart/EmptyCart';
import { usePublicQuery } from '@/lib/api/public-hooks';
import { publicQueryKeys } from '@/lib/api/public-query-keys';
import { useCartMerge } from '@/lib/hooks/useCartMerge';
import { useCustomerAuthStore } from '@/lib/stores/customer-auth-store';
import { useGuestCartStore } from '@/lib/stores/guest-cart-store';
import type { Cart } from '@/types/public';
import { ShoppingCart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CartSkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse" aria-hidden="true">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex gap-4 py-4 border-b border-border last:border-b-0"
        >
          {/* Image placeholder */}
          <div className="size-20 shrink-0 rounded-md bg-muted" />
          {/* Text placeholders */}
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-4 w-2/3 rounded bg-muted" />
            <div className="h-3 w-1/3 rounded bg-muted" />
            <div className="h-3 w-1/4 rounded bg-muted" />
            <div className="mt-2 flex gap-3">
              <div className="h-9 w-24 rounded bg-muted" />
              <div className="h-9 w-16 rounded bg-muted ml-auto" />
              <div className="size-9 rounded bg-muted" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Authenticated Cart ────────────────────────────────────────────────────────

function AuthenticatedCart() {
  const t = useTranslations('public.cart');

  const { data, isLoading, isError, refetch } = usePublicQuery<Cart>(
    publicQueryKeys.cart,
    '/orders/cart',
  );

  // Track previous item IDs to detect silently removed variants (req 6.9)
  const prevItemIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!data) return;

    const rawD = (data as any)?.data;
    const cart = rawD?.cart ?? rawD ?? null;
    const currentItems = cart?.items ?? [];
    const currentIds = new Set<string>(currentItems.map((item: any) => item._id as string));

    // On first load, just record the IDs
    if (prevItemIdsRef.current.size === 0 && currentIds.size > 0) {
      prevItemIdsRef.current = currentIds;
      return;
    }

    // Detect items that were in the previous response but are now gone
    const removedCount = [...prevItemIdsRef.current].filter(
      (id) => !currentIds.has(id),
    ).length;

    if (removedCount > 0) {
      toast(t('itemUnavailable'));
    }

    prevItemIdsRef.current = currentIds;
  }, [data, t]);

  if (isLoading) {
    return <CartSkeleton />;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <ShoppingCart
          className="size-12 text-muted-foreground"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <p className="text-sm text-muted-foreground">{t('updateError')}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {t('continueShopping')}
        </button>
      </div>
    );
  }

  // Unwrap the response envelope: { success, data: { cart: Cart } } or { success, data: Cart }
  const rawData = (data as any)?.data;
  const cart: Cart | null = rawData?.cart ?? rawData ?? null;

  const items = cart?.items ?? [];
  const subtotal = items.reduce((sum, item) => {
    const price = item.variant.discountedPrice ?? item.variant.price;
    return sum + price * item.quantity;
  }, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  if (items.length === 0) {
    return <EmptyCart />;
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* Cart items list */}
      <div className="flex-1 rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-base font-semibold text-foreground">
          {t('itemCountPlural', { count: itemCount })}
        </h2>
        <div className="divide-y divide-border">
          {items.map((item) => (
            <CartItem key={item._id} item={item} />
          ))}
        </div>
      </div>

      {/* Cart summary */}
      <CartSummary subtotal={subtotal} itemCount={itemCount} />
    </div>
  );
}

// ─── Guest Cart ────────────────────────────────────────────────────────────────

function GuestCart() {
  const t = useTranslations('public.cart');
  const { items } = useGuestCartStore();

  const subtotal = items.reduce((sum, item) => {
    const price = item.variantDiscountedPrice ?? item.variantPrice;
    return sum + price * item.quantity;
  }, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  if (items.length === 0) {
    return <EmptyCart />;
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* Guest cart note */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Info banner */}
        <div className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          {t('guestCartNote')}
        </div>

        {/* Cart items */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-base font-semibold text-foreground">
            {t('itemCountPlural', { count: itemCount })}
          </h2>
          <div className="divide-y divide-border">
            {items.map((item) => (
              <CartItem key={item.variantId} item={item} isGuest />
            ))}
          </div>
        </div>
      </div>

      {/* Cart summary */}
      <CartSummary subtotal={subtotal} itemCount={itemCount} />
    </div>
  );
}

// ─── Cart Merge Effect ─────────────────────────────────────────────────────────

/**
 * Runs once when the user becomes authenticated.
 * Merges any GuestCart items into the server cart (req 6.11).
 */
function CartMergeEffect() {
  const t = useTranslations('public.cart');
  const { mergeCart } = useCartMerge();
  const { items: guestItems } = useGuestCartStore();
  const hasMergedRef = useRef(false);

  useEffect(() => {
    if (hasMergedRef.current) return;
    if (guestItems.length === 0) return;

    hasMergedRef.current = true;

    const run = async () => {
      const toastId = toast.loading(t('merging'));
      try {
        await mergeCart();
        toast.success(t('mergeDone'), { id: toastId });
      } catch (failedCount) {
        // Some items couldn't be merged (out of stock / limit exceeded)
        toast.success(t('mergePartial', { count: Number(failedCount) }), { id: toastId });
      }
    };

    run();
  }, [mergeCart, guestItems.length, t]);

  return null;
}

// ─── Exported content component ───────────────────────────────────────────────

export function CartPageContent() {
  const t = useTranslations('public.cart');
  const { user } = useCustomerAuthStore();
  const isAuthenticated = !!user;

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Page heading */}
      <h1 className="mb-8 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {t('title')}
      </h1>

      {isAuthenticated ? (
        <>
          {/* Merge guest cart into server cart on login */}
          <CartMergeEffect />
          <AuthenticatedCart />
        </>
      ) : (
        <GuestCart />
      )}
    </div>
  );
}
