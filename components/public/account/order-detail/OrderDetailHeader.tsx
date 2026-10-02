'use client';

/**
 * OrderDetailHeader — order number, status badges, date, and action buttons.
 * Part of the OrderDetail component split.
 */

import { AppAlertDialog } from '@/components/shared/AppAlertDialog';
import { cn } from '@/lib/utils';
import type { Order, OrderStatus, PaymentStatus } from '@/types/public';
import { ShoppingCart, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

// ─── Status badge helpers ─────────────────────────────────────────────────────

const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  ready_for_pickup: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  shipped: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  picked_up: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  refunded: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const PAYMENT_STATUS_STYLES: Record<PaymentStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  refunded: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  cod_pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  cop_pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
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

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
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

// ─── Props ────────────────────────────────────────────────────────────────────

interface OrderDetailHeaderProps {
  order: Order;
  isCancelling: boolean;
  isReordering: boolean;
  onReorder: () => void;
  onCancelConfirm: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OrderDetailHeader({
  order,
  isCancelling,
  isReordering,
  onReorder,
  onCancelConfirm,
}: OrderDetailHeaderProps) {
  const t = useTranslations('public.orders');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const canCancel = order.status === 'pending' || order.status === 'confirmed';

  const formattedDate = (() => {
    const date = new Date(order.createdAt);
    if (isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  })();

  return (
    <header className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-start sm:justify-between">
      {/* Order number + date + badges */}
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-semibold text-foreground">
          {t('orderNumber', { number: order.orderId ?? (order as any).orderNumber ?? '' })}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('orderDate', { date: formattedDate })}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge status={order.paymentStatus} />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
        {/* Reorder */}
        <button
          onClick={onReorder}
          disabled={isReordering}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg px-4 py-2',
            'text-sm font-medium border border-border bg-background text-foreground',
            'hover:bg-muted transition-colors',
            'disabled:pointer-events-none disabled:opacity-60',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'min-h-[40px]',
          )}
        >
          <ShoppingCart className="size-4" aria-hidden="true" />
          {isReordering ? t('lookup.submitting') : t('reorder')}
        </button>

        {/* Cancel — only for pending/confirmed */}
        {canCancel && (
          <>
            <button
              onClick={() => setCancelDialogOpen(true)}
              disabled={isCancelling}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-4 py-2',
                'text-sm font-medium',
                'border border-destructive/40 bg-destructive/10 text-destructive',
                'hover:bg-destructive/20 transition-colors',
                'disabled:pointer-events-none disabled:opacity-60',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'min-h-[40px]',
              )}
            >
              <XCircle className="size-4" aria-hidden="true" />
              {t('cancelOrder')}
            </button>

            <AppAlertDialog
              open={cancelDialogOpen}
              onOpenChange={setCancelDialogOpen}
              title={t('cancelOrder')}
              subTitle={t('cancelConfirm')}
              confirmLabel={t('cancelOrder')}
              onConfirm={() => {
                onCancelConfirm();
                setCancelDialogOpen(false);
              }}
              onCancel={() => setCancelDialogOpen(false)}
              loading={isCancelling}
              variant="delete"
              size="md"
            />
          </>
        )}
      </div>
    </header>
  );
}
