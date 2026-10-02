'use client';

/**
 * Wishlist Page Content — app/(public)/account/wishlist/WishlistPageContent.tsx
 *
 * Client component extracted from page.tsx to allow metadata export in the
 * server component page.
 *
 * Requirements: 9.1, 9.6, 9.10, 14.8
 */

import { AccountNav } from '@/components/public/account/AccountNav';
import { WishlistGrid } from '@/components/public/account/WishlistGrid';
import { ProductSkeleton } from '@/components/public/common/ProductSkeleton';
import { useHydrated } from '@/lib/hooks/useHydrated';
import { useCustomerAuthStore } from '@/lib/stores/customer-auth-store';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// ─── Auth skeleton ────────────────────────────────────────────────────────────

function WishlistPageSkeleton() {
    return (
        <div className="animate-pulse" aria-hidden="true">
            <div className="h-8 w-48 rounded bg-muted mb-8" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 4 }, (_, i) => (
                    <ProductSkeleton key={i} />
                ))}
            </div>
        </div>
    );
}

// ─── Exported content component ───────────────────────────────────────────────

export function WishlistPageContent() {
    const t = useTranslations('public.account');
    const hydrated = useHydrated();
    const { user } = useCustomerAuthStore();
    const router = useRouter();

    // Auth guard
    useEffect(() => {
        if (user === null) {
            router.replace('/login?redirect=/account/wishlist');
        }
    }, [user, router]);

    // Show skeleton while auth resolves
    if (!hydrated || !user) {
        return (
            <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
                <WishlistPageSkeleton />
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
            {/* ── Page heading ──────────────────────────────────────────────── */}
            <h1 className="mb-8 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {t('title')}
            </h1>

            {/* ── Responsive layout ─────────────────────────────────────────── */}
            <div className="flex flex-col gap-8 md:flex-row md:gap-10">
                <AccountNav />

                <main className="flex-1 min-w-0">
                    <WishlistGrid />
                </main>
            </div>
        </div>
    );
}
