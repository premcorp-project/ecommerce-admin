'use client';

/**
 * Order Detail Page Content — app/(public)/orders/[orderId]/OrderDetailPageContent.tsx
 *
 * Client component extracted from page.tsx to allow metadata export in the
 * server component page. Receives params as a Promise and unwraps with use().
 *
 * Requirements: 8.3
 */

import { OrderDetail } from '@/components/public/account/OrderDetail';
import { useHydrated } from '@/lib/hooks/useHydrated';
import { useCustomerAuthStore } from '@/lib/stores/customer-auth-store';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { use, useEffect } from 'react';

// ─── Auth skeleton ────────────────────────────────────────────────────────────

function AuthCheckSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse" aria-hidden="true">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-col gap-2">
          <div className="h-7 w-48 rounded bg-muted" />
          <div className="h-4 w-36 rounded bg-muted" />
        </div>
        <div className="flex gap-2">
          <div className="h-6 w-24 rounded-full bg-muted" />
          <div className="h-6 w-20 rounded-full bg-muted" />
        </div>
      </div>
      {/* Items card */}
      <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
        <div className="h-5 w-24 rounded bg-muted" />
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex gap-4">
            <div className="size-16 rounded-md bg-muted shrink-0" />
            <div className="flex flex-col gap-2 flex-1">
              <div className="h-4 w-3/4 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted" />
            </div>
            <div className="h-4 w-16 rounded bg-muted shrink-0" />
          </div>
        ))}
      </div>
      {/* Address + pricing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
          <div className="h-5 w-32 rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-3/4 rounded bg-muted" />
        </div>
        <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
          <div className="h-5 w-32 rounded bg-muted" />
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex justify-between">
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="h-4 w-16 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Exported content component ───────────────────────────────────────────────

interface OrderDetailPageContentProps {
  params: Promise<{ orderId: string }>;
}

export function OrderDetailPageContent({ params }: OrderDetailPageContentProps) {
  // Unwrap async params — Next.js 15+ pattern
  const { orderId } = use(params);

  const t = useTranslations('public.orders');
  const hydrated = useHydrated();
  const { user } = useCustomerAuthStore();
  const router = useRouter();

  // Auth guard: redirect unauthenticated users to login with redirect param
  useEffect(() => {
    if (user === null) {
      router.replace(`/login?redirect=/orders/${orderId}`);
    }
  }, [user, router, orderId]);

  // Show skeleton while auth state resolves
  if (!hydrated || !user) {
    return (
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 h-8 w-48 animate-pulse rounded bg-muted" aria-hidden="true" />
        <AuthCheckSkeleton />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Page heading — OrderDetail renders its own order number once loaded */}
      <h1 className="sr-only">{t('loadingOrder')}</h1>

      {/* Order detail — fetches its own data */}
      <OrderDetail orderId={orderId} />
    </div>
  );
}
