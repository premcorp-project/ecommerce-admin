'use client';

import {
    CheckCircle2,
    Clock,
    CreditCard,
    ExternalLink,
    MapPin,
    Package,
    RefreshCw,
    ShoppingBag,
    Truck,
    User,
    XCircle,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';

import { AppButton } from '@/components/shared/AppButton';
import { Separator } from '@/components/ui/separator';
import { useCurrency } from '@/hooks/use-currency';

import { OrderDetailData, StatusHistoryEntry } from './OrderList';
import OrderStatusBadge, { OrderStatus, StatusChangePayload } from './OrderStatusBadge';
import PaymentStatusBadge, { PaymentStatus } from './PaymentStatusBadge';
import { ReceiptButtons } from './ReceiptButtons';

// Re-export legacy type alias so OrdersPage import still works
export type { OrderDetailData, StatusHistoryEntry };

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminOrderDetail {
  _id: string;
  orderId: string;
  user: { _id: string; name: string; email: string } | null;
  guestEmail: string | null;
  guestName: string | null;
  guestPhone: string | null;
  deliveryMethod: 'delivery' | 'pickup';
  items: Array<{
    product: {
      _id: string;
      name: string;
      slug: string;
      images: Array<{ url: string; publicId: string }>;
    } | null;
    variant: {
      _id: string;
      sku: string;
      attributes: Array<{ key: string; value: string }>;
      price: number | null;
      discountedPrice: number | null;
    } | null;
    variantAttributes: Array<{ key: string; value: string }>;
    variantSku: string | null;
    name: string;
    price: number;
    quantity: number;
    isBulkPriceApplied: boolean;
  }>;
  subtotal: number;
  discount: number;
  couponCode: string | null;
  taxRate: number;
  taxAmount: number;
  deliveryFee: number;
  total: number;
  currency: string;
  deliveryAddress: {
    fullName: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    county?: string;
    postcode: string;
    country: string;
  } | null;
  billingAddress: {
    fullName?: string;
    line1: string;
    line2?: string;
    city: string;
    county?: string;
    postcode: string;
    country: string;
  } | null;
  deliveryNotes: string | null;
  estimatedDelivery: string | null;
  paymentMethod: 'stripe' | 'cod' | 'cop';
  stripePaymentIntentId: string | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  statusHistory: Array<{
    status: string;
    paymentStatus: string | null;
    changedAt: string;
    changedBy: { _id: string; name: string } | null;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface OrderDetailProps {
  order: AdminOrderDetail | null;
  isLoading: boolean;
  isError: boolean;
  canWrite: boolean;
  isUpdating: boolean;
  isRefunding: boolean;
  isRefundsEnabled: boolean;
  onBack: () => void;
  onStatusChange: (orderId: string, payload: StatusChangePayload) => void;
  onPaymentStatusChange: (orderId: string, newStatus: PaymentStatus) => void;
  onRefund: (orderId: string) => void;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border bg-card shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ icon: Icon, title, action }: {
  icon: React.ElementType;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b">
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
          <Icon className="h-3.5 w-3.5 text-primary" />
        </div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-xl border bg-card px-5 py-4 shadow-sm">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="text-lg font-bold text-foreground">{value}</div>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b last:border-0">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value}</span>
    </div>
  );
}

function AddressBlock({ address, title }: {
  address: { fullName?: string; line1?: string; line2?: string; city?: string; county?: string; postcode?: string; country?: string; phone?: string } | null | undefined;
  title: string;
}) {
  if (!address) return null;
  // Format as a proper postal address — each meaningful field on its own line
  const lines = [
    address.fullName,
    address.line1,
    address.line2 && address.line2 !== 'string' ? address.line2 : null,
    [address.city, address.county && address.county !== 'string' ? address.county : null].filter(Boolean).join(', '),
    address.postcode,
    address.country,
  ].filter(Boolean) as string[];
  if (lines.length === 0) return null;
  return (
    <div className="space-y-1">
      {title && <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{title}</p>}
      <address className="not-italic space-y-0.5">
        {lines.map((line, i) => (
          <p key={i} className={`text-sm leading-snug ${i === 0 ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
            {line}
          </p>
        ))}
        {address.phone && (
          <p className="text-sm text-muted-foreground pt-1">📞 {address.phone}</p>
        )}
      </address>
    </div>
  );
}

// Status history dot colour
const STATUS_DOT: Record<string, string> = {
  delivered: 'bg-green-500',
  shipped: 'bg-blue-500',
  processing: 'bg-indigo-500',
  confirmed: 'bg-blue-400',
  cancelled: 'bg-red-500',
  pending: 'bg-yellow-500',
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function OrderDetailSkeleton() {
  return (
    <div className="space-y-5 p-4 animate-pulse">
      {/* stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-xl bg-muted" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-72 rounded-xl bg-muted" />
          <div className="h-56 rounded-xl bg-muted" />
        </div>
        <div className="space-y-4">
          <div className="h-28 rounded-xl bg-muted" />
          <div className="h-44 rounded-xl bg-muted" />
          <div className="h-36 rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function OrderDetail({
  order,
  isLoading,
  isError,
  canWrite,
  isUpdating,
  isRefunding,
  isRefundsEnabled,
  onBack,
  onStatusChange,
  onPaymentStatusChange,
  onRefund,
}: OrderDetailProps) {
  const t = useTranslations('admin.orders');
  const { formatCurrency } = useCurrency();

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const formatDateShort = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });

  if (isLoading) return <OrderDetailSkeleton />;

  if (isError || !order) {
    return (
      <div className="p-4">
        <Card className="p-16 text-center">
          <XCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">{t('detail.notFound')}</p>
          <p className="text-xs text-muted-foreground mt-1">{t('detail.notFoundDescription')}</p>
        </Card>
      </div>
    );
  }

  const customerName = order.user?.name ?? order.guestName ?? order.guestEmail ?? t('detail.guest');
  const customerEmail = order.user?.email ?? order.guestEmail ?? '—';
  const isGuest = !order.user;
  const totalItems = order.items?.length ?? 0;

  const showRefund =
    canWrite &&
    isRefundsEnabled &&
    order.paymentMethod === 'stripe' &&
    order.paymentStatus !== 'refunded';

  const showBillingAddress =
    order.paymentMethod === 'stripe' && order.billingAddress !== null;

  return (
    <div className="space-y-5 p-4">

      {/* ── Page header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{order.orderId}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t('detail.ordered')} {formatDate(order.createdAt)}
            {order.updatedAt !== order.createdAt && (
              <span className="ml-2">· {t('detail.updated')} {formatDate(order.updatedAt)}</span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <OrderStatusBadge
            status={order.status}
            canWrite={canWrite}
            disabled={isUpdating}
            onStatusChange={(payload) => onStatusChange(order.orderId, payload)}
          />
          <PaymentStatusBadge
            status={order.paymentStatus}
            canWrite={canWrite}
            disabled={isUpdating}
            onStatusChange={(s) => onPaymentStatusChange(order.orderId, s)}
          />
          {showRefund && (
            <AppButton
              variant="secondary"
              size="sm"
              isLoading={isRefunding}
              disabled={isRefunding}
              onClick={() => onRefund(order.orderId)}
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              {t('detail.refund')}
            </AppButton>
          )}
          <ReceiptButtons order={order} />
        </div>
      </div>

      {/* ── Summary stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label={t('detail.orderTotal')}
          value={formatCurrency(order.total)}
          sub={`${order.currency} · ${t('detail.itemCount', { count: totalItems })}`}
        />
        <StatCard
          label={t('detail.customer')}
          value={<span className="text-base">{customerName}</span>}
          sub={isGuest ? t('detail.guest') : customerEmail}
        />
        <StatCard
          label={t('columns.paymentMethod')}
          value={order.paymentMethod === 'cod' ? t('paymentMethods.cod') : order.paymentMethod === 'cop' ? t('paymentMethods.cop') : t('paymentMethods.stripe')}
          sub={order.currency}
        />
        <StatCard
          label={t('detail.ordered')}
          value={<span className="text-base">{formatDateShort(order.createdAt)}</span>}
          sub={order.estimatedDelivery ? `${t('detail.estimatedDelivery')}: ${formatDateShort(order.estimatedDelivery)}` : undefined}
        />
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Left (2/3) ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Items table */}
          <Card>
            <CardHeader icon={ShoppingBag} title={`${t('detail.items')} (${order.items?.length ?? 0})`} />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">{t('detail.product')}</th>
                    <th className="text-center px-3 py-2.5 text-xs font-medium text-muted-foreground">{t('detail.qty')}</th>
                    <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground">{t('detail.unitPrice')}</th>
                    <th className="text-right px-5 py-2.5 text-xs font-medium text-muted-foreground">{t('detail.lineTotal')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {order.items?.map((item, i) => {
                    const variantLabel = item.variantAttributes?.length
                      ? item.variantAttributes.map((a) => `${a.key}: ${a.value}`).join(' · ')
                      : null;
                    return (
                      <tr key={i} className="hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            {item.product?.images?.[0]?.url ? (
                              <div className="relative h-12 w-12 shrink-0 rounded-lg overflow-hidden border bg-muted">
                                <Image
                                  src={item.product.images[0].url}
                                  alt={item.name}
                                  fill
                                  unoptimized
                                  className="object-cover"
                                />
                              </div>
                            ) : (
                              <div className="h-12 w-12 shrink-0 rounded-lg border bg-muted flex items-center justify-center">
                                <Package className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-foreground leading-snug">{item.name}</p>
                              {variantLabel && (
                                <p className="text-xs text-muted-foreground mt-0.5">{variantLabel}</p>
                              )}
                              {item.variantSku && (
                                <p className="text-xs text-muted-foreground font-mono">SKU: {item.variantSku}</p>
                              )}
                              {item.isBulkPriceApplied && (
                                <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 text-xs font-medium mt-1">
                                  {t('detail.bulkPrice')}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex items-center justify-center h-6 w-8 rounded-md bg-muted text-xs font-semibold">
                            {item.quantity}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right text-muted-foreground">
                          {formatCurrency(item.price)}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-foreground">
                          {formatCurrency(item.price * item.quantity)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Order totals */}
            <div className="border-t bg-muted/20 px-5 py-4">
              <div className="ml-auto max-w-xs space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('detail.subtotal')}</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      {t('detail.discount')}
                      {order.couponCode && (
                        <span className="font-mono text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded">
                          {order.couponCode}
                        </span>
                      )}
                    </span>
                    <span className="text-green-600 dark:text-green-400 font-medium">−{formatCurrency(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('detail.tax')} ({order.taxRate}%)</span>
                  <span>{formatCurrency(order.taxAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('detail.deliveryFee')}</span>
                  <span>{formatCurrency(order.deliveryFee)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-base font-bold">
                  <span>{t('detail.total')}</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Status history */}
          {order.statusHistory?.length > 0 && (
            <Card>
              <CardHeader icon={Clock} title={t('detail.statusHistory')} />
              <div className="px-5 py-4 max-h-80 overflow-y-auto">
                <ol className="relative border-l border-border ml-2 space-y-0">
                  {[...order.statusHistory].reverse().map((entry, i) => {
                    const dotColor = STATUS_DOT[entry.status] ?? 'bg-muted-foreground';
                    return (
                      <li key={i} className="ml-5 pb-5 last:pb-0">
                        <span className={`absolute -left-[5px] flex h-2.5 w-2.5 items-center justify-center rounded-full ring-2 ring-background ${dotColor}`} />
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-foreground capitalize">{entry.status}</span>
                          {entry.paymentStatus && (
                            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full capitalize">
                              {entry.paymentStatus.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>{formatDate(entry.changedAt)}</span>
                          <span>·</span>
                          <span className="font-medium">{entry.changedBy?.name ?? t('detail.system')}</span>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </Card>
          )}
        </div>

        {/* ── Right (1/3) ── */}
        <div className="space-y-4">

          {/* Customer */}
          <Card>
            <CardHeader icon={User} title={t('detail.customer')} />
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">
                    {customerName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-foreground truncate">{customerName}</p>
                    {isGuest && (
                      <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full shrink-0">
                        {t('detail.guest')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{customerEmail}</p>
                </div>
              </div>
              {order.deliveryAddress?.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-xs">📞</span>
                  <span>{order.deliveryAddress.phone}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Delivery */}
          <Card>
            <CardHeader icon={Truck} title={order.deliveryMethod === 'pickup' ? t('detail.pickup') : t('detail.delivery')} />
            <div className="px-5 py-4 space-y-4">
              {order.deliveryMethod === 'pickup' ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">{t('detail.pickupNote')}</p>
                  {order.guestPhone && (
                    <p className="text-sm text-muted-foreground">📞 {order.guestPhone}</p>
                  )}
                </div>
              ) : (
                <AddressBlock address={order.deliveryAddress} title={t('detail.deliveryAddress')} />
              )}
              {order.deliveryNotes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t('detail.deliveryNotes')}</p>
                    <p className="text-sm text-foreground italic">"{order.deliveryNotes}"</p>
                  </div>
                </>
              )}
              {order.estimatedDelivery && (
                <>
                  <Separator />
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t('detail.estimatedDelivery')}</p>
                      <p className="text-sm font-medium text-foreground">{formatDateShort(order.estimatedDelivery)}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Billing address — Stripe only */}
          {showBillingAddress && (
            <Card>
              <CardHeader icon={MapPin} title={t('detail.billingAddress')} />
              <div className="px-5 py-4">
                <AddressBlock address={order.billingAddress} title="" />
              </div>
            </Card>
          )}

          {/* Payment */}
          <Card>
            <CardHeader icon={CreditCard} title={t('detail.payment')} />
            <div className="px-5 py-1">
              <InfoRow label={t('columns.paymentMethod')} value={
                <span className="font-semibold">
                  {order.paymentMethod === 'cod' ? t('paymentMethods.cod') : order.paymentMethod === 'cop' ? t('paymentMethods.cop') : t('paymentMethods.stripe')}
                </span>
              } />
              <InfoRow label={t('detail.currency')} value={order.currency} />
              {order.stripePaymentIntentId && (
                <InfoRow
                  label={t('detail.stripeIntent')}
                  value={
                    <Link
                      href={`https://dashboard.stripe.com/payments/${order.stripePaymentIntentId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline text-xs font-mono"
                    >
                      {order.stripePaymentIntentId.slice(0, 14)}…
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </Link>
                  }
                />
              )}
            </div>
          </Card>

        </div>
      </div>
    </div>
  );
}
