'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { useQueryParams } from '@/hooks/use-query-params';
import { useAdminMutation, useAdminQuery } from '@/lib/api/admin-hooks';
import { adminQueryKeys } from '@/lib/api/admin-query-keys';
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store';

import { BulkFailEntry, BulkFailModal } from '@/components/admin/orders/BulkFailModal';
import OrderList, { Order, OrdersPagination } from '@/components/admin/orders/OrderList';
import { OrderStatus, StatusChangePayload } from '@/components/admin/orders/OrderStatusBadge';
import { PaymentStatus } from '@/components/admin/orders/PaymentStatusBadge';
import { TLimitType } from '@/components/shared/TableShimmer';

// --- Types ---

interface OrdersResponse {
  success: boolean;
  data: {
    orders: Order[];
    pagination: OrdersPagination;
  };
}

interface StatusUpdateVariables {
  orderId: string;
  status: OrderStatus;
  estimatedDelivery?: string;
}

interface PaymentStatusUpdateVariables {
  orderId: string;
  paymentStatus: PaymentStatus;
}

interface BulkStatusVariables {
  orderIds: string[];
  status: OrderStatus;
  estimatedDelivery?: string;
}

interface BulkPaymentStatusVariables {
  orderIds: string[];
  paymentStatus: PaymentStatus;
}

interface BulkStatusResult {
  updated: number;
  failed: number;
  failedIds?: BulkFailEntry[];
}

interface BulkStatusResponse {
  success: boolean;
  data: BulkStatusResult;
}

// --- Constants ---

const DEFAULT_LIMIT: TLimitType = 25;
const BULK_CHUNK_SIZE = 100;

// --- Helpers ---

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

// --- Component ---

export default function OrdersPage() {
  const t = useTranslations('admin.orders');
  const queryClient = useQueryClient();
  const { getParam } = useQueryParams();
  const hasWriteAccess = useAdminAuthStore((state) => state.hasWriteAccess);
  const canWrite = hasWriteAccess('orders');

  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [failModal, setFailModal] = useState<{ entries: BulkFailEntry[]; status: string } | null>(null);

  const page = Number(getParam('page')) || 1;
  const limit = (Number(getParam('limit')) || DEFAULT_LIMIT) as TLimitType;
  const search = getParam('search') || '';
  const status = getParam('status') || '';
  const paymentMethod = getParam('paymentMethod') || '';
  const paymentStatus = getParam('paymentStatus') || '';
  const deliveryMethod = getParam('deliveryMethod') || '';
  const startDate = getParam('startDate') || '';
  const endDate = getParam('endDate') || '';

  const queryParams = {
    page, limit,
    ...(search && { search }),
    ...(status && { status }),
    ...(paymentMethod && { paymentMethod }),
    ...(paymentStatus && { paymentStatus }),
    ...(deliveryMethod && { deliveryMethod }),
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
  };

  const { data, isLoading, isError, refetch } = useAdminQuery<OrdersResponse>(
    adminQueryKeys.orders(queryParams),
    '/orders/admin',
    { placeholderData: (previousData) => previousData },
    { params: queryParams },
  );

  const orders = data?.data?.orders ?? (data as any)?.orders ?? [];
  const pagination = data?.data?.pagination ?? (data as any)?.pagination;

  // Single order status
  const { mutateAsync: updateStatus } =
    useAdminMutation<{ success: boolean }, StatusUpdateVariables>(
      'put',
      (v) => `/orders/${v.orderId}/status`,
      {
        onSuccess: () => {
          toast.success(t('toast.statusUpdated'));
          queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
        },
        onError: () => toast.error(t('toast.statusUpdateFailed')),
      },
    );

  // Single order payment status
  const { mutateAsync: updatePaymentStatus } =
    useAdminMutation<{ success: boolean }, PaymentStatusUpdateVariables>(
      'put',
      (v) => `/orders/${v.orderId}/payment-status`,
      {
        onSuccess: () => {
          toast.success(t('toast.paymentStatusUpdated'));
          queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
        },
        onError: () => toast.error(t('toast.paymentStatusUpdateFailed')),
      },
    );

  // Bulk order status — PUT /orders/bulk-status
  const { mutateAsync: bulkUpdateStatus } =
    useAdminMutation<BulkStatusResponse, BulkStatusVariables>('put', '/orders/bulk-status');

  // Bulk payment status — PUT /orders/bulk-payment-status
  const { mutateAsync: bulkUpdatePaymentStatus } =
    useAdminMutation<BulkStatusResponse, BulkPaymentStatusVariables>('put', '/orders/bulk-payment-status');

  const handleStatusChange = async (orderId: string, payload: StatusChangePayload) => {
    setUpdatingOrderId(orderId);
    try {
      await updateStatus({ orderId, status: payload.status, estimatedDelivery: payload.estimatedDelivery });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handlePaymentStatusChange = async (orderId: string, newPaymentStatus: PaymentStatus) => {
    setUpdatingOrderId(orderId);
    try {
      await updatePaymentStatus({ orderId, paymentStatus: newPaymentStatus });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Shared result handler for both bulk operations
  const handleBulkResult = (
    totalUpdated: number,
    totalFailed: number,
    allFailedEntries: BulkFailEntry[],
    statusLabel: string,
  ) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
    if (totalFailed === 0) {
      toast.success(t('bulk.toast.success', { count: totalUpdated, status: statusLabel }));
    } else if (totalUpdated > 0) {
      toast(t('bulk.toast.partial', { updated: totalUpdated, failed: totalFailed }), { icon: '⚠️' });
      if (allFailedEntries.length > 0) setFailModal({ entries: allFailedEntries, status: statusLabel });
    } else {
      toast.error(t('bulk.toast.allFailed', { count: totalFailed }));
      if (allFailedEntries.length > 0) setFailModal({ entries: allFailedEntries, status: statusLabel });
    }
  };

  const handleBulkStatusUpdate = async (orderIds: string[], newStatus: OrderStatus, estimatedDelivery?: string) => {
    let totalUpdated = 0;
    let totalFailed = 0;
    const allFailedEntries: BulkFailEntry[] = [];

    for (const chunk of chunkArray(orderIds, BULK_CHUNK_SIZE)) {
      try {
        const res = await bulkUpdateStatus({ orderIds: chunk, status: newStatus, estimatedDelivery });
        const result = res?.data ?? (res as any);
        totalUpdated += result.updated ?? 0;
        totalFailed += result.failed ?? 0;
        if (result.failed > 0 && result.failedIds?.length) allFailedEntries.push(...result.failedIds);
      } catch {
        totalFailed += chunk.length;
      }
    }

    handleBulkResult(totalUpdated, totalFailed, allFailedEntries, t(`statuses.${newStatus}`));
  };

  const handleBulkPaymentStatusUpdate = async (orderIds: string[], newStatus: PaymentStatus) => {
    let totalUpdated = 0;
    let totalFailed = 0;
    const allFailedEntries: BulkFailEntry[] = [];

    for (const chunk of chunkArray(orderIds, BULK_CHUNK_SIZE)) {
      try {
        const res = await bulkUpdatePaymentStatus({ orderIds: chunk, paymentStatus: newStatus });
        const result = res?.data ?? (res as any);
        totalUpdated += result.updated ?? 0;
        totalFailed += result.failed ?? 0;
        if (result.failed > 0 && result.failedIds?.length) allFailedEntries.push(...result.failedIds);
      } catch {
        totalFailed += chunk.length;
      }
    }

    handleBulkResult(totalUpdated, totalFailed, allFailedEntries, t(`paymentStatuses.${newStatus}`));
  };

  return (
    <>
      <OrderList
        orders={orders}
        isLoading={isLoading}
        isError={isError}
        refetch={refetch}
        pagination={pagination}
        canWrite={canWrite}
        limit={limit}
        updatingOrderId={updatingOrderId}
        onStatusChange={handleStatusChange}
        onPaymentStatusChange={handlePaymentStatusChange}
        onBulkStatusUpdate={handleBulkStatusUpdate}
        onBulkPaymentStatusUpdate={handleBulkPaymentStatusUpdate}
      />

      {failModal && (
        <BulkFailModal
          open
          onClose={() => setFailModal(null)}
          failedEntries={failModal.entries}
          status={failModal.status}
        />
      )}
    </>
  );
}
