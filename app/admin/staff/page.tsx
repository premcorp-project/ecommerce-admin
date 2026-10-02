'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { useQueryParams } from '@/hooks/use-query-params';
import { useAdminMutation, useAdminQuery } from '@/lib/api/admin-hooks';
import { adminQueryKeys } from '@/lib/api/admin-query-keys';
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store';
import { returnErrorMessage } from '@/lib/toast-error';

import StaffList from '@/components/admin/staff/StaffList';
import { TLimitType } from '@/components/shared/TableShimmer';

// --- Types ---

export interface StaffMember {
  _id: string;
  name: string;
  email: string;
  role: 'staff';
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  permissions?: {
    catalog: { read: boolean; write: boolean };
    orders: { read: boolean; write: boolean };
    users: { read: boolean; write: boolean };
    support: { read: boolean; write: boolean };
    notifications: { read: boolean; write: boolean };
    config: { read: boolean; write: boolean };
  };
}

export interface StaffPagination {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  perPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface StaffListResponse {
  success: boolean;
  data: {
    users: StaffMember[];
    pagination: StaffPagination;
  };
}

interface ToggleActiveVariables {
  userId: string;
  isActive: boolean;
}

// --- Constants ---

const DEFAULT_LIMIT: TLimitType = 25;
const DEBOUNCE_MS = 300;

// --- Component ---

export default function StaffPage() {
  const t = useTranslations('admin.staff');
  const queryClient = useQueryClient();
  const { getParam, setParams } = useQueryParams();
  const hasWriteAccess = useAdminAuthStore((state) => state.hasWriteAccess);
  const currentUser = useAdminAuthStore((state) => state.user);
  const role = useAdminAuthStore((state) => state.role);
  const canWrite = hasWriteAccess('users');
  const isAdmin = role === 'admin';

  // --- URL-based pagination/search state ---
  const page = Number(getParam('page')) || 1;
  const limit = (Number(getParam('limit')) || DEFAULT_LIMIT) as TLimitType;
  const search = getParam('search') || '';

  // --- Debounced search ---
  const [searchInput, setSearchInput] = useState(search);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        setParams({ search: value || null, page: '1' });
      }, DEBOUNCE_MS);
    },
    [setParams],
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // --- Sheet state ---
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [editPermissionsSheetOpen, setEditPermissionsSheetOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

  // --- Alert dialog state ---
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [staffToToggle, setStaffToToggle] = useState<StaffMember | null>(null);

  // --- Build query params ---
  const queryParams = {
    page,
    limit,
    role: 'staff',
    ...(search && { search }),
  };

  // --- Fetch staff list ---
  const { data, isLoading, isError, refetch } =
    useAdminQuery<StaffListResponse>(
      adminQueryKeys.staff(queryParams),
      '/users/all',
      {
        placeholderData: (previousData) => previousData,
      },
      { params: queryParams },
    );

  const staff = data?.data?.users ?? [];
  const pagination = data?.data?.pagination;

  // --- Toggle active mutation ---
  const { mutateAsync: toggleActive, isPending: isToggling } =
    useAdminMutation<{ success: boolean; message: string }, ToggleActiveVariables>(
      'put',
      (variables) => `/users/${variables.userId}/active`,
      {
        onSuccess: (_data, variables) => {
          const message = variables.isActive
            ? t('toast.activated')
            : t('toast.deactivated');
          toast.success(message);
          queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] });
          setAlertDialogOpen(false);
          setStaffToToggle(null);
        },
        onError: (error, variables) => {
          const backendMessage = returnErrorMessage(error);
          const fallbackMessage = variables.isActive
            ? t('toast.activateFailed')
            : t('toast.deactivateFailed');
          toast.error(backendMessage || fallbackMessage);
          setAlertDialogOpen(false);
          setStaffToToggle(null);
        },
      },
    );

  // --- Handlers ---

  const handleAddStaff = () => {
    setCreateSheetOpen(true);
  };

  const handleEditPermissions = (member: StaffMember) => {
    setSelectedStaff(member);
    setEditPermissionsSheetOpen(true);
  };

  const handleToggleActive = (member: StaffMember) => {
    setStaffToToggle(member);
    setAlertDialogOpen(true);
  };

  const handleConfirmToggleActive = async () => {
    if (!staffToToggle) return;
    await toggleActive({
      userId: staffToToggle._id,
      isActive: !staffToToggle.isActive,
    });
  };

  const handleCreateSuccess = () => {
    setCreateSheetOpen(false);
    queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] });
  };

  const handleEditPermissionsSuccess = () => {
    setEditPermissionsSheetOpen(false);
    setSelectedStaff(null);
    queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] });
  };

  return (
    <StaffList
      staff={staff}
      isLoading={isLoading}
      isError={isError}
      refetch={refetch}
      pagination={pagination}
      canWrite={canWrite}
      isAdmin={isAdmin}
      limit={limit}
      currentUserId={currentUser?._id ?? null}
      searchInput={searchInput}
      onSearchChange={handleSearchChange}
      onAddStaff={handleAddStaff}
      onEditPermissions={handleEditPermissions}
      onToggleActive={handleToggleActive}
      // Sheet state
      createSheetOpen={createSheetOpen}
      onCreateSheetOpenChange={setCreateSheetOpen}
      onCreateSuccess={handleCreateSuccess}
      editPermissionsSheetOpen={editPermissionsSheetOpen}
      onEditPermissionsSheetOpenChange={setEditPermissionsSheetOpen}
      selectedStaff={selectedStaff}
      onEditPermissionsSuccess={handleEditPermissionsSuccess}
      // Alert dialog state
      alertDialogOpen={alertDialogOpen}
      onAlertDialogOpenChange={setAlertDialogOpen}
      staffToToggle={staffToToggle}
      isToggling={isToggling}
      onConfirmToggleActive={handleConfirmToggleActive}
    />
  );
}
