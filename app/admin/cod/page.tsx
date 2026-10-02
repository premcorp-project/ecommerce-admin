'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { useQueryParams } from '@/hooks/use-query-params';
import { useAdminMutation, useAdminQuery } from '@/lib/api/admin-hooks';
import { adminQueryKeys } from '@/lib/api/admin-query-keys';
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store';

import CodList, { CodPagination, CodUser } from '@/components/admin/cod/CodList';
import { TLimitType } from '@/components/shared/TableShimmer';

// --- Types ---

interface CodUsersResponse {
  success: boolean;
  data: {
    users: CodUser[];
    pagination: CodPagination;
  };
}

interface ToggleCodVariables {
  userId: string;
  isCodEnabled: boolean;
}

// --- Constants ---

const DEFAULT_LIMIT: TLimitType = 25;

// --- Component ---

export default function CodManagementPage() {
  const t = useTranslations('admin.cod');
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

  // Fetch COD-eligible users
  const { data, isLoading, isError, refetch } = useAdminQuery<CodUsersResponse>(
    adminQueryKeys.cod(queryParams),
    '/users/cod-eligible',
    {
      placeholderData: (previousData) => previousData,
    },
    { params: queryParams },
  );

  const users = data?.data?.users ?? [];
  const pagination = data?.data?.pagination;

  // Toggle COD status mutation
  const { mutateAsync: toggleCod, isPending: isToggling } =
    useAdminMutation<{ success: boolean; message: string }, ToggleCodVariables>(
      'put',
      (variables) => `/users/${variables.userId}/cod-eligibility`,
      {
        onSuccess: () => {
          toast.success(t('toast.statusUpdated'));
          queryClient.invalidateQueries({ queryKey: ['admin', 'cod'] });
          queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] });
        },
        onError: () => {
          toast.error(t('toast.statusUpdateFailed'));
        },
      },
    );

  const handleToggleCod = async (userId: string, currentStatus: boolean) => {
    setTogglingUserId(userId);
    try {
      await toggleCod({ userId, isCodEnabled: !currentStatus });
    } finally {
      setTogglingUserId(null);
    }
  };

  return (
    <CodList
      users={users}
      isLoading={isLoading}
      isError={isError}
      refetch={refetch}
      pagination={pagination}
      canWrite={canWrite}
      limit={limit}
      togglingUserId={isToggling ? togglingUserId : null}
      onToggleCod={handleToggleCod}
    />
  );
}
