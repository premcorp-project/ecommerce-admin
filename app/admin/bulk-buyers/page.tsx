'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { useQueryParams } from '@/hooks/use-query-params';
import { useAdminMutation, useAdminQuery } from '@/lib/api/admin-hooks';
import { adminQueryKeys } from '@/lib/api/admin-query-keys';
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store';

import BulkBuyerList, { BulkBuyersPagination, BulkBuyerUser } from '@/components/admin/bulk-buyers/BulkBuyerList';
import { TLimitType } from '@/components/shared/TableShimmer';

// --- Types ---

interface BulkBuyersResponse {
  success: boolean;
  data: {
    users: BulkBuyerUser[];
    pagination: BulkBuyersPagination;
  };
}

interface ToggleBulkBuyerVariables {
  userId: string;
  isBulkBuyer: boolean;
}

// --- Constants ---

const DEFAULT_LIMIT: TLimitType = 25;

// --- Component ---

export default function BulkBuyersPage() {
  const t = useTranslations('admin.bulkBuyers');
  const queryClient = useQueryClient();
  const { getParam } = useQueryParams();
  const hasWriteAccess = useAdminAuthStore((state) => state.hasWriteAccess);
  const canWrite = hasWriteAccess('users');

  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);

  // Read filter/pagination state from URL query params
  const page = Number(getParam('page')) || 1;
  const limit = (Number(getParam('limit')) || DEFAULT_LIMIT) as TLimitType;
  const search = getParam('search') || '';

  // Build query params
  const queryParams = {
    page,
    limit,
    ...(search && { search }),
  };

  // Fetch bulk buyers
  const { data, isLoading, isError, refetch } = useAdminQuery<BulkBuyersResponse>(
    adminQueryKeys.bulkBuyers(queryParams),
    '/users/bulk-buyers',
    {
      placeholderData: (previousData) => previousData,
    },
    { params: queryParams },
  );

  const users = data?.data?.users ?? [];
  const pagination = data?.data?.pagination;

  // Toggle bulk buyer status mutation
  const { mutateAsync: toggleBulkBuyer, isPending: isToggling } =
    useAdminMutation<{ success: boolean; message: string }, ToggleBulkBuyerVariables>(
      'put',
      (variables) => `/users/${variables.userId}/bulk-buyer`,
      {
        onSuccess: () => {
          toast.success(t('toast.statusUpdated'));
          queryClient.invalidateQueries({ queryKey: ['admin', 'bulk-buyers'] });
          queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] });
        },
        onError: () => {
          toast.error(t('toast.statusUpdateFailed'));
        },
      },
    );

  const handleToggleBulkBuyer = async (userId: string, currentStatus: boolean) => {
    setTogglingUserId(userId);
    try {
      await toggleBulkBuyer({ userId, isBulkBuyer: !currentStatus });
    } finally {
      setTogglingUserId(null);
    }
  };

  return (
    <BulkBuyerList
      users={users}
      isLoading={isLoading}
      isError={isError}
      refetch={refetch}
      pagination={pagination}
      canWrite={canWrite}
      limit={limit}
      togglingUserId={isToggling ? togglingUserId : null}
      onToggleBulkBuyer={handleToggleBulkBuyer}
    />
  );
}
