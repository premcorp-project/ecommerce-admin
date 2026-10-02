'use client';

/**
 * OrderDetail — full order detail view for authenticated customers.
 *
 * Fetches GET /orders/:orderId via usePublicQuery with key ['public', 'order', orderId].
 * Renders: order header (number, status badges, date, actions), items list,
 * delivery address, pricing breakdown, and tracking link.
 *
 * Cancel button shown only for pending/confirmed orders (uses AppAlertDialog).
 * Reorder button calls POST /orders/:orderId/reorder and navigates to /cart.
 * Shows PageSkeleton while loading.
 *
 * Requirements: 8.3, 8.4, 8.5, 8.6
 */

import { PageSkeleton } from '@/components/public/common/PageSkeleton';
import { usePublicMutation, usePublicQuery } from '@/lib/api/public-hooks';
import { publicQueryKeys } from '@/lib/api/public-query-keys';
import { cn } from '@/lib/utils';
import type { Order } from '@/types/public';
import { useQueryClient } from '@tanstack/react-query';
import { ExternalLink, RefreshCw, Truck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { OrderDetailHeader } from './order-detail/OrderDetailHeader';
import { OrderDetailItems } from './order-detail/OrderDetailItems';
import { OrderDetailPricing } from './order-detail/OrderDetailPricing';
import { YouMightAlsoLike } from './order-detail/YouMightAlsoLike';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderDetailProps {
  orderId: string;
}

interface OrderApiResponse {
  success: boolean;
  data: Order;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OrderDetail({ orderId }: OrderDetailProps) {
  const t = useTranslations('public.orders');
  const router = useRouter();
  const queryClient = useQueryClient();

  // ── Fetch order ────────────────────────────────────────────────────────────
  const { data, isLoading, isError, refetch } = usePublicQuery<OrderApiResponse>(
    publicQueryKeys.order(orderId),
    `/orders/${orderId}`,
    { staleTime: 1000 * 60 * 2 },
  );

  // Unwrap: { success, data: { order: {...} } } or { success, data: Order }
  const rawData = (data as any)?.data;
  const order: Order | null = rawData?.order ?? rawData ?? null;

  // ── Cancel mutation ────────────────────────────────────────────────────────
  const { mutate: cancelOrder, isPending: isCancelling } = usePublicMutation<unknown, void>(
    'post',
    `/orders/${orderId}/cancel`,
    {
      onSuccess: () => {
        toast.success(t('cancelSuccess'));
        queryClient.invalidateQueries({ queryKey: publicQueryKeys.orders });
        queryClient.invalidateQueries({ queryKey: publicQueryKeys.order(orderId) });
      },
      onError: () => {
        toast.error(t('cancelError'));
      },
    },
  );

  // ── Reorder mutation ───────────────────────────────────────────────────────
  const { mutate: reorder, isPending: isReordering } = usePublicMutation<unknown, void>(
    'post',
    `/orders/${orderId}/reorder`,
    {
      onSuccess: () => {
        toast.success(t('reorderSuccess'));
        queryClient.invalidateQueries({ queryKey: publicQueryKeys.cart });
        router.push('/cart');
      },
      onError: () => {
        toast.error(t('reorderError'));
      },
    },
  );

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <section aria-label={t('loadingOrder')} aria-busy="true">
        <PageSkeleton />
      </section>
    );
  }

  // ── Error / not found state ────────────────────────────────────────────────
  if (isError || !order) {
    return (
      <section className="flex flex-col items-center gap-4 py-12 text-center">
        <p className="text-sm text-muted-foreground">{t('loadingOrder')}</p>
        <button
          onClick={() => refetch()}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg px-4 py-2',
            'text-sm font-medium border border-border bg-background text-foreground',
            'hover:bg-muted transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          {t('loadingOrder')}
        </button>
      </section>
    );
  }

  return (
    <article
      className="flex flex-col gap-6"
      aria-label={t('orderNumber', { number: order.orderId ?? (order as any).orderNumber ?? '' })}
    >
      {/* ── Order header: number, status badges, date, action buttons ─── */}
      <OrderDetailHeader
        order={order}
        isCancelling={isCancelling}
        isReordering={isReordering}
        onReorder={() => reorder(undefined as unknown as void)}
        onCancelConfirm={() => cancelOrder(undefined as unknown as void)}
      />

      {/* ── Tracking link (only when trackingUrl is present) ─────────── */}
      {order.trackingUrl && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <Truck className="size-5 text-primary shrink-0" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            {order.trackingNumber && (
              <p className="text-sm text-muted-foreground">
                {t('trackingNumber')}:{' '}
                <span className="font-mono text-foreground">{order.trackingNumber}</span>
              </p>
            )}
          </div>
          <a
            href={order.trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5',
              'text-sm font-medium text-primary',
              'border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'min-h-[36px]',
            )}
          >
            {t('trackOrder')}
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        </div>
      )}

      {/* ── Items list ────────────────────────────────────────────────── */}
      <OrderDetailItems items={order.items} orderStatus={order.status} />

      {/* ── Delivery address + pricing breakdown ──────────────────────── */}
      <OrderDetailPricing order={order} />

      {/* ── You might also like — product suggestions ─────────────────── */}
      <YouMightAlsoLike items={order.items} />
    </article>
  );
}

export default OrderDetail;
