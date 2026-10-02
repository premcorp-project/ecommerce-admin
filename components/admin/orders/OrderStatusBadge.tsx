'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from '@/components/ui/select';

// --- Types ---

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'ready_for_pickup'
  | 'shipped'
  | 'delivered'
  | 'picked_up'
  | 'cancelled';

export interface StatusChangePayload {
  status: OrderStatus;
  estimatedDelivery?: string; // ISO string, only when status === 'shipped'
}

interface OrderStatusBadgeProps {
  status: OrderStatus;
  canWrite: boolean;
  disabled?: boolean;
  onStatusChange?: (payload: StatusChangePayload) => void;
}

// --- Constants ---

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  processing: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  ready_for_pickup: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  shipped: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  picked_up: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'ready_for_pickup',
  'shipped',
  'delivered',
  'picked_up',
  'cancelled',
];

const today = () => new Date().toISOString().split('T')[0];

// --- Component ---

export default function OrderStatusBadge({
  status,
  canWrite,
  disabled = false,
  onStatusChange,
}: OrderStatusBadgeProps) {
  const t = useTranslations('admin.orders');

  // Pending selection — held until confirmed (for shipped, waits for date picker)
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null);
  const [estimatedDelivery, setEstimatedDelivery] = useState<string>('');
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Reset pending state whenever the external status changes
  useEffect(() => {
    setPendingStatus(null);
    setEstimatedDelivery('');
  }, [status]);

  const badge = (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status] || 'bg-muted text-muted-foreground'}`}
    >
      {t(`statuses.${status}`)}
    </span>
  );

  if (!canWrite || !onStatusChange) {
    return badge;
  }

  const handleSelectChange = (value: string) => {
    const next = value as OrderStatus;
    if (next === 'shipped') {
      // Hold — show date picker before firing
      setPendingStatus('shipped');
      setEstimatedDelivery('');
      // Focus the date input on next tick
      setTimeout(() => dateInputRef.current?.focus(), 50);
    } else {
      // Fire immediately for all other statuses
      setPendingStatus(null);
      setEstimatedDelivery('');
      onStatusChange({ status: next });
    }
  };

  const handleConfirmShipped = () => {
    onStatusChange({
      status: 'shipped',
      estimatedDelivery: estimatedDelivery
        ? new Date(estimatedDelivery).toISOString()
        : undefined,
    });
    setPendingStatus(null);
    setEstimatedDelivery('');
  };

  const handleCancelShipped = () => {
    setPendingStatus(null);
    setEstimatedDelivery('');
  };

  // While waiting for the date picker confirmation, show the picker inline
  if (pendingStatus === 'shipped') {
    return (
      <div className="flex flex-col gap-1.5 min-w-[200px]">
        <span className="text-xs font-medium text-foreground">
          {t('statusUpdate.shippedDateLabel')}
        </span>
        <input
          ref={dateInputRef}
          type="date"
          min={today()}
          value={estimatedDelivery}
          onChange={(e) => setEstimatedDelivery(e.target.value)}
          className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label={t('statusUpdate.estimatedDeliveryAriaLabel')}
        />
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={handleConfirmShipped}
            className="flex-1 h-7 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            {t('statusUpdate.confirm')}
          </button>
          <button
            type="button"
            onClick={handleCancelShipped}
            className="flex-1 h-7 rounded-md border border-border bg-background text-xs text-muted-foreground hover:bg-muted transition-colors"
          >
            {t('statusUpdate.cancel')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <Select
      value={status}
      onValueChange={handleSelectChange}
      disabled={disabled}
    >
      <SelectTrigger className="w-[130px] h-8 text-xs border-0 bg-transparent p-0 justify-center gap-1">
        {badge}
      </SelectTrigger>
      <SelectContent>
        {ORDER_STATUSES.map((s) => (
          <SelectItem key={s} value={s} className="text-xs">
            {t(`statuses.${s}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
