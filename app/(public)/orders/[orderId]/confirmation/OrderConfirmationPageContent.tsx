'use client';

/**
 * Order Confirmation Page Content — app/(public)/orders/[orderId]/confirmation/OrderConfirmationPageContent.tsx
 *
 * Client component extracted from page.tsx to allow metadata export in the
 * server component page. Receives params as a Promise and unwraps with use().
 *
 * Requirements: 8.7
 */

import { CurrencyDisplay } from '@/components/public/common/CurrencyDisplay';
import { usePublicQuery } from '@/lib/api/public-hooks';
import { publicQueryKeys } from '@/lib/api/public-query-keys';
import { useCustomerAuthStore } from '@/lib/stores/customer-auth-store';
import { useGuestCartStore } from '@/lib/stores/guest-cart-store';
import type { Order } from '@/types/public';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle, ExternalLink, RefreshCw, ShoppingBag } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { use, useEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderApiResponse {
  data: Order;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ConfirmationSkeleton() {
  return (
    <div
      className="flex flex-col items-center gap-6 py-12 animate-pulse"
      aria-hidden="true"
    >
      {/* Icon placeholder */}
      <div className="size-16 rounded-full bg-muted" />
      {/* Heading */}
      <div className="h-8 w-56 rounded bg-muted" />
      {/* Card */}
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 flex flex-col gap-4">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="h-4 w-24 rounded bg-muted" />
          </div>
        ))}
      </div>
      {/* Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
        <div className="h-11 flex-1 rounded-lg bg-muted" />
        <div className="h-11 flex-1 rounded-lg bg-muted" />
      </div>
    </div>
  );
}

// ─── Exported content component ───────────────────────────────────────────────

interface OrderConfirmationPageContentProps {
  params: Promise<{ orderId: string }>;
}

export function OrderConfirmationPageContent({ params }: OrderConfirmationPageContentProps) {
  // Unwrap async params — Next.js 15+ pattern
  const { orderId } = use(params);

  const t = useTranslations('public.orders');
  const tc = useTranslations('public.common');

  // Hydration guard
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { user } = useCustomerAuthStore();
  const searchParams = useSearchParams();
  const isAuthenticated = !!user;
  const queryClient = useQueryClient();
  const { clearCart: clearGuestCart } = useGuestCartStore();

  // Stripe redirects with ?redirect_status=succeeded
  const stripeStatus = searchParams.get('redirect_status');
  const isStripeSuccess = stripeStatus === 'succeeded';

  // ── Clear cart on mount (handles both COD redirect and Stripe redirect) ────
  const hasCleared = useRef(false);
  useEffect(() => {
    if (!mounted || hasCleared.current) return;
    hasCleared.current = true;

    if (isAuthenticated) {
      queryClient.invalidateQueries({ queryKey: publicQueryKeys.cart });
    } else {
      clearGuestCart();
    }
  }, [mounted, isAuthenticated, queryClient, clearGuestCart]);

  // Only fetch order details if authenticated — guests can't access GET /orders/:id
  const { data, isLoading, isError, refetch } = usePublicQuery<OrderApiResponse>(
    publicQueryKeys.order(orderId),
    `/orders/${orderId}`,
    {
      staleTime: 1000 * 60 * 5,
      retry: 2,
      enabled: isAuthenticated && mounted, // Skip for guests and during SSR
    },
  );

  // Unwrap the response envelope: { success, data: { order: {...} } }
  const rawData = (data as any)?.data;
  const order: Order | null = rawData?.order ?? rawData ?? null;

  // Show skeleton until hydrated to avoid SSR mismatch
  if (!mounted) {
    return (
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <ConfirmationSkeleton />
      </div>
    );
  }

  // ── Guest confirmation (no API call) ───────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6 py-8 text-center">
          <div
            className="flex size-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30"
            aria-hidden="true"
          >
            <CheckCircle className="size-10 text-green-600 dark:text-green-400" strokeWidth={1.5} />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {t('confirmationTitle')}
            </h1>
            <p className="text-sm text-muted-foreground max-w-sm">
              {t('confirmationMessage')}
            </p>
          </div>
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6">
            <dl className="flex flex-col gap-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground font-medium">{t('confirmationOrderNumber')}</dt>
                <dd className="font-semibold text-foreground tabular-nums">{orderId}</dd>
              </div>
            </dl>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
            <Link
              href="/order-lookup"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[44px]"
            >
              {t('lookup.title')}
              <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
            </Link>
            <Link
              href="/products"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[44px]"
            >
              <ShoppingBag className="size-4 shrink-0" aria-hidden="true" />
              {t('continueShopping')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <ConfirmationSkeleton />
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (isError || !order) {
    return (
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div
          role="alert"
          className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center"
        >
          <AlertCircle className="size-10 text-destructive" aria-hidden="true" />
          <div>
            <p className="font-semibold text-foreground">{tc('errorTitle')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{tc('errorHint')}</p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[44px]"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            {tc('errorRetry')}
          </button>
        </div>
      </div>
    );
  }

  // ── Resolve payment method label ───────────────────────────────────────────
  const paymentMethodLabel =
    order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Stripe';

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center gap-6 py-8 text-center">

        {/* ── Success icon ──────────────────────────────────────────────── */}
        <div
          className="flex size-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30"
          aria-hidden="true"
        >
          <CheckCircle
            className="size-10 text-green-600 dark:text-green-400"
            strokeWidth={1.5}
          />
        </div>

        {/* ── Heading ───────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {t('confirmationTitle')}
          </h1>
          <p className="text-sm text-muted-foreground max-w-sm">
            {t('confirmationMessage')}
          </p>
        </div>

        {/* ── Order summary card ────────────────────────────────────────── */}
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6">
          <dl className="flex flex-col gap-4 text-sm">

            {/* Order number */}
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground font-medium">
                {t('confirmationOrderNumber')}
              </dt>
              <dd className="font-semibold text-foreground tabular-nums">
                {t('orderNumber', { number: order.orderId ?? (order as any).orderNumber ?? '' })}
              </dd>
            </div>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Total */}
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground font-medium">
                {t('confirmationTotal')}
              </dt>
              <dd className="text-base font-bold text-foreground tabular-nums">
                <CurrencyDisplay amount={order.total} />
              </dd>
            </div>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Payment method */}
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground font-medium">
                {t('confirmationPayment')}
              </dt>
              <dd className="font-semibold text-foreground">
                {paymentMethodLabel}
              </dd>
            </div>
          </dl>
        </div>

        {/* ── Action buttons ────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
          {/* View Order Details */}
          <Link
            href={`/orders/${orderId}`}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[44px]"
          >
            {t('viewOrder')}
            <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
          </Link>

          {/* Continue Shopping */}
          <Link
            href="/products"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[44px]"
          >
            <ShoppingBag className="size-4 shrink-0" aria-hidden="true" />
            {t('continueShopping')}
          </Link>
        </div>
      </div>
    </div>
  );
}
