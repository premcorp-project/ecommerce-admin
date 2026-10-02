'use client';

/**
 * Profile Page Content — app/(public)/account/profile/ProfilePageContent.tsx
 *
 * Client component extracted from page.tsx to allow metadata export in the
 * server component page.
 *
 * Requirements: 9.1, 9.3, 9.4, 9.10, 14.8
 */

import { AccountNav } from '@/components/public/account/AccountNav';
import { PasswordForm } from '@/components/public/account/PasswordForm';
import { ProfileForm } from '@/components/public/account/ProfileForm';
import { useHydrated } from '@/lib/hooks/useHydrated';
import { useCustomerAuthStore } from '@/lib/stores/customer-auth-store';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// ─── Auth skeleton ────────────────────────────────────────────────────────────

function ProfilePageSkeleton() {
    return (
        <div className="animate-pulse space-y-8" aria-hidden="true">
            <div className="h-8 w-48 rounded bg-muted" />
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <div className="h-5 w-40 rounded bg-muted" />
                {Array.from({ length: 3 }, (_, i) => (
                    <div key={i} className="space-y-2">
                        <div className="h-4 w-24 rounded bg-muted" />
                        <div className="h-10 w-full rounded-lg bg-muted" />
                    </div>
                ))}
                <div className="h-10 w-32 rounded-lg bg-muted" />
            </div>
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <div className="h-5 w-40 rounded bg-muted" />
                {Array.from({ length: 3 }, (_, i) => (
                    <div key={i} className="space-y-2">
                        <div className="h-4 w-24 rounded bg-muted" />
                        <div className="h-10 w-full rounded-lg bg-muted" />
                    </div>
                ))}
                <div className="h-10 w-32 rounded-lg bg-muted" />
            </div>
        </div>
    );
}

// ─── Exported content component ───────────────────────────────────────────────

export function ProfilePageContent() {
    const t = useTranslations('public.account');
    const hydrated = useHydrated();
    const { user } = useCustomerAuthStore();
    const router = useRouter();

    // Auth guard
    useEffect(() => {
        if (user === null) {
            router.replace('/login?redirect=/account/profile');
        }
    }, [user, router]);

    // Show skeleton while auth resolves
    if (!hydrated || !user) {
        return (
            <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
                <ProfilePageSkeleton />
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

                <main className="flex-1 min-w-0 space-y-8">
                    {/* Profile information form */}
                    <div className="rounded-xl border border-border bg-card p-6">
                        <ProfileForm />
                    </div>

                    {/* Change password form */}
                    <PasswordForm />
                </main>
            </div>
        </div>
    );
}
