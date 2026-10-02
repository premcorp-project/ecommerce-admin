'use client';

/**
 * Addresses Page Content — app/(public)/account/addresses/AddressesPageContent.tsx
 *
 * Client component extracted from page.tsx to allow metadata export in the
 * server component page.
 *
 * Requirements: 9.1, 9.5, 9.10, 14.8
 */

import { AccountNav } from '@/components/public/account/AccountNav';
import { AddressBook } from '@/components/public/account/AddressBook';
import { useHydrated } from '@/lib/hooks/useHydrated';
import { useCustomerAuthStore } from '@/lib/stores/customer-auth-store';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// ─── Auth skeleton ────────────────────────────────────────────────────────────

function AddressesPageSkeleton() {
    return (
        <div className="animate-pulse space-y-6" aria-hidden="true">
            <div className="h-8 w-48 rounded bg-muted" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {Array.from({ length: 2 }, (_, i) => (
                    <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
                        <div className="h-4 w-24 rounded bg-muted" />
                        <div className="h-3 w-48 rounded bg-muted" />
                        <div className="h-3 w-40 rounded bg-muted" />
                        <div className="flex gap-2 pt-1">
                            <div className="h-8 w-20 rounded-lg bg-muted" />
                            <div className="h-8 w-20 rounded-lg bg-muted" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Exported content component ───────────────────────────────────────────────

export function AddressesPageContent() {
    const t = useTranslations('public.account');
    const hydrated = useHydrated();
    const { user } = useCustomerAuthStore();
    const router = useRouter();

    // Auth guard
    useEffect(() => {
        if (user === null) {
            router.replace('/login?redirect=/account/addresses');
        }
    }, [user, router]);

    // Show skeleton while auth resolves
    if (!hydrated || !user) {
        return (
            <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
                <AddressesPageSkeleton />
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
                    <AddressBook />
                </main>
            </div>
        </div>
    );
}
