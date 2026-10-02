'use client';

/**
 * Guest Order Lookup Page Content — app/(public)/order-lookup/OrderLookupPageContent.tsx
 *
 * Client component extracted from page.tsx to allow metadata export in the
 * server component page.
 *
 * Publicly accessible — no auth required.
 * Formik + Yup form with orderId and email fields.
 * On submit: calls GET /orders/guest/:orderId?email={email} via publicApi.get().
 * On success: displays order detail (number, status, items, total, delivery address).
 * On 404: shows "No order found with that ID and email address." — never order details.
 * On any other error: shows a user-friendly error message — never raw API error.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import { CurrencyDisplay } from '@/components/public/common/CurrencyDisplay';
import publicApi from '@/lib/api/public-api';
import { cn } from '@/lib/utils';
import type { DeliveryAddress, Order, OrderItem } from '@/types/public';
import { useFormik } from 'formik';
import {
    AlertCircle,
    CheckCircle2,
    Loader2,
    MapPin,
    Package,
    RotateCcw,
    Search,
    Truck,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useState } from 'react';
import * as Yup from 'yup';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LookupFormValues {
  orderId: string;
  email: string;
}

type LookupState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; order: Order }
  | { status: 'not_found' }
  | { status: 'error' };

// ─── Order result sub-components ─────────────────────────────────────────────

function StatusBadge({ status }: { status: Order['status'] }) {
  const colorMap: Record<Order['status'], string> = {
    pending:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    confirmed:
      'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    processing:
      'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    ready_for_pickup:
      'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    shipped:
      'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    delivered:
      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    picked_up:
      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    cancelled:
      'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    refunded:
      'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  const t = useTranslations('public.orders');
  const labelMap: Record<Order['status'], string> = {
    pending: t('statusPending'),
    confirmed: t('statusConfirmed'),
    processing: t('statusProcessing'),
    ready_for_pickup: t('statusReadyForPickup'),
    shipped: t('statusShipped'),
    delivered: t('statusDelivered'),
    picked_up: t('statusPickedUp'),
    cancelled: t('statusCancelled'),
    refunded: t('statusCancelled'),
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        colorMap[status],
      )}
    >
      {labelMap[status]}
    </span>
  );
}

function PaymentBadge({ status }: { status: Order['paymentStatus'] }) {
  const colorMap: Record<Order['paymentStatus'], string> = {
    pending:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    refunded: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    cod_pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    cop_pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  };

  const t = useTranslations('public.orders');
  const labelMap: Record<Order['paymentStatus'], string> = {
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
        colorMap[status],
      )}
    >
      {labelMap[status]}
    </span>
  );
}

function OrderItemRow({ item }: { item: OrderItem }) {
  const t = useTranslations('public.orders');
  const attrs = (item as any).variantAttributes ?? (item.variant as any)?.attributes ?? [];
  const attributeLabel = Array.isArray(attrs)
    ? attrs.map((a: { key: string; value: string }) => `${a.key}: ${a.value}`).join(', ')
    : '';

  // Safely resolve fields from the actual API response shape
  const product = typeof item.product === 'object' ? item.product : null;
  const variant = typeof item.variant === 'object' ? item.variant : null;
  const productName = product?.name ?? (item as any).name ?? 'Product';
  const productImage = (product as any)?.images?.[0]?.url ?? null;
  const sku = variant?.sku ?? (item as any).variantSku ?? '';
  const unitPrice = (item as any).price ?? item.unitPrice ?? 0;
  const lineTotal = unitPrice * item.quantity;

  return (
    <div className="flex items-start gap-4 py-4 border-b border-border last:border-0">
      {/* Product image */}
      <div className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
        {productImage ? (
          <Image
            src={productImage}
            alt={productName}
            fill
            className="object-cover"
            sizes="56px"
          />
        ) : (
          <Package
            className="absolute inset-0 m-auto size-5 text-muted-foreground"
            aria-hidden="true"
          />
        )}
      </div>

      {/* Product info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{productName}</p>
        {attributeLabel && (
          <p className="text-xs text-muted-foreground mt-0.5">{attributeLabel}</p>
        )}
        {sku && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('lookup.sku', { sku })}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-0.5">
          {t('lookup.qty', { qty: item.quantity })}
        </p>
      </div>

      {/* Line total */}
      <div className="text-right shrink-0">
        <CurrencyDisplay
          amount={lineTotal}
          className="text-sm font-semibold text-foreground tabular-nums"
        />
        <p className="text-xs text-muted-foreground mt-0.5">
          <CurrencyDisplay amount={unitPrice} className="tabular-nums" />
          {' × '}{item.quantity}
        </p>
      </div>
    </div>
  );
}

function DeliveryAddressCard({ address }: { address: DeliveryAddress }) {
  const t = useTranslations('public.orders');

  return (
    <section
      aria-label={t('lookup.deliveryAddress')}
      className="rounded-xl border border-border bg-card p-5"
    >
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="size-4 text-muted-foreground" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-foreground">
          {t('lookup.deliveryAddress')}
        </h3>
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

function PricingBreakdown({ order }: { order: Order }) {
  const t = useTranslations('public.orders');

  return (
    <section
      aria-label={t('lookup.total')}
      className="rounded-xl border border-border bg-card p-5"
    >
      <h3 className="text-sm font-semibold text-foreground mb-3">{t('lookup.total')}</h3>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t('lookup.subtotal')}</dt>
          <dd className="font-medium text-foreground tabular-nums">
            <CurrencyDisplay amount={order.subtotal} />
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t('lookup.deliveryFee')}</dt>
          <dd className="font-medium text-foreground tabular-nums">
            <CurrencyDisplay amount={order.deliveryFee} />
          </dd>
        </div>
        {order.discountAmount > 0 && (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t('lookup.discount')}</dt>
            <dd className="font-medium text-green-600 dark:text-green-400 tabular-nums">
              −<CurrencyDisplay amount={order.discountAmount} />
            </dd>
          </div>
        )}
        <div className="flex justify-between border-t border-border pt-2 mt-2">
          <dt className="font-semibold text-foreground">{t('lookup.total')}</dt>
          <dd className="font-bold text-foreground tabular-nums text-base">
            <CurrencyDisplay amount={order.total} />
          </dd>
        </div>
        <div className="flex justify-between pt-1">
          <dt className="text-muted-foreground">{t('lookup.paymentMethod')}</dt>
          <dd className="font-medium text-foreground capitalize">
            {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Card'}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function OrderResult({ order, onReset }: { order: Order; onReset: () => void }) {
  const t = useTranslations('public.orders');

  const formattedDate = new Date(order.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <article
      className="flex flex-col gap-6"
      aria-label={t('lookup.orderNumber', { number: (order as any).orderId ?? order.orderNumber ?? '' })}
    >
      {/* ── Order header ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2
                className="size-4 text-green-600 dark:text-green-400 shrink-0"
                aria-hidden="true"
              />
              <h2 className="text-base font-semibold text-foreground">
                {t('lookup.orderNumber', { number: (order as any).orderId ?? order.orderNumber ?? '' })}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('lookup.orderDate', { date: formattedDate })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={order.status} />
            <PaymentBadge status={order.paymentStatus} />
          </div>
        </div>
      </div>

      {/* ── Items ────────────────────────────────────────────────────── */}
      <section
        aria-label={t('lookup.items')}
        className="rounded-xl border border-border bg-card p-5"
      >
        <h3 className="text-sm font-semibold text-foreground mb-1">{t('lookup.items')}</h3>
        <div>
          {(order.items ?? []).map((item, idx) => (
            <OrderItemRow key={`${typeof item.variant === 'object' ? item.variant._id : idx}-${idx}`} item={item} />
          ))}
        </div>
      </section>

      {/* ── Estimated delivery — shown when available ─────────────────── */}
      {(order as any).estimatedDelivery && (() => {
        const date = new Date((order as any).estimatedDelivery);
        if (isNaN(date.getTime())) return null;
        const formatted = new Intl.DateTimeFormat(undefined, {
          year: 'numeric', month: 'long', day: 'numeric',
        }).format(date);
        return (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Truck className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('estimatedDeliveryLabel')}</p>
              <p className="text-sm font-semibold text-foreground">{formatted}</p>
            </div>
          </div>
        );
      })()}

      {/* ── Delivery address + pricing ────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {order.deliveryAddress && <DeliveryAddressCard address={order.deliveryAddress} />}
        <PricingBreakdown order={order} />
      </div>

      {/* ── Track another order ───────────────────────────────────────── */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={onReset}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg px-5 py-2.5',
            'text-sm font-medium border border-border bg-background text-foreground',
            'hover:bg-muted transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'min-h-[44px]',
          )}
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          {t('lookup.lookupAnother')}
        </button>
      </div>
    </article>
  );
}

// ─── Lookup form ──────────────────────────────────────────────────────────────

function LookupForm({
  onResult,
}: {
  onResult: (state: LookupState) => void;
}) {
  const t = useTranslations('public.orders');

  const validationSchema = Yup.object({
    orderId: Yup.string()
      .trim()
      .required(t('lookup.validation.orderIdRequired')),
    email: Yup.string()
      .trim()
      .email(t('lookup.validation.emailInvalid'))
      .required(t('lookup.validation.emailRequired')),
  });

  const formik = useFormik<LookupFormValues>({
    initialValues: { orderId: '', email: '' },
    validationSchema,
    onSubmit: async (values) => {
      onResult({ status: 'loading' });
      try {
        const res = await publicApi.get(
          `/orders/guest/${encodeURIComponent(values.orderId.trim())}`,
          { params: { email: values.email.trim() } },
        );
        const rawData = (res.data as any)?.data ?? res.data;
        const order: Order = rawData?.order ?? rawData;
        onResult({ status: 'success', order });
      } catch (err: unknown) {
        const status = (err as any)?.response?.status;
        if (status === 404) {
          onResult({ status: 'not_found' });
        } else {
          onResult({ status: 'error' });
        }
      }
    },
  });

  const isSubmitting = formik.isSubmitting;

  return (
    <form
      onSubmit={formik.handleSubmit}
      noValidate
      aria-label={t('lookup.title')}
      className="flex flex-col gap-5"
    >
      {/* Order ID field */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="orderId"
          className="text-sm font-medium text-foreground"
        >
          {t('lookup.orderIdLabel')}
          <span className="text-destructive ml-0.5" aria-hidden="true">*</span>
        </label>
        <input
          id="orderId"
          name="orderId"
          type="text"
          autoComplete="off"
          placeholder={t('lookup.orderIdPlaceholder')}
          value={formik.values.orderId}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          aria-invalid={
            formik.touched.orderId && Boolean(formik.errors.orderId)
          }
          aria-describedby={
            formik.touched.orderId && formik.errors.orderId
              ? 'orderId-error'
              : undefined
          }
          className={cn(
            'w-full rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground',
            'placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
            'transition-colors min-h-[44px]',
            formik.touched.orderId && formik.errors.orderId
              ? 'border-destructive'
              : 'border-border',
          )}
        />
        {formik.touched.orderId && formik.errors.orderId && (
          <p
            id="orderId-error"
            role="alert"
            className="text-xs text-destructive"
          >
            {formik.errors.orderId}
          </p>
        )}
      </div>

      {/* Email field */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="email"
          className="text-sm font-medium text-foreground"
        >
          {t('lookup.emailLabel')}
          <span className="text-destructive ml-0.5" aria-hidden="true">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder={t('lookup.emailPlaceholder')}
          value={formik.values.email}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          aria-invalid={
            formik.touched.email && Boolean(formik.errors.email)
          }
          aria-describedby={
            formik.touched.email && formik.errors.email
              ? 'email-error'
              : undefined
          }
          className={cn(
            'w-full rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground',
            'placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
            'transition-colors min-h-[44px]',
            formik.touched.email && formik.errors.email
              ? 'border-destructive'
              : 'border-border',
          )}
        />
        {formik.touched.email && formik.errors.email && (
          <p
            id="email-error"
            role="alert"
            className="text-xs text-destructive"
          >
            {formik.errors.email}
          </p>
        )}
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5',
          'text-sm font-semibold bg-primary text-primary-foreground',
          'hover:bg-primary/90 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          'min-h-[44px] w-full sm:w-auto',
        )}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            {t('lookup.submitting')}
          </>
        ) : (
          <>
            <Search className="size-4" aria-hidden="true" />
            {t('lookup.submitButton')}
          </>
        )}
      </button>
    </form>
  );
}

// ─── Exported content component ───────────────────────────────────────────────

export function OrderLookupPageContent() {
  const t = useTranslations('public.orders');
  const [state, setState] = useState<LookupState>({ status: 'idle' });

  const handleReset = () => setState({ status: 'idle' });

  return (
    <div className="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* ── Page header ─────────────────────────────────────────────── */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {t('lookup.title')}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('lookup.subtitle')}
          </p>
        </div>

        {/* ── Form card (shown when not displaying a result) ─────────── */}
        {state.status !== 'success' && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <LookupForm onResult={setState} />

            {/* Not found message */}
            {state.status === 'not_found' && (
              <div
                role="alert"
                className={cn(
                  'mt-5 flex items-start gap-3 rounded-lg border border-destructive/30',
                  'bg-destructive/5 px-4 py-3',
                )}
              >
                <AlertCircle
                  className="size-4 text-destructive shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <p className="text-sm text-destructive">
                  {t('lookup.notFound')}
                </p>
              </div>
            )}

            {/* Generic error message */}
            {state.status === 'error' && (
              <div
                role="alert"
                className={cn(
                  'mt-5 flex items-start gap-3 rounded-lg border border-destructive/30',
                  'bg-destructive/5 px-4 py-3',
                )}
              >
                <AlertCircle
                  className="size-4 text-destructive shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <p className="text-sm text-destructive">
                  {t('lookup.errorGeneric')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Order result ─────────────────────────────────────────────── */}
        {state.status === 'success' && (
          <OrderResult order={state.order} onReset={handleReset} />
        )}
      </div>
    </div>
  );
}
