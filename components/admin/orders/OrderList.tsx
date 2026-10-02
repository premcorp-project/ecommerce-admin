'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useCurrency } from '@/hooks/use-currency';
import { useSortableData } from '@/hooks/use-sortable-data';

import { AppButton } from '@/components/shared/AppButton';
import AppPagination from '@/components/shared/AppPagination';
import { DownloadButtons } from '@/components/shared/DownloadButtons';
import { Filter, GlobalFilters } from '@/components/shared/GlobalFilters';
import NoDataFound from '@/components/shared/NoDataFound';
import TableHeaderCell from '@/components/shared/TableHeaderCell';
import { TableShimmer, TLimitType } from '@/components/shared/TableShimmer';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

import OrderStatusBadge, { OrderStatus, StatusChangePayload } from './OrderStatusBadge';
import PaymentStatusBadge, { PaymentStatus } from './PaymentStatusBadge';

// --- Types ---

export interface Order {
  _id: string;
  orderId: string;
  user: string | { _id: string; name: string; email: string };
  customer?: { _id: string; name: string; email: string };
  guestEmail?: string | null;
  guestName?: string | null;
  guestPhone?: string | null;
  deliveryMethod?: 'delivery' | 'pickup';
  items: {
    product: { _id: string; name: string; images?: { url: string }[] };
    name: string;
    price: number;
    quantity: number;
    variant?: unknown;
  }[];
  total: number;
  subtotal?: number;
  taxAmount?: number;
  deliveryFee?: number;
  discount?: number;
  status: OrderStatus;
  paymentStatus?: PaymentStatus;
  paymentMethod: 'stripe' | 'cod' | 'cop';
  deliveryAddress?: {
    fullName?: string;
    phone?: string;
    line1?: string;
    line2?: string;
    city?: string;
    county?: string;
    postcode?: string;
    country?: string;
    [key: string]: unknown;
  } | null;
  createdAt: string;
  updatedAt?: string;
}

export interface OrdersPagination {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  perPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface StatusHistoryEntry {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus | null;
  changedAt: string;
  changedBy?: string | null;
}

export interface OrderDetailData extends Order {
  guestEmail?: string | null;
  deliveryNotes?: string | null;
  taxRate?: number;
  currency?: string;
  couponCode?: string | null;
  estimatedDelivery?: string | null;
  stripePaymentIntentId?: string | null;
  billingAddress?: {
    fullName?: string;
    line1?: string;
    line2?: string;
    city?: string;
    county?: string;
    postcode?: string;
    country?: string;
  };
  statusHistory?: StatusHistoryEntry[];
}

interface OrderListProps {
  orders: Order[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  pagination: OrdersPagination | undefined;
  canWrite: boolean;
  limit: TLimitType;
  updatingOrderId: string | null;
  onStatusChange: (orderId: string, payload: StatusChangePayload) => void;
  onPaymentStatusChange: (orderId: string, newStatus: PaymentStatus) => void;
  onBulkStatusUpdate: (orderIds: string[], newStatus: OrderStatus, estimatedDelivery?: string) => Promise<void>;
  onBulkPaymentStatusUpdate: (orderIds: string[], newStatus: PaymentStatus) => Promise<void>;
}

// --- Constants ---

const DEFAULT_LIMIT: TLimitType = 25;

const ORDER_STATUSES: OrderStatus[] = [
  'pending', 'confirmed', 'processing', 'ready_for_pickup', 'shipped', 'delivered', 'picked_up', 'cancelled',
];

const PAYMENT_STATUSES: PaymentStatus[] = [
  'unpaid', 'paid', 'failed', 'refunded', 'cod_pending', 'cop_pending',
];

// --- Component ---

export default function OrderList({
  orders,
  isLoading,
  isError,
  refetch,
  pagination,
  canWrite,
  limit,
  updatingOrderId,
  onStatusChange,
  onPaymentStatusChange,
  onBulkStatusUpdate,
  onBulkPaymentStatusUpdate,
}: OrderListProps) {
  const t = useTranslations('admin.orders');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<OrderStatus | ''>('');
  const [bulkEstimatedDelivery, setBulkEstimatedDelivery] = useState<string>('');
  const [bulkPaymentStatus, setBulkPaymentStatus] = useState<PaymentStatus | ''>('');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const { items, requestSort, sortConfig } = useSortableData<Order>(orders);
  const { formatCurrency } = useCurrency();

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  // --- Selection helpers ---
  const allVisibleIds = items.map((o) => o.orderId);
  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.has(id));
  const someSelected = allVisibleIds.some((id) => selectedIds.has(id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allVisibleIds));
    }
  };

  const toggleOne = (orderId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(orderId) ? next.delete(orderId) : next.add(orderId);
      return next;
    });
  };

  const handleBulkStatusApply = async () => {
    if (!bulkStatus || selectedIds.size === 0) return;
    setIsBulkUpdating(true);
    try {
      const delivery = bulkStatus === 'shipped' && bulkEstimatedDelivery
        ? new Date(bulkEstimatedDelivery).toISOString()
        : undefined;
      await onBulkStatusUpdate(Array.from(selectedIds), bulkStatus as OrderStatus, delivery);
      setBulkStatus('');
      setBulkEstimatedDelivery('');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkPaymentApply = async () => {
    if (!bulkPaymentStatus || selectedIds.size === 0) return;
    setIsBulkUpdating(true);
    try {
      await onBulkPaymentStatusUpdate(Array.from(selectedIds), bulkPaymentStatus as PaymentStatus);
      setBulkPaymentStatus(''); // clear only this dropdown, keep selection
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
    setBulkStatus('');
    setBulkEstimatedDelivery('');
    setBulkPaymentStatus('');
  };

  // --- Filters ---
  const filters: Filter[] = [
    { type: 'search', paramName: 'search', placeholder: t('searchPlaceholder') },
    {
      type: 'select', paramName: 'status', placeholder: t('columns.status'),
      options: [
        { key: t('filters.allStatuses'), value: '' },
        { key: t('statuses.pending'), value: 'pending' },
        { key: t('statuses.confirmed'), value: 'confirmed' },
        { key: t('statuses.processing'), value: 'processing' },
        { key: t('statuses.shipped'), value: 'shipped' },
        { key: t('statuses.delivered'), value: 'delivered' },
        { key: t('statuses.ready_for_pickup'), value: 'ready_for_pickup' },
        { key: t('statuses.picked_up'), value: 'picked_up' },
        { key: t('statuses.cancelled'), value: 'cancelled' },
      ],
    },
    {
      type: 'select', paramName: 'paymentMethod', placeholder: t('columns.paymentMethod'),
      options: [
        { key: t('filters.allMethods'), value: '' },
        { key: t('paymentMethods.stripe'), value: 'stripe' },
        { key: t('paymentMethods.cod'), value: 'cod' },
        { key: t('paymentMethods.cop'), value: 'cop' },
      ],
    },
    {
      type: 'select', paramName: 'paymentStatus', placeholder: t('columns.payment'),
      options: [
        { key: t('filters.allPaymentStatuses'), value: '' },
        { key: t('paymentStatuses.unpaid'), value: 'unpaid' },
        { key: t('paymentStatuses.paid'), value: 'paid' },
        { key: t('paymentStatuses.failed'), value: 'failed' },
        { key: t('paymentStatuses.refunded'), value: 'refunded' },
        { key: t('paymentStatuses.cod_pending'), value: 'cod_pending' },
        { key: t('paymentStatuses.cop_pending'), value: 'cop_pending' },
      ],
    },
    {
      type: 'select', paramName: 'deliveryMethod', placeholder: t('columns.deliveryMethod'),
      options: [
        { key: t('filters.allDeliveryMethods'), value: '' },
        { key: t('deliveryMethods.delivery'), value: 'delivery' },
        { key: t('deliveryMethods.pickup'), value: 'pickup' },
      ],
    },
    { type: 'date', paramName: 'startDate', placeholder: t('filters.dateRange') },
  ];

  const downloadColumns = [
    // ── Core order info ──────────────────────────────────────
    { header: t('columns.orderId'), dataKey: 'orderId' },
    {
      header: t('columns.date'), dataKey: 'createdAt',
      formatter: (item: Order) =>
        new Date(item.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    },
    { header: t('columns.status'), dataKey: 'status' },
    { header: t('columns.payment'), dataKey: 'paymentStatus' },
    { header: t('columns.paymentMethod'), dataKey: 'paymentMethod' },
    { header: t('columns.total'), dataKey: 'total', formatter: (item: Order) => String(item.total ?? '') },

    // ── Customer ─────────────────────────────────────────────
    {
      header: t('columns.customer'), dataKey: 'user',
      formatter: (item: Order) =>
        (typeof item.user === 'object' && item.user?.name)
          ? item.user.name
          : item.customer?.name || item.deliveryAddress?.fullName || '',
    },
    {
      header: t('download.customerEmail'), dataKey: 'user',
      formatter: (item: Order) =>
        (typeof item.user === 'object' && item.user?.email)
          ? item.user.email
          : item.customer?.email || '',
    },
    { header: t('download.phone'), dataKey: 'deliveryAddress', formatter: (item: Order) => { const v = item.deliveryAddress?.phone || ''; return v === 'string' ? '' : v; } },

    // ── Delivery address ──────────────────────────────────────
    { header: t('download.addressLine1'), dataKey: 'deliveryAddress', formatter: (item: Order) => item.deliveryAddress?.line1 || '' },
    { header: t('download.addressLine2'), dataKey: 'deliveryAddress', formatter: (item: Order) => { const v = item.deliveryAddress?.line2 || ''; return v === 'string' ? '' : v; } },
    { header: t('download.city'), dataKey: 'deliveryAddress', formatter: (item: Order) => item.deliveryAddress?.city || '' },
    { header: t('download.postcode'), dataKey: 'deliveryAddress', formatter: (item: Order) => item.deliveryAddress?.postcode || '' },
    { header: t('download.country'), dataKey: 'deliveryAddress', formatter: (item: Order) => item.deliveryAddress?.country || '' },

    // ── Items & financials ────────────────────────────────────
    {
      header: t('download.items'), dataKey: 'items',
      formatter: (item: Order) =>
        item.items?.map((i) => `${i.name} x${i.quantity}`).join('; ') || '',
    },
    { header: t('download.itemCount'), dataKey: 'items', formatter: (item: Order) => String(item.items?.reduce((s, i) => s + i.quantity, 0) ?? 0) },
    { header: t('download.subtotal'), dataKey: 'subtotal', formatter: (item: Order) => String(item.subtotal ?? '') },
    { header: t('download.discount'), dataKey: 'discount', formatter: (item: Order) => String(item.discount ?? 0) },
    { header: t('download.tax'), dataKey: 'taxAmount', formatter: (item: Order) => String(item.taxAmount ?? '') },
    { header: t('download.deliveryFee'), dataKey: 'deliveryFee', formatter: (item: Order) => String(item.deliveryFee ?? '') },
  ];

  const colSpan = canWrite ? 10 : 9;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
      </div>

      <GlobalFilters filters={filters} />

      {items.length > 0 && (
        <DownloadButtons
          fileName="orders_report"
          data={selectedIds.size > 0 ? items.filter((o) => selectedIds.has(o.orderId)) : items}
          columns={downloadColumns}
        />
      )}

      {/* Bulk action toolbar — Order Status */}
      {canWrite && selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5">
          <span className="text-sm font-medium text-foreground shrink-0">
            {t('bulk.selected', { count: selectedIds.size })}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">{t('columns.status')}:</span>
          <div className="flex flex-wrap items-center gap-2 ml-auto">
            <Select
              value={bulkStatus}
              onValueChange={(v) => {
                setBulkStatus(v as OrderStatus);
                setBulkEstimatedDelivery('');
              }}
            >
              <SelectTrigger className="h-8 w-[150px] text-xs">
                <SelectValue placeholder={t('bulk.selectStatus')} />
              </SelectTrigger>
              <SelectContent>
                {ORDER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {t(`statuses.${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date picker — only when shipped is selected */}
            {bulkStatus === 'shipped' && (
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-muted-foreground shrink-0">
                  {t('statusUpdate.shippedDateLabel')}
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={bulkEstimatedDelivery}
                  onChange={(e) => setBulkEstimatedDelivery(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  aria-label={t('statusUpdate.estimatedDeliveryAriaLabel')}
                />
              </div>
            )}

            <AppButton
              variant="primary"
              className="h-8 text-xs px-3"
              disabled={!bulkStatus || isBulkUpdating}
              isLoading={isBulkUpdating}
              onClick={handleBulkStatusApply}
            >
              {t('bulk.apply')}
            </AppButton>
            <AppButton
              variant="mute"
              className="h-8 text-xs px-3"
              disabled={isBulkUpdating}
              onClick={handleClearSelection}
            >
              {tCommon('cancel')}
            </AppButton>
          </div>
        </div>
      )}

      {/* Bulk action toolbar — Payment Status */}
      {canWrite && selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-2.5">
          <span className="text-sm font-medium text-foreground shrink-0">
            {t('bulk.selected', { count: selectedIds.size })}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">{t('columns.payment')}:</span>
          <div className="flex items-center gap-2 ml-auto">
            <Select value={bulkPaymentStatus} onValueChange={(v) => setBulkPaymentStatus(v as PaymentStatus)}>
              <SelectTrigger className="h-8 w-[160px] text-xs">
                <SelectValue placeholder={t('bulk.selectPaymentStatus')} />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {t(`paymentStatuses.${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <AppButton
              variant="primary"
              className="h-8 text-xs px-3"
              disabled={!bulkPaymentStatus || isBulkUpdating}
              isLoading={isBulkUpdating}
              onClick={handleBulkPaymentApply}
            >
              {t('bulk.apply')}
            </AppButton>
            <AppButton
              variant="mute"
              className="h-8 text-xs px-3"
              disabled={isBulkUpdating}
              onClick={handleClearSelection}
            >
              {tCommon('cancel')}
            </AppButton>
          </div>
        </div>
      )}

      <div className="rounded-md border overflow-auto">
        <Table className="min-w-[1050px]">
          <TableHeader className="bg-accent rounded-t-md">
            <TableRow>
              {canWrite && (
                <TableCell className="w-10 pl-4">
                  <Checkbox
                    checked={allSelected}
                    data-state={someSelected && !allSelected ? 'indeterminate' : undefined}
                    onCheckedChange={toggleAll}
                    aria-label={t('bulk.selectAll')}
                  />
                </TableCell>
              )}
              <TableHeaderCell label={t('columns.orderId')} sortKey="orderNumber" requestSort={requestSort} sortConfig={sortConfig} containerClass="pl-4" />
              <TableHeaderCell label={t('columns.customer')} sortKey="customer.name" requestSort={requestSort} sortConfig={sortConfig} />
              <TableHeaderCell label={t('columns.total')} sortKey="totalAmount" requestSort={requestSort} sortConfig={sortConfig} />
              <TableHeaderCell label={t('columns.status')} sortKey="status" requestSort={requestSort} sortConfig={sortConfig} />
              <TableHeaderCell label={t('columns.payment')} sortKey="paymentStatus" requestSort={requestSort} sortConfig={sortConfig} />
              <TableHeaderCell label={t('columns.paymentMethod')} sortKey="paymentMethod" requestSort={requestSort} sortConfig={sortConfig} />
              <TableHeaderCell label={t('columns.deliveryMethod')} sortKey="deliveryMethod" requestSort={requestSort} sortConfig={sortConfig} />
              <TableHeaderCell label={t('columns.orderType')} sortKey="" requestSort={requestSort} sortConfig={sortConfig} />
              <TableHeaderCell label={t('columns.date')} sortKey="createdAt" requestSort={requestSort} sortConfig={sortConfig} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableShimmer limit={limit} columns={colSpan} />
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={colSpan} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-sm text-muted-foreground">{t('failedToLoad')}</p>
                    <button onClick={() => refetch()} className="text-sm text-primary underline">
                      {tCommon('retry')}
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colSpan} className="text-center">
                  <NoDataFound title={t('noOrders')} />
                </TableCell>
              </TableRow>
            ) : (
              items.map((order) => (
                <TableRow
                  key={order._id}
                  className={`!h-[55px] ${selectedIds.has(order.orderId) ? 'bg-primary/5' : ''}`}
                >
                  {canWrite && (
                    <TableCell className="w-10 pl-4">
                      <Checkbox
                        checked={selectedIds.has(order.orderId)}
                        onCheckedChange={() => toggleOne(order.orderId)}
                        aria-label={`${t('bulk.selectOrder')} ${order.orderId}`}
                      />
                    </TableCell>
                  )}
                  <TableCell className="pl-4 font-medium">
                    <button
                      type="button"
                      onClick={() => router.push(`/admin/orders/${order.orderId}`)}
                      className="text-primary hover:underline font-medium text-sm text-left"
                    >
                      {order.orderId}
                    </button>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">
                        {(typeof order.user === 'object' && order.user?.name)
                          ? order.user.name
                          : order.customer?.name || order.guestName || order.deliveryAddress?.fullName || order.guestEmail || tCommon('notAvailable')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(typeof order.user === 'object' && order.user?.email)
                          ? order.user.email
                          : order.customer?.email || order.guestEmail || order.deliveryAddress?.phone || order.guestPhone || ''}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{formatCurrency(order.total ?? 0)}</TableCell>
                  <TableCell className="text-center">
                    <OrderStatusBadge
                      status={order.status}
                      canWrite={canWrite}
                      disabled={updatingOrderId === order.orderId || isBulkUpdating}
                      onStatusChange={(payload) => onStatusChange(order.orderId, payload)}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <PaymentStatusBadge
                      status={order.paymentStatus}
                      canWrite={canWrite}
                      disabled={updatingOrderId === order.orderId || isBulkUpdating}
                      onStatusChange={(newStatus) => onPaymentStatusChange(order.orderId, newStatus)}
                    />
                  </TableCell>
                  <TableCell className="capitalize text-sm">
                    {order.paymentMethod === 'cod'
                      ? t('paymentMethods.cod')
                      : order.paymentMethod === 'cop'
                        ? t('paymentMethods.cop')
                        : t('paymentMethods.stripe')}
                  </TableCell>
                  <TableCell className="text-center">
                    {order.deliveryMethod === 'pickup' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                        {t('deliveryMethods.pickup')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                        {t('deliveryMethods.delivery')}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {(order.items ?? []).some((item: any) => item.isBulkPriceApplied) ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        Bulk Order
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                        Normal
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="p-3 bg-accent/30 border-t rounded-b-md">
          {!isLoading && !isError && items.length > 0 && pagination && (
            <AppPagination
              page={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalData={pagination.totalCount}
              defaultLimit={DEFAULT_LIMIT}
              selectedRows={selectedIds.size || undefined}
            />
          )}
        </div>
      </div>
    </div>
  );
}
