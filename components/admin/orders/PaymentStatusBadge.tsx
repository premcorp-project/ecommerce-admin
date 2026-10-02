'use client';

import { useTranslations } from 'next-intl';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from '@/components/ui/select';

// --- Types ---

export type PaymentStatus =
  | 'unpaid'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'cod_pending'
  | 'cop_pending';

interface PaymentStatusBadgeProps {
  status: PaymentStatus | undefined;
  canWrite: boolean;
  disabled?: boolean;
  onStatusChange?: (newStatus: PaymentStatus) => void;
}

// --- Constants ---

const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  unpaid: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  refunded: 'bg-muted text-muted-foreground',
  cod_pending: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  cop_pending: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
};

const PAYMENT_STATUSES: PaymentStatus[] = [
  'unpaid',
  'paid',
  'failed',
  'refunded',
  'cod_pending',
  'cop_pending',
];

// --- Component ---

export default function PaymentStatusBadge({
  status,
  canWrite,
  disabled = false,
  onStatusChange,
}: PaymentStatusBadgeProps) {
  const t = useTranslations('admin.orders');

  if (!status) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  const badge = (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${PAYMENT_STATUS_COLORS[status] || 'bg-muted text-muted-foreground'}`}
    >
      {t(`paymentStatuses.${status}`)}
    </span>
  );

  if (!canWrite || !onStatusChange) {
    return badge;
  }

  return (
    <Select
      value={status}
      onValueChange={(value) => onStatusChange(value as PaymentStatus)}
      disabled={disabled}
    >
      <SelectTrigger className="w-[130px] h-8 text-xs border-0 bg-transparent p-0 justify-center gap-1">
        {badge}
      </SelectTrigger>
      <SelectContent>
        {PAYMENT_STATUSES.map((s) => (
          <SelectItem key={s} value={s} className="text-xs">
            {t(`paymentStatuses.${s}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
