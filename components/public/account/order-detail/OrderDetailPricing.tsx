'use client';

/**
 * OrderDetailPricing — delivery address + pricing breakdown sections.
 * Part of the OrderDetail component split.
 */

import { CurrencyDisplay } from '@/components/public/common/CurrencyDisplay';
import type { DeliveryAddress, Order } from '@/types/public';
import { MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';

// ─── Delivery address ─────────────────────────────────────────────────────────

function DeliveryAddressCard({ address }: { address: DeliveryAddress }) {
  const t = useTranslations('public.orders');

  return (
    <section
      aria-label={t('deliveryAddress')}
      className="rounded-xl border border-border bg-card p-5"
    >
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="size-4 text-muted-foreground" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-foreground">{t('deliveryAddress')}</h3>
      </div>
      <address className="not-italic text-sm text-muted-foreground space-y-0.5">
        <p className="font-medium text-foreground">{address.fullName}</p>
        <p>{address.phone}</p>
        <p>{address.line1}</p>
        {address.line2 && <p>{address.line2}</p>}
        <p>
          {address.city}{address.county ? `, ${address.county}` : ''} {address.postcode}
        </p>
        <p>{address.country}</p>
      </address>
    </section>
  );
}

// ─── Pricing breakdown ────────────────────────────────────────────────────────

function PricingBreakdown({ order }: { order: Order }) {
  const t = useTranslations('public.orders');

  return (
    <section
      aria-label={t('orderTotal')}
      className="rounded-xl border border-border bg-card p-5"
    >
      <h3 className="text-sm font-semibold text-foreground mb-3">{t('orderTotal')}</h3>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t('subtotal')}</dt>
          <dd className="font-medium text-foreground tabular-nums">
            <CurrencyDisplay amount={order.subtotal} />
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t('deliveryFee')}</dt>
          <dd className="font-medium text-foreground tabular-nums">
            <CurrencyDisplay amount={order.deliveryFee} />
          </dd>
        </div>
        {(order as any).taxAmount > 0 && (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">
              {t('tax')} {(order as any).taxRate ? `(${(order as any).taxRate}%)` : ''}
            </dt>
            <dd className="font-medium text-foreground tabular-nums">
              <CurrencyDisplay amount={(order as any).taxAmount} />
            </dd>
          </div>
        )}
        {order.discountAmount > 0 && (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t('discount')}</dt>
            <dd className="font-medium text-green-600 dark:text-green-400 tabular-nums">
              −<CurrencyDisplay amount={order.discountAmount} />
            </dd>
          </div>
        )}
        <div className="flex justify-between border-t border-border pt-2 mt-2">
          <dt className="font-semibold text-foreground">{t('total')}</dt>
          <dd className="font-bold text-foreground tabular-nums text-base">
            <CurrencyDisplay amount={order.total} />
          </dd>
        </div>
        <div className="flex justify-between pt-1">
          <dt className="text-muted-foreground">{t('paymentMethod')}</dt>
          <dd className="font-medium text-foreground capitalize">
            {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Card'}
          </dd>
        </div>
      </dl>
    </section>
  );
}

// ─── Combined export ──────────────────────────────────────────────────────────

interface OrderDetailPricingProps {
  order: Order;
}

export function OrderDetailPricing({ order }: OrderDetailPricingProps) {
  const t = useTranslations('public.orders');

  // Format estimated delivery date if available
  const estimatedDelivery = (order as any).estimatedDelivery;
  const formattedEstimatedDelivery = (() => {
    if (!estimatedDelivery) return null;
    const date = new Date(estimatedDelivery);
    if (isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  })();

  return (
    <div className="flex flex-col gap-6">
      {/* Estimated delivery — shown when available */}
      {formattedEstimatedDelivery && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <MapPin className="size-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('estimatedDeliveryLabel')}</p>
            <p className="text-sm font-semibold text-foreground">{formattedEstimatedDelivery}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {order.deliveryAddress && <DeliveryAddressCard address={order.deliveryAddress} />}
        <PricingBreakdown order={order} />
      </div>
    </div>
  );
}
