'use client';

/**
 * Support Ticket Detail Page Content — app/(public)/account/support/[ticketId]/SupportTicketDetailPageContent.tsx
 *
 * Client component extracted from page.tsx to allow metadata export in the
 * server component page. Receives params as a Promise and unwraps with use().
 *
 * Requirements: 9.1, 9.8, 9.10, 14.8
 */

import { AccountNav } from '@/components/public/account/AccountNav';
import { SupportTicketDetail } from '@/components/public/account/SupportTicketDetail';
import { useHydrated } from '@/lib/hooks/useHydrated';
import { useCustomerAuthStore } from '@/lib/stores/customer-auth-store';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useEffect } from 'react';

// ─── Auth skeleton ────────────────────────────────────────────────────────────

function TicketDetailPageSkeleton() {
    return (
        <div className="animate-pulse space-y-4" aria-hidden="true">
            <div className="h-8 w-48 rounded bg-muted" />
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <div className="h-6 w-64 rounded bg-muted" />
                <div className="h-5 w-20 rounded-full bg-muted" />
                <div className="space-y-3 pt-4">
                    {Array.from({ length: 3 }, (_, i) => (
                        <div
                            key={i}
                            className={`flex flex-col gap-1.5 max-w-[70%] rounded-xl p-4 bg-muted ${
                                i % 2 === 0 ? 'self-start' : 'self-end ml-auto'
                            }`}
                        >
                            <div className="h-3 w-16 rounded bg-muted-foreground/20" />
                            <div className="h-4 w-48 rounded bg-muted-foreground/20" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Exported content component ───────────────────────────────────────────────

interface SupportTicketDetailPageContentProps {
    params: Promise<{ ticketId: string }>;
}

export function SupportTicketDetailPageContent({ params }: SupportTicketDetailPageContentProps) {
    // Unwrap async params — Next.js 15+ pattern
    const { ticketId } = use(params);

    const t = useTranslations('public.account');
    const hydrated = useHydrated();
    const { user } = useCustomerAuthStore();
    const router = useRouter();

    // Auth guard
    useEffect(() => {
        if (user === null) {
            router.replace(`/login?redirect=/account/support/${ticketId}`);
        }
    }, [user, router, ticketId]);

    // Show skeleton while auth resolves
    if (!hydrated || !user) {
        return (
            <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
                <TicketDetailPageSkeleton />
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
                    {/* Back link */}
                    <Link
                        href="/account/support"
                        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                    >
                        ← {t('supportTitle')}
                    </Link>

                    {/* Ticket detail */}
                    <div className="rounded-xl border border-border bg-card p-6">
                        <SupportTicketDetail ticketId={ticketId} />
                    </div>
                </main>
            </div>
        </div>
    );
}
