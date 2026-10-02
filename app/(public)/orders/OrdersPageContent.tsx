'use client';

/**
 * Orders Page Content — app/(public)/orders/OrdersPageContent.tsx
 *
 * Client component extracted from page.tsx to allow metadata export in the
 * server component page.
 *
 * Requirements: 8.1
 */

import { OrderHistory } from '@/components/public/account/OrderHistory';
import { useHydrated } from '@/lib/hooks/useHydrated';
import { useCustomerAuthStore } from '@/lib/stores/customer-auth-store';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// ─── Auth skeleton ────────────────────────────────────────────────────────────

function AuthCheckSkeleton() {
  return (
    <div className="flex flex-col gap-3 animate-pulse" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex flex-col gap-2">
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="h-3 w-24 rounded bg-muted" />
          </div>
          <div className="flex gap-2">
            <div className="h-5 w-20 rounded-full bg-muted" />
            <div className="h-5 w-16 rounded-full bg-muted" />
          </div>
          <div className="flex items-center gap-4">
            <div className="h-5 w-16 rounded bg-muted" />
            <div className="h-8 w-24 rounded-lg bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Exported content component ───────────────────────────────────────────────

export function OrdersPageContent() {
  const t = useTranslations('public.orders');
  const hydrated = useHydrated();
  const { user } = useCustomerAuthStore();
  const router = useRouter();

  // Auth guard: redirect unauthenticated users to login with redirect param
  useEffect(() => {
    if (user === null) {
      router.replace('/login?redirect=/orders');
    }
  }, [user, router]);

  // Show skeleton while auth state is being determined (user is null on first
  // render before sessionStorage hydration completes)
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
      {/* Page heading */}
      <h1 className="mb-8 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {t('pageTitle')}
      </h1>

      {/* Order history list */}
      <OrderHistory />
    </div>
  );
}
