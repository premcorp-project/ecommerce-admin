'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { useQueryParams } from '@/hooks/use-query-params';
import { useAdminMutation, useAdminQuery } from '@/lib/api/admin-hooks';
import { adminQueryKeys } from '@/lib/api/admin-query-keys';
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store';

import CustomerList, { Customer, CustomersPagination } from '@/components/admin/customers/CustomerList';
import { TLimitType } from '@/components/shared/TableShimmer';

// --- Types ---

interface CustomersResponse {
  success: boolean;
  data: {
    users: Customer[];
    pagination: CustomersPagination;
  };
}

interface ToggleActiveVariables {
  userId: string;
  isActive: boolean;
}

// --- Constants ---

const DEFAULT_LIMIT: TLimitType = 25;

// --- Component ---

export default function CustomersPage() {
  const t = useTranslations('admin.customers');
  const queryClient = useQueryClient();
  const { getParam } = useQueryParams();
  const hasWriteAccess = useAdminAuthStore((state) => state.hasWriteAccess);
  const canWrite = hasWriteAccess('users');

  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);

  // Read filter/pagination state from URL query params
  const page = Number(getParam('page')) || 1;
  const limit = (Number(getParam('limit')) || DEFAULT_LIMIT) as TLimitType;
  const search = getParam('search') || '';
  const role = getParam('role') || '';
  const isActive = getParam('isActive') || '';

  // Build query params
  const queryParams = {
    page,
    limit,
    ...(search && { search }),
    ...(role && { role }),
    ...(isActive && { isActive }),
  };

  // Fetch customers
  const { data, isLoading, isError, refetch } =
    useAdminQuery<CustomersResponse>(
      adminQueryKeys.customers(queryParams),
      '/users/all',
      {
        placeholderData: (previousData) => previousData,
      },
      { params: queryParams },
    );

  const users = data?.data?.users ?? [];
  const pagination = data?.data?.pagination;

  // Toggle active status mutation
  const { mutateAsync: toggleActive, isPending: isToggling } =
    useAdminMutation<{ success: boolean; message: string }, ToggleActiveVariables>(
      'put',
      (variables) => `/users/${variables.userId}/active`,
      {
        onSuccess: () => {
          toast.success(t('toast.statusUpdated'));
          queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] });
        },
        onError: () => {
          toast.error(t('toast.statusUpdateFailed'));
        },
      },
    );

  // Toggle bulk buyer mutation
  const { mutateAsync: toggleBulkBuyer, isPending: isTogglingBulk } =
    useAdminMutation<{ success: boolean }, { userId: string; isBulkBuyer: boolean }>(
      'put',
      (variables) => `/users/${variables.userId}/bulk-buyer`,
      {
        onSuccess: () => {
          toast.success(t('toast.bulkBuyerUpdated'));
          queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] });
          queryClient.invalidateQueries({ queryKey: ['admin', 'bulk-buyers'] });
        },
        onError: () => {
          toast.error(t('toast.bulkBuyerUpdateFailed'));
        },
      },
    );

  // Toggle COD eligibility mutation
  const { mutateAsync: toggleCod, isPending: isTogglingCod } =
    useAdminMutation<{ success: boolean }, { userId: string; isCodEnabled: boolean }>(
      'put',
      (variables) => `/users/${variables.userId}/cod-eligibility`,
      {
        onSuccess: () => {
          toast.success(t('toast.codUpdated'));
          queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] });
          queryClient.invalidateQueries({ queryKey: ['admin', 'cod'] });
        },
        onError: () => {
          toast.error(t('toast.codUpdateFailed'));
        },
      },
    );

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    setTogglingUserId(userId);
    try {
      await toggleActive({ userId, isActive: !currentStatus });
    } finally {
      setTogglingUserId(null);
    }
  };

  const handleToggleBulkBuyer = async (userId: string, current: boolean) => {
    await toggleBulkBuyer({ userId, isBulkBuyer: !current });
  };

  const handleToggleCod = async (userId: string, current: boolean) => {
    await toggleCod({ userId, isCodEnabled: !current });
  };

  return (
    <CustomerList
      customers={users}
      isLoading={isLoading}
      isError={isError}
      refetch={refetch}
      pagination={pagination}
      canWrite={canWrite}
      limit={limit}
      togglingUserId={isToggling ? togglingUserId : null}
      isTogglingBulk={isTogglingBulk}
      isTogglingCod={isTogglingCod}
      onToggleActive={handleToggleActive}
      onToggleBulkBuyer={handleToggleBulkBuyer}
      onToggleCod={handleToggleCod}
    />
  );
}
