'use client';

/**
 * DeliveryFeeDisplay — calls POST /orders/delivery-fee and shows the result.
 *
 * Auth users:  POST { addressId }   — pass their saved address ID
 * Guest users: POST { city }        — pass the city from their entered address
 *
 * Response: { success, data: { deliveryFee, currency, estimatedDays } }
 *
 * Requirements: 7.6
 */

import { CurrencyDisplay } from '@/components/public/common/CurrencyDisplay';
import { usePublicMutation } from '@/lib/api/public-hooks';
import { cn } from '@/lib/utils';
import { Clock, Truck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Auth user request — pass saved address ID */
interface DeliveryFeeAuthRequest {
  addressId: string;
}

/** Guest user request — pass city string */
interface DeliveryFeeGuestRequest {
  city: string;
}

type DeliveryFeeRequest = DeliveryFeeAuthRequest | DeliveryFeeGuestRequest;

interface DeliveryFeeResponse {
  success: boolean;
  data: {
    deliveryFee: number;
    currency: string;
    estimatedDays: number;
  };
}

export interface DeliveryFeeDisplayProps {
  /**
   * Saved address ID — used for authenticated users.
   * Pass either addressId OR guestCity, not both.
   */
  addressId?: string;
  /**
   * City string — used for guest users who entered an address manually.
   * Pass either addressId OR guestCity, not both.
   */
  guestCity?: string;
  /** Called when the fee is successfully calculated */
  onFeeCalculated?: (fee: number) => void;
  /** Optional extra class names for the root element */
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DeliveryFeeDisplay({
  addressId,
  guestCity,
  onFeeCalculated,
  className,
}: DeliveryFeeDisplayProps) {
  const t = useTranslations('public.checkout');

  const {
    mutate: calculateFee,
    data: feeData,
    isPending,
    isError,
    reset,
  } = usePublicMutation<DeliveryFeeResponse, DeliveryFeeRequest>(
    'post',
    '/orders/delivery-fee',
  );

  // Build the request payload based on auth vs guest
  const buildPayload = (): DeliveryFeeRequest | null => {
    if (addressId) return { addressId };
    if (guestCity) return { city: guestCity };
    return null;
  };

  // Trigger calculation whenever addressId or guestCity changes
  useEffect(() => {
    const payload = buildPayload();
    if (!payload) return;
    calculateFee(payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressId, guestCity]);

  // Notify parent when fee is resolved
  useEffect(() => {
    const fee = feeData?.data?.deliveryFee;
    if (fee !== undefined && onFeeCalculated) {
      onFeeCalculated(fee);
    }
  }, [feeData, onFeeCalculated]);

  // ── Nothing to calculate yet ──────────────────────────────────────────────
  if (!addressId && !guestCity) return null;

  // ── Skeleton ──────────────────────────────────────────────────────────────
  if (isPending) {
    return (
      <div
        className={cn('rounded-xl border border-border bg-card p-4', className)}
        aria-busy="true"
        aria-label={t('deliveryFeeCalculating')}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="h-4 w-28 animate-pulse rounded bg-muted" />
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
        </div>
        <div className="mt-3 h-3 w-40 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (isError || !feeData) {
    return (
      <div
        className={cn(
          'rounded-xl border border-destructive/30 bg-destructive/5 p-4',
          className,
        )}
        role="alert"
      >
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-destructive">
            {t('deliveryFeeError')}
          </span>
          <button
            type="button"
            onClick={() => {
              reset();
              const payload = buildPayload();
              if (payload) calculateFee(payload);
            }}
            className="text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded min-h-[44px] min-w-[44px] flex items-center justify-end"
          >
            {t('deliveryFeeRetry')}
          </button>
        </div>
      </div>
    );
  }

  const { deliveryFee, estimatedDays } = feeData.data;
  const isFree = deliveryFee === 0;

  // ── Resolved state ────────────────────────────────────────────────────────
  return (
    <div
      className={cn('rounded-xl border border-border bg-card p-4', className)}
    >
      {/* Fee row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Truck className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span>{t('deliveryFee')}</span>
        </div>

        {isFree ? (
          <span className="text-sm font-semibold text-green-600 dark:text-green-400">
            {t('freeShipping')}
          </span>
        ) : (
          <CurrencyDisplay
            amount={deliveryFee}
            className="text-sm font-semibold text-foreground tabular-nums"
          />
        )}
      </div>

      {/* Estimated delivery days */}
      {estimatedDays > 0 && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3.5 shrink-0" aria-hidden="true" />
          <span>
            {t('deliveryEstimatedDays', { days: estimatedDays })}
          </span>
        </div>
      )}
    </div>
  );
}

export default DeliveryFeeDisplay;
