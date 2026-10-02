'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { useQueryParams } from '@/hooks/use-query-params';
import { useAdminMutation, useAdminQuery } from '@/lib/api/admin-hooks';
import { adminQueryKeys } from '@/lib/api/admin-query-keys';
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store';

import CouponList, { Coupon } from '@/components/admin/coupons/CouponList';
import CouponForm from '@/components/admin/forms/CouponForm';
import { AppAlertDialog } from '@/components/shared/AppAlertDialog';
import { TLimitType } from '@/components/shared/TableShimmer';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';

// --- Types ---

interface CouponsResponse {
  success: boolean;
  coupons: Coupon[];
}

// --- Constants ---

const DEFAULT_LIMIT: TLimitType = 25;

// --- Component ---

export default function CouponsPage() {
  const t = useTranslations('admin.coupons');
  const queryClient = useQueryClient();
  const { getParam } = useQueryParams();
  const hasWriteAccess = useAdminAuthStore((state) => state.hasWriteAccess);
  const canWrite = hasWriteAccess('catalog');

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [deletingCoupon, setDeletingCoupon] = useState<Coupon | null>(null);

  // Read pagination state from URL query params
  const page = Number(getParam('page')) || 1;
  const limit = (Number(getParam('limit')) || DEFAULT_LIMIT) as TLimitType;

  // Build query params
  const queryParams = { page, limit };

  // Fetch coupons
  const { data, isLoading, isError, refetch } = useAdminQuery<CouponsResponse>(
    adminQueryKeys.coupons(queryParams),
    '/catalog/coupons',
    {
      placeholderData: (previousData) => previousData,
    },
    { params: queryParams },
  );

  const coupons = (data as any)?.data?.coupons ?? data?.coupons ?? [];

  // Delete mutation
  const { mutateAsync: deleteCoupon, isPending: isDeleting } = useAdminMutation<
    { success: boolean; message: string },
    string
  >('delete', (id) => `/catalog/coupons/${id}`, {
    onSuccess: () => {
      toast.success(t('toast.deleteSuccess'));
      queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] });
    },
    onError: () => {
      toast.error(t('toast.deleteFailed'));
    },
  });

  const handleDelete = async () => {
    if (!deletingCoupon) return;
    await deleteCoupon(deletingCoupon._id);
    setDeletingCoupon(null);
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setSheetOpen(true);
  };

  const handleCreate = () => {
    setEditingCoupon(null);
    setSheetOpen(true);
  };

  return (
    <>
      <CouponList
        coupons={coupons}
        isLoading={isLoading}
        isError={isError}
        refetch={refetch}
        canWrite={canWrite}
        limit={limit}
        isDeleting={isDeleting}
        deletingCouponId={deletingCoupon?._id ?? null}
        onEdit={handleEdit}
        onDelete={setDeletingCoupon}
        onCreate={handleCreate}
      />

      {/* Delete confirmation dialog */}
      {deletingCoupon && (
        <AppAlertDialog
          open={!!deletingCoupon}
          onOpenChange={(open) => !open && setDeletingCoupon(null)}
          title={t('deleteCoupon')}
          subTitle={t('deleteConfirm', { code: deletingCoupon.code })}
          description={t('deleteDescription')}
          variant="delete"
          confirmLabel={t('deleteCoupon')}
          onConfirm={handleDelete}
          loading={isDeleting}
        />
      )}

      {/* Create/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {editingCoupon ? t('editCoupon') : t('addCoupon')}
            </SheetTitle>
            <SheetDescription>
              {editingCoupon
                ? t('editDescription')
                : t('addDescription')}
            </SheetDescription>
          </SheetHeader>
          <CouponForm
            item={editingCoupon}
            onSuccess={() => setSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
