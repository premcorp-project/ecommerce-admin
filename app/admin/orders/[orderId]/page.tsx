'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { use, useState } from 'react';
import toast from 'react-hot-toast';

import { useConfig } from '@/hooks/use-config';
import { useAdminMutation, useAdminQuery } from '@/lib/api/admin-hooks';
import { adminQueryKeys } from '@/lib/api/admin-query-keys';
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store';

import OrderDetail, { AdminOrderDetail } from '@/components/admin/orders/OrderDetail';
import { OrderStatus, StatusChangePayload } from '@/components/admin/orders/OrderStatusBadge';
import { PaymentStatus } from '@/components/admin/orders/PaymentStatusBadge';
import { AppAlertDialog } from '@/components/shared/AppAlertDialog';

// --- Types ---

interface OrderDetailResponse {
  success: boolean;
  data: {
    order: AdminOrderDetail;
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

interface RefundVariables {
  orderId: string;
}

// --- Page ---

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = use(params);
  const t = useTranslations('admin.orders');
  const router = useRouter();
  const queryClient = useQueryClient();
  const hasWriteAccess = useAdminAuthStore((s) => s.hasWriteAccess);
  const canWrite = hasWriteAccess('orders');
  const { config } = useConfig();

  // Refund confirmation dialog state
  const [refundConfirmOpen, setRefundConfirmOpen] = useState(false);
  const [refundOrderId, setRefundOrderId] = useState<string | null>(null);

  // Fetch order detail
  const { data, isLoading, isError } = useAdminQuery<OrderDetailResponse>(
    adminQueryKeys.orderDetail(orderId),
    `/orders/admin/${orderId}`,
  );

  const order = data?.data?.order ?? (data as any)?.data ?? null;

  // Single order status
  const { mutateAsync: updateStatus, isPending: isUpdatingStatus } =
    useAdminMutation<{ success: boolean }, StatusUpdateVariables>(
      'put',
      (v) => `/orders/${v.orderId}/status`,
      {
        onSuccess: () => {
          toast.success(t('toast.statusUpdated'));
          queryClient.refetchQueries({ queryKey: adminQueryKeys.orderDetail(orderId) });
          queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
        },
        onError: () => toast.error(t('toast.statusUpdateFailed')),
      },
    );

  // Single order payment status
  const { mutateAsync: updatePaymentStatus, isPending: isUpdatingPayment } =
    useAdminMutation<{ success: boolean }, PaymentStatusUpdateVariables>(
      'put',
      (v) => `/orders/${v.orderId}/payment-status`,
      {
        onSuccess: () => {
          toast.success(t('toast.paymentStatusUpdated'));
          queryClient.refetchQueries({ queryKey: adminQueryKeys.orderDetail(orderId) });
          queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
        },
        onError: () => toast.error(t('toast.paymentStatusUpdateFailed')),
      },
    );

  // Refund
  const { mutateAsync: processRefund, isPending: isRefunding } =
    useAdminMutation<{ success: boolean }, RefundVariables>(
      'post',
      (v) => `/orders/${v.orderId}/refund`,
      {
        onSuccess: () => {
          toast.success(t('detail.refundSuccess'));
          queryClient.refetchQueries({ queryKey: adminQueryKeys.orderDetail(orderId) });
          queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
        },
        onError: () => toast.error(t('detail.refundFailed')),
      },
    );

  const handleStatusChange = async (oid: string, payload: StatusChangePayload) => {
    await updateStatus({ orderId: oid, status: payload.status, estimatedDelivery: payload.estimatedDelivery });
  };

  const handlePaymentStatusChange = async (oid: string, newStatus: PaymentStatus) => {
    await updatePaymentStatus({ orderId: oid, paymentStatus: newStatus });
  };

  const handleRefund = (oid: string) => {
    setRefundOrderId(oid);
    setRefundConfirmOpen(true);
  };

  const handleRefundConfirm = async () => {
    if (!refundOrderId) return;
    try {
      await processRefund({ orderId: refundOrderId });
      setRefundConfirmOpen(false);
      setRefundOrderId(null);
    } catch {
      // onError callback already showed the toast
    }
  };

  return (
    <>
      <OrderDetail
        order={order}
        isLoading={isLoading}
        isError={isError}
        canWrite={canWrite}
        isUpdating={isUpdatingStatus || isUpdatingPayment}
        isRefunding={isRefunding}
        isRefundsEnabled={config?.isRefundsEnabled ?? false}
        onBack={() => router.push('/admin/orders')}
        onStatusChange={handleStatusChange}
        onPaymentStatusChange={handlePaymentStatusChange}
        onRefund={handleRefund}
      />

      {/* Refund confirmation dialog */}
      <AppAlertDialog
        open={refundConfirmOpen}
        onOpenChange={(open) => {
          if (!open) {
            setRefundConfirmOpen(false);
            setRefundOrderId(null);
          }
        }}
        title={t('detail.refundConfirmTitle')}
        subTitle={t('detail.refundConfirmDescription')}
        confirmLabel={t('detail.refund')}
        onConfirm={handleRefundConfirm}
        loading={isRefunding}
        variant="delete"
      />
    </>
  );
}
