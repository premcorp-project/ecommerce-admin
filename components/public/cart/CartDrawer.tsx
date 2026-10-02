'use client';

/**
 * CartDrawer — slide-out cart panel triggered from the Navbar cart icon.
 *
 * Uses shadcn Drawer (vaul) with direction="right" for smooth spring animation
 * and swipe-to-dismiss gesture.
 *
 * - Full-height on mobile, fixed-width (sm:max-w-md) on desktop
 * - Authenticated: fetches GET /orders/cart via usePublicQuery + skeleton while loading
 * - Guest: reads from useGuestCartStore (localStorage), no loading state
 * - Renders CartItem list, CartSummary at bottom, EmptyCart when empty
 *
 * Requirements: 6.2, 14.7
 */

import { CartItem } from '@/components/public/cart/CartItem';
import { EmptyCart } from '@/components/public/cart/EmptyCart';
import { CurrencyDisplay } from '@/components/public/common/CurrencyDisplay';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer';
import { Skeleton } from '@/components/ui/skeleton';
import { usePublicQuery } from '@/lib/api/public-hooks';
import { publicQueryKeys } from '@/lib/api/public-query-keys';
import { useCartDrawerStore } from '@/lib/stores/cart-drawer-store';
import { useCustomerAuthStore } from '@/lib/stores/customer-auth-store';
import { useGuestCartStore } from '@/lib/stores/guest-cart-store';
import type { Cart } from '@/types/public';
import { ArrowRight, ShoppingCart, Tag, Truck, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface CartDrawerProps {
  /** Whether the drawer is open */
  open: boolean;
  /** Callback to close the drawer */
  onClose: () => void;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CartItemSkeleton() {
  return (
    <div className="flex gap-4 py-4 border-b border-border">
      <Skeleton className="size-20 rounded-md shrink-0" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-3/4 rounded" />
        <Skeleton className="h-3 w-1/2 rounded" />
        <Skeleton className="h-3 w-1/3 rounded" />
        <div className="flex items-center gap-3 mt-2">
          <Skeleton className="h-9 w-24 rounded" />
          <Skeleton className="h-5 w-16 rounded ml-auto" />
          <Skeleton className="size-9 rounded" />
        </div>
      </div>
    </div>
  );
}

// ─── Authenticated cart content ───────────────────────────────────────────────

interface AuthCartContentProps {
  t: ReturnType<typeof useTranslations<'public.cart'>>;
}

function AuthCartContent({ t }: AuthCartContentProps) {
  const { data, isLoading } = usePublicQuery<Cart>(
    publicQueryKeys.cart,
    '/orders/cart',
    { staleTime: 1000 * 30, retry: false },
  );

  // Unwrap the API response envelope
  const rawD = (data as any)?.data;
  const cart = rawD?.cart ?? rawD;
  const items: Cart['items'] = cart?.items ?? [];
  const itemCount: number = cart?.itemCount ?? items.length;

  const subtotal = items.reduce((sum, item) => {
    const price = item.variant.discountedPrice ?? item.variant.price;
    return sum + price * item.quantity;
  }, 0);

  if (isLoading) {
    return (
      <>
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="px-4 py-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <CartItemSkeleton key={i} />
            ))}
          </div>
        </div>
        <div className="border-t border-border p-4 shrink-0">
          <Skeleton className="h-36 w-full rounded-xl" />
        </div>
      </>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <EmptyCart />
      </div>
    );
  }

  return (
    <>
      {/* Scrollable item list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="px-4 divide-y divide-border">
          {items.map((item) => (
            <CartItem key={item._id} item={item} />
          ))}
        </div>
      </div>

      {/* Footer — subtotal + checkout */}
      <DrawerFooter subtotal={subtotal} itemCount={itemCount} />
    </>
  );
}

// ─── Guest cart content ───────────────────────────────────────────────────────

function GuestCartContent() {
  const { items, itemCount } = useGuestCartStore();

  const subtotal = items.reduce((sum, item) => {
    const price = item.variantDiscountedPrice ?? item.variantPrice;
    return sum + price * item.quantity;
  }, 0);

  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <EmptyCart />
      </div>
    );
  }

  return (
    <>
      {/* Scrollable item list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="px-4 divide-y divide-border">
          {items.map((item) => (
            <CartItem key={item.variantId} item={item} isGuest />
          ))}
        </div>
      </div>

      {/* Footer — subtotal + checkout */}
      <DrawerFooter subtotal={subtotal} itemCount={itemCount} />
    </>
  );
}

// ─── Compact Drawer Footer ────────────────────────────────────────────────────

function DrawerFooter({ subtotal, itemCount }: { subtotal: number; itemCount: number }) {
  const t = useTranslations('public.cart');
  const closeDrawer = useCartDrawerStore((s) => s.close);

  return (
    <div className="shrink-0 border-t border-border bg-muted/30 px-4 py-5 flex flex-col gap-4">
      {/* Subtotal */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">{t('subtotal')}</span>
          <span className="text-sm text-muted-foreground">
            {itemCount === 1
              ? t('itemCount', { count: itemCount })
              : t('itemCountPlural', { count: itemCount })}
          </span>
        </div>
        <CurrencyDisplay
          amount={subtotal}
          className="text-xl font-bold text-foreground tabular-nums"
        />
      </div>

      {/* Info notes */}
      <div className="flex flex-col gap-2 rounded-lg bg-muted/50 p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Truck className="size-3.5 shrink-0" />
          <span>{t('deliveryEstimate')}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Tag className="size-3.5 shrink-0" />
          <span>{t('discountsAtCheckout')}</span>
        </div>
      </div>

      {/* Checkout button */}
      <Link
        href="/checkout"
        onClick={closeDrawer}
        className="flex items-center justify-center gap-2 w-full rounded-lg bg-primary text-primary-foreground text-sm font-semibold py-3.5 min-h-[48px] hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-sm"
      >
        {t('proceedToCheckout')}
        <ArrowRight className="size-4" />
      </Link>

      {/* Continue shopping */}
      <Link
        href="/products"
        onClick={closeDrawer}
        className="text-center text-xs text-muted-foreground hover:text-foreground hover:underline underline-offset-4 transition-colors"
      >
        {t('continueShopping')}
      </Link>
    </div>
  );
}

// ─── CartDrawer ───────────────────────────────────────────────────────────────

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const t = useTranslations('public.cart');
  const { user } = useCustomerAuthStore();

  return (
    <Drawer
      direction="right"
      open={open}
      onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}
    >
      <DrawerContent
        className="h-full w-[80%] sm:max-w-md flex flex-col"
        aria-label={t('drawerTitle')}
        aria-describedby={undefined}
      >
        {/* Header */}
        <DrawerHeader className="px-4 pt-4 pb-3 border-b border-border shrink-0 flex-row items-center justify-between">
          <DrawerTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
            <ShoppingCart className="size-5 text-muted-foreground" aria-hidden="true" />
            {t('drawerTitle')}
          </DrawerTitle>
          <DrawerClose className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </DrawerClose>
        </DrawerHeader>

        {/* Content — auth vs guest */}
        {user ? (
          <AuthCartContent t={t} />
        ) : (
          <GuestCartContent />
        )}
      </DrawerContent>
    </Drawer>
  );
}

export default CartDrawer;
