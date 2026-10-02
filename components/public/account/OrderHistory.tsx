'use client';

/**
 * OrderHistory — paginated list of the authenticated customer's orders.
 *
 * Fetches GET /orders via usePublicQuery with key ['public', 'orders'].
 * Renders each order as a summary row: order number (link to /orders/:id),
 * status badge, payment status badge, total (via CurrencyDisplay), and date.
 * Shows 3 skeleton rows while loading.
 * Shows EmptyState when no orders exist.
 * Supports page-based pagination via local state.
 * Responsive: table layout on desktop, card layout on mobile.
 *
 * Requirements: 8.2
 */

import { CurrencyDisplay } from '@/components/public/common/CurrencyDisplay';
import { EmptyState } from '@/components/public/common/EmptyState';
import { usePublicQuery } from '@/lib/api/public-hooks';
import { publicQueryKeys } from '@/lib/api/public-query-keys';
import { cn } from '@/lib/utils';
import type { OrderStatus, OrderSummary, Pagination, PaymentStatus } from '@/types/public';
import {
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    PackageSearch,
    RefreshCw,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrdersApiResponse {
    success: boolean;
    data: {
        orders: OrderSummary[];
        pagination: Pagination;
    };
}

// ─── Status badge helpers ─────────────────────────────────────────────────────

/**
 * Order status badge colors per spec:
 * pending=yellow, processing=blue, shipped=blue, delivered=green,
 * cancelled=red, refunded=purple
 */
const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
    pending:
        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    confirmed:
        'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    processing:
        'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    ready_for_pickup:
        'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    shipped:
        'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    delivered:
        'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    picked_up:
        'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    cancelled:
        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    refunded:
        'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
};

/**
 * Payment status badge colors per spec:
 * pending=yellow, paid=green, failed=red, refunded=purple
 */
const PAYMENT_STATUS_STYLES: Record<PaymentStatus, string> = {
    pending:
        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    paid:
        'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    failed:
        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    refunded:
        'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    cod_pending:
        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    cop_pending:
        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function OrderStatusBadge({ status }: { status: OrderStatus }) {
    const t = useTranslations('public.orders');
    const labelMap: Record<OrderStatus, string> = {
        pending: t('statusPending'),
        confirmed: t('statusConfirmed'),
        processing: t('statusProcessing'),
        ready_for_pickup: t('statusReadyForPickup'),
        shipped: t('statusShipped'),
        delivered: t('statusDelivered'),
        picked_up: t('statusPickedUp'),
        cancelled: t('statusCancelled'),
        refunded: t('paymentRefunded'),
    };
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                ORDER_STATUS_STYLES[status],
            )}
        >
            {labelMap[status]}
        </span>
    );
}

function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
    const t = useTranslations('public.orders');
    const labelMap: Record<PaymentStatus, string> = {
        pending: t('paymentPending'),
        paid: t('paymentPaid'),
        failed: t('paymentFailed'),
        refunded: t('paymentRefunded'),
        cod_pending: t('paymentCodPending'),
        cop_pending: t('paymentCopPending'),
    };
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                PAYMENT_STATUS_STYLES[status],
            )}
        >
            {labelMap[status]}
        </span>
    );
}

// ─── Skeleton rows ────────────────────────────────────────────────────────────

function OrderRowSkeleton() {
    return (
        <div
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
            aria-hidden="true"
        >
            {/* Left: order number + date */}
            <div className="flex flex-col gap-2">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            </div>
            {/* Middle: badges */}
            <div className="flex gap-2">
                <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
                <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
            </div>
            {/* Right: total + link */}
            <div className="flex items-center gap-4">
                <div className="h-5 w-16 animate-pulse rounded bg-muted" />
                <div className="h-8 w-24 animate-pulse rounded-lg bg-muted" />
            </div>
        </div>
    );
}

// ─── Order row ────────────────────────────────────────────────────────────────

function OrderRow({ order }: { order: OrderSummary }) {
    const t = useTranslations('public.orders');

    const formattedDate = new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    }).format(new Date(order.createdAt));

    // Backend returns `orderId` as the human-readable order number (e.g. "ORD-MPA6G4IXONVY")
    const displayNumber = order.orderNumber || order.orderId || order._id;

    return (
        <article
            className={cn(
                'flex flex-col gap-3 rounded-xl border border-border bg-card p-4',
                'sm:flex-row sm:items-center sm:justify-between',
                'transition-colors hover:bg-muted/30',
            )}
            aria-label={t('orderNumber', { number: displayNumber })}
        >
            {/* ── Order number + date ─────────────────────────────────────────── */}
            <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-semibold text-foreground truncate">
                    {t('orderNumber', { number: displayNumber })}
                </span>
                <span className="text-xs text-muted-foreground">
                    {t('orderDate', { date: formattedDate })}
                </span>
            </div>

            {/* ── Status badges ───────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-2">
                <OrderStatusBadge status={order.status} />
                <PaymentStatusBadge status={order.paymentStatus} />
            </div>

            {/* ── Total + view link ────────────────────────────────────────────── */}
            <div className="flex items-center gap-4 sm:shrink-0">
                <CurrencyDisplay
                    amount={order.total}
                    className="text-sm font-semibold text-foreground tabular-nums"
                />
                <Link
                    href={`/orders/${order.orderId}`}
                    className={cn(
                        'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5',
                        'text-xs font-medium',
                        'border border-border bg-background text-foreground',
                        'hover:bg-muted transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        'min-h-[36px]',
                    )}
                >
                    {t('viewDetails')}
                    <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
                </Link>
            </div>
        </article>
    );
}

// ─── Pagination controls ──────────────────────────────────────────────────────

interface PaginationControlsProps {
    pagination: Pagination;
    currentPage: number;
    onPageChange: (page: number) => void;
}

function PaginationControls({
    pagination,
    currentPage,
    onPageChange,
}: PaginationControlsProps) {
    const t = useTranslations('public.common');

    if (pagination.totalPages <= 1) return null;

    return (
        <nav
            className="flex items-center justify-between gap-4 pt-2"
            aria-label={t('page')}
        >
            <span className="text-xs text-muted-foreground">
                {t('showing', {
                    start: (currentPage - 1) * pagination.perPage + 1,
                    end: Math.min(currentPage * pagination.perPage, pagination.totalCount),
                    total: pagination.totalCount,
                })}
            </span>

            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={!pagination.hasPrevPage}
                    aria-label={t('previous')}
                    className={cn(
                        'inline-flex items-center justify-center rounded-md p-1.5',
                        'border border-border bg-background text-foreground',
                        'hover:bg-muted transition-colors',
                        'disabled:pointer-events-none disabled:opacity-40',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        'min-h-[36px] min-w-[36px]',
                    )}
                >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                </button>

                <span className="px-3 text-sm text-foreground tabular-nums">
                    {currentPage} / {pagination.totalPages}
                </span>

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={!pagination.hasNextPage}
                    aria-label={t('next')}
                    className={cn(
                        'inline-flex items-center justify-center rounded-md p-1.5',
                        'border border-border bg-background text-foreground',
                        'hover:bg-muted transition-colors',
                        'disabled:pointer-events-none disabled:opacity-40',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        'min-h-[36px] min-w-[36px]',
                    )}
                >
                    <ChevronRight className="size-4" aria-hidden="true" />
                </button>
            </div>
        </nav>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

const ORDERS_PER_PAGE = 10;
const SKELETON_COUNT = 3;

export function OrderHistory() {
    const t = useTranslations('public.orders');
    const tc = useTranslations('public.common');
    const [currentPage, setCurrentPage] = useState(1);

    const { data, isLoading, isError, refetch } = usePublicQuery<OrdersApiResponse>(
        [...publicQueryKeys.orders, currentPage],
        '/orders',
        {
            staleTime: 1000 * 60 * 2, // 2 minutes
        },
        {
            params: { page: currentPage, limit: ORDERS_PER_PAGE },
        },
    );

    // Resolve orders and pagination from the response envelope
    const orders: OrderSummary[] = (data as any)?.data?.orders ?? [];
    const pagination: Pagination | null = (data as any)?.data?.pagination ?? null;

    // ── Loading state ──────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <section aria-label={t('loadingOrders')} aria-busy="true">
                <div className="flex flex-col gap-3">
                    {Array.from({ length: SKELETON_COUNT }, (_, i) => (
                        <OrderRowSkeleton key={i} />
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
    if (orders.length === 0) {
        return (
            <EmptyState
                icon={<PackageSearch className="size-8" aria-hidden="true" />}
                title={t('noOrders')}
                description={t('noOrdersHint')}
                ctaLabel={t('shopNow')}
                ctaHref="/products"
            />
        );
    }

    // ── Orders list ────────────────────────────────────────────────────────────
    return (
        <section aria-label={t('pageTitle')}>
            {/* ── Column headers (desktop only) ─────────────────────────────── */}
            <div
                className="hidden sm:grid sm:grid-cols-[1fr_auto_auto] gap-4 px-4 pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide"
                aria-hidden="true"
            >
                <span>{t('title')}</span>
                <span>{t('orderStatus')}</span>
                <span className="text-right">{t('orderTotal')}</span>
            </div>

            {/* ── Order rows ────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-3" role="list">
                {orders.map((order) => (
                    <div key={order._id} role="listitem">
                        <OrderRow order={order} />
                    </div>
                ))}
            </div>

            {/* ── Pagination ────────────────────────────────────────────────── */}
            {pagination && (
                <div className="mt-4">
                    <PaginationControls
                        pagination={pagination}
                        currentPage={currentPage}
                        onPageChange={setCurrentPage}
                    />
                </div>
            )}
        </section>
    );
}

export default OrderHistory;
