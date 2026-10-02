'use client';

import { MoreHorizontal, Shield, UserCog, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

import { StaffMember, StaffPagination } from '@/app/admin/staff/page';
import { useSortableData } from '@/hooks/use-sortable-data';

import { AppAlertDialog } from '@/components/shared/AppAlertDialog';
import { AppButton } from '@/components/shared/AppButton';
import AppPagination from '@/components/shared/AppPagination';
import { Filter, GlobalFilters } from '@/components/shared/GlobalFilters';
import NoDataFound from '@/components/shared/NoDataFound';
import TableHeaderCell from '@/components/shared/TableHeaderCell';
import { TableShimmer, TLimitType } from '@/components/shared/TableShimmer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import CreateStaffSheet from '@/components/admin/staff/CreateStaffSheet';
import EditPermissionsSheet from '@/components/admin/staff/EditPermissionsSheet';

// --- Types ---

export interface StaffListProps {
  staff: StaffMember[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  pagination: StaffPagination | undefined;
  canWrite: boolean;
  isAdmin: boolean;
  limit: TLimitType;
  currentUserId: string | null;
  searchInput: string;
  onSearchChange: (value: string) => void;
  onAddStaff: () => void;
  onEditPermissions: (staff: StaffMember) => void;
  onToggleActive: (staff: StaffMember) => void;
  // Sheet state
  createSheetOpen: boolean;
  onCreateSheetOpenChange: (open: boolean) => void;
  onCreateSuccess: () => void;
  editPermissionsSheetOpen: boolean;
  onEditPermissionsSheetOpenChange: (open: boolean) => void;
  selectedStaff: StaffMember | null;
  onEditPermissionsSuccess: () => void;
  // Alert dialog state
  alertDialogOpen: boolean;
  onAlertDialogOpenChange: (open: boolean) => void;
  staffToToggle: StaffMember | null;
  isToggling: boolean;
  onConfirmToggleActive: () => void;
}

// --- Constants ---

const DEFAULT_LIMIT: TLimitType = 25;

// --- Component ---

export default function StaffList({
  staff,
  isLoading,
  isError,
  refetch,
  pagination,
  canWrite,
  isAdmin,
  limit,
  currentUserId,
  searchInput,
  onSearchChange,
  onAddStaff,
  onEditPermissions,
  onToggleActive,
  // Sheet state
  createSheetOpen,
  onCreateSheetOpenChange,
  onCreateSuccess,
  editPermissionsSheetOpen,
  onEditPermissionsSheetOpenChange,
  selectedStaff,
  onEditPermissionsSuccess,
  // Alert dialog state
  alertDialogOpen,
  onAlertDialogOpenChange,
  staffToToggle,
  isToggling,
  onConfirmToggleActive,
}: StaffListProps) {
  const t = useTranslations('admin.staff');
  const tCommon = useTranslations('common');

  // Client-side sorting
  const { items, requestSort, sortConfig } = useSortableData<StaffMember>(staff);

  // Show error toast on API failure
  useEffect(() => {
    if (isError) {
      toast.error(t('failedToLoad'));
    }
  }, [isError, t]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Filter configuration
  const filters: Filter[] = [
    {
      type: 'search',
      paramName: 'search',
      placeholder: t('searchPlaceholder'),
    },
  ];

  const columnCount = isAdmin ? 5 : 4;

  return (
    <div className="space-y-4 p-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCog className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-semibold">{t('title')}</h1>
        </div>
        {isAdmin && (
          <AppButton
            variant="primary"
            onClick={onAddStaff}
            leftIcon={<UserPlus size={18} />}
          >
            {t('buttons.addStaff')}
          </AppButton>
        )}
      </div>

      {/* Filters */}
      <GlobalFilters filters={filters} />

      {/* Table */}
      <div className="rounded-md border overflow-auto">
        <Table className="min-w-[700px]">
          <TableHeader className="bg-accent rounded-t-md">
            <TableRow>
              <TableHeaderCell
                label={t('columns.name')}
                sortKey="name"
                requestSort={requestSort}
                sortConfig={sortConfig}
                containerClass="pl-4"
              />
              <TableHeaderCell
                label={t('columns.email')}
                sortKey="email"
                requestSort={requestSort}
                sortConfig={sortConfig}
              />
              <TableHeaderCell
                label={t('columns.status')}
                sortKey="isActive"
                requestSort={requestSort}
                sortConfig={sortConfig}
              />
              <TableHeaderCell
                label={t('columns.createdAt')}
                sortKey="createdAt"
                requestSort={requestSort}
                sortConfig={sortConfig}
              />
              {isAdmin && (
                <TableHeaderCell
                  label={t('columns.actions')}
                  sortKey=""
                  requestSort={() => {}}
                  sortConfig={null}
                />
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableShimmer limit={limit} columns={columnCount} />
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-sm text-muted-foreground">
                      {t('failedToLoad')}
                    </p>
                    <button
                      onClick={() => refetch()}
                      className="text-sm text-primary underline"
                    >
                      {tCommon('retry')}
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="text-center">
                  <NoDataFound title={t('noStaff')} />
                </TableCell>
              </TableRow>
            ) : (
              items.map((member) => (
                <TableRow key={member._id} className="!h-[55px]">
                  <TableCell className="pl-4 font-medium">
                    {member.name}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {member.email}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        member.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                    >
                      {member.isActive
                        ? t('status.active')
                        : t('status.inactive')}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(member.createdAt)}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
                            aria-label={t('columns.actions')}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {isAdmin && (
                            <DropdownMenuItem
                              className="flex items-center gap-2 cursor-pointer"
                              onClick={() => onEditPermissions(member)}
                            >
                              <Shield className="h-4 w-4" />
                              <span>{t('buttons.editPermissions')}</span>
                            </DropdownMenuItem>
                          )}
                          {member._id !== currentUserId && (
                            <DropdownMenuItem
                              className="flex items-center gap-2 cursor-pointer"
                              onClick={() => onToggleActive(member)}
                            >
                              <UserCog className="h-4 w-4" />
                              <span>
                                {member.isActive
                                  ? t('dialog.deactivateTitle')
                                  : t('dialog.activateTitle')}
                              </span>
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
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
            />
          )}
        </div>
      </div>

      {/* Create Staff Sheet */}
      <CreateStaffSheet
        open={createSheetOpen}
        onOpenChange={onCreateSheetOpenChange}
        onSuccess={onCreateSuccess}
      />

      {/* Edit Permissions Sheet */}
      <EditPermissionsSheet
        open={editPermissionsSheetOpen}
        onOpenChange={onEditPermissionsSheetOpenChange}
        staff={selectedStaff}
        onSuccess={onEditPermissionsSuccess}
      />

      {/* Activate/Deactivate Alert Dialog */}
      {staffToToggle && (
        <AppAlertDialog
          open={alertDialogOpen}
          onOpenChange={onAlertDialogOpenChange}
          title={
            staffToToggle.isActive
              ? t('dialog.deactivateTitle')
              : t('dialog.activateTitle')
          }
          subTitle={
            staffToToggle.isActive
              ? t('dialog.deactivateSubTitle', { name: staffToToggle.name })
              : t('dialog.activateSubTitle', { name: staffToToggle.name })
          }
          description={
            staffToToggle.isActive
              ? t('dialog.deactivateDescription')
              : t('dialog.activateDescription')
          }
          confirmLabel={
            staffToToggle.isActive
              ? t('dialog.deactivateTitle')
              : t('dialog.activateTitle')
          }
          variant={staffToToggle.isActive ? 'delete' : 'primary'}
          onConfirm={onConfirmToggleActive}
          loading={isToggling}
        />
      )}
    </div>
  );
}
