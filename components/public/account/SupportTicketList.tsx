'use client';

/**
 * SupportTicketList — renders the authenticated customer's support tickets.
 *
 * - Fetches GET /support/tickets via usePublicQuery with key ['public', 'tickets']
 * - Renders each ticket as a row: subject, status badge, last message date, link to detail
 * - Status badge colours: open=blue, in_progress=yellow, closed=green
 * - Shows skeleton rows while loading
 * - Shows EmptyState when no tickets exist
 * - All strings via t('public.account.*')
 *
 * Requirements: 9.7
 */

import { EmptyState } from '@/components/public/common/EmptyState';
import { usePublicQuery } from '@/lib/api/public-hooks';
import { publicQueryKeys } from '@/lib/api/public-query-keys';
import { cn } from '@/lib/utils';
import type { Ticket } from '@/types/public';
import { AlertCircle, ChevronRight, MessageCircle, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TicketsApiResponse {
    success: boolean;
    data: {
        tickets: Ticket[];
    };
}

type TicketStatus = Ticket['status'];

// ─── Status badge ─────────────────────────────────────────────────────────────

const TICKET_STATUS_STYLES: Record<TicketStatus, string> = {
    open: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    resolved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    closed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

function TicketStatusBadge({ status }: { status: TicketStatus }) {
    const t = useTranslations('public.account');
    const labelMap: Record<TicketStatus, string> = {
        open: t('ticketStatusOpen'),
        in_progress: t('ticketStatusInProgress'),
        resolved: t('ticketStatusClosed'),
        closed: t('ticketStatusClosed'),
    };
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                TICKET_STATUS_STYLES[status],
            )}
        >
            {labelMap[status]}
        </span>
    );
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function TicketRowSkeleton() {
    return (
        <div
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
            aria-hidden="true"
        >
            <div className="flex flex-col gap-2 flex-1 min-w-0">
                <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                <div className="h-3 w-32 animate-pulse rounded bg-muted" />
            </div>
            <div className="flex items-center gap-3">
                <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
                <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
            </div>
        </div>
    );
}

// ─── Ticket row ───────────────────────────────────────────────────────────────

function TicketRow({ ticket }: { ticket: Ticket }) {
    const t = useTranslations('public.account');

    const formattedDate = (() => {
        const date = new Date(ticket.lastMessageAt ?? ticket.createdAt);
        if (isNaN(date.getTime())) return '—';
        return new Intl.DateTimeFormat(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        }).format(date);
    })();

    return (
        <article
            className={cn(
                'flex flex-col gap-3 rounded-xl border border-border bg-card p-4',
                'sm:flex-row sm:items-center sm:justify-between',
                'transition-colors hover:bg-muted/30',
            )}
            aria-label={ticket.subject}
        >
            {/* ── Subject + date ─────────────────────────────────────────────── */}
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <span className="text-sm font-semibold text-foreground truncate">
                    {ticket.subject}
                </span>
                <span className="text-xs text-muted-foreground">
                    {t('lastMessage', { date: formattedDate })}
                </span>
            </div>

            {/* ── Status badge + link ─────────────────────────────────────────── */}
            <div className="flex items-center gap-3 sm:shrink-0">
                <TicketStatusBadge status={ticket.status} />
                <Link
                    href={`/account/support/${ticket._id}`}
                    aria-label={ticket.subject}
                    className={cn(
                        'inline-flex items-center justify-center rounded-lg p-2',
                        'border border-border bg-background text-foreground',
                        'hover:bg-muted transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        'min-h-[36px] min-w-[36px]',
                    )}
                >
                    <ChevronRight className="size-4" aria-hidden="true" />
                </Link>
            </div>
        </article>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

const SKELETON_COUNT = 3;

export function SupportTicketList() {
    const t = useTranslations('public.account');
    const tc = useTranslations('public.common');

    const { data, isLoading, isError, refetch } = usePublicQuery<TicketsApiResponse>(
        publicQueryKeys.tickets,
        '/support/tickets',
        { staleTime: 1000 * 60 * 2 },
    );

    // Unwrap response envelope
    const tickets: Ticket[] = (data as any)?.data?.tickets ?? [];

    // ── Loading state ──────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <section aria-busy="true" aria-label={t('supportTitle')}>
                <div className="flex flex-col gap-3">
                    {Array.from({ length: SKELETON_COUNT }, (_, i) => (
                        <TicketRowSkeleton key={i} />
                    ))}
                </div>
            </section>
        );
    }

    // ── Error state ────────────────────────────────────────────────────────────
    if (isError) {
        return (
            <section className="flex flex-col items-center gap-4 py-12 text-center">
                <AlertCircle className="size-10 text-destructive" aria-hidden="true" />
                <div className="flex flex-col gap-1">
                    <p className="font-semibold text-foreground">{tc('error')}</p>
                    <p className="text-sm text-muted-foreground">{tc('errorHint')}</p>
                </div>
                <button
                    onClick={() => refetch()}
                    className={cn(
                        'inline-flex items-center gap-2 rounded-lg px-4 py-2',
                        'text-sm font-medium',
                        'bg-primary text-primary-foreground',
                        'hover:bg-primary/90 transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    )}
                >
                    <RefreshCw className="size-4" aria-hidden="true" />
                    {tc('errorRetry')}
                </button>
            </section>
        );
    }

    // ── Empty state ────────────────────────────────────────────────────────────
    if (tickets.length === 0) {
        return (
            <EmptyState
                icon={<MessageCircle className="size-8" aria-hidden="true" />}
                title={t('noTickets')}
                description={t('noTicketsHint')}
            />
        );
    }

    // ── Ticket list ────────────────────────────────────────────────────────────
    return (
        <section aria-label={t('supportTitle')}>
            <div className="flex flex-col gap-3" role="list">
                {tickets.map((ticket) => (
                    <div key={ticket._id} role="listitem">
                        <TicketRow ticket={ticket} />
                    </div>
                ))}
            </div>
        </section>
    );
}

export default SupportTicketList;
