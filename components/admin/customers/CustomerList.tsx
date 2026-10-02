'use client';

import { Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useSortableData } from '@/hooks/use-sortable-data';

import AppPagination from '@/components/shared/AppPagination';
import { DownloadButtons } from '@/components/shared/DownloadButtons';
import { Filter, GlobalFilters } from '@/components/shared/GlobalFilters';
import NoDataFound from '@/components/shared/NoDataFound';
import TableHeaderCell from '@/components/shared/TableHeaderCell';
import { TableShimmer, TLimitType } from '@/components/shared/TableShimmer';
import { Switch } from '@/components/ui/switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

// --- Types ---

export interface Customer {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'staff' | 'customer';
  isActive: boolean;
  isEmailVerified: boolean;
  isBulkBuyer: boolean;
  isCodEnabled: boolean;
  createdAt: string;
}

export interface CustomersPagination {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  perPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface CustomerListProps {
  customers: Customer[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  pagination: CustomersPagination | undefined;
  canWrite: boolean;
  limit: TLimitType;
  togglingUserId: string | null;
  isTogglingBulk: boolean;
  isTogglingCod: boolean;
  onToggleActive: (userId: string, currentStatus: boolean) => void;
  onToggleBulkBuyer: (userId: string, current: boolean) => void;
  onToggleCod: (userId: string, current: boolean) => void;
}

// --- Constants ---

const DEFAULT_LIMIT: TLimitType = 25;

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  staff: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  customer: 'bg-muted text-muted-foreground',
};

// --- Component ---

export default function CustomerList({
  customers,
  isLoading,
  isError,
  refetch,
  pagination,
  canWrite,
  limit,
  togglingUserId,
  isTogglingBulk,
  isTogglingCod,
  onToggleActive,
  onToggleBulkBuyer,
  onToggleCod,
}: CustomerListProps) {
  const t = useTranslations('admin.customers');
  const tCommon = useTranslations('common');

  // Client-side sorting
  const { items, requestSort, sortConfig } = useSortableData<Customer>(customers);

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
    {
      type: 'select',
      paramName: 'role',
      placeholder: t('columns.role'),
      options: [
        { key: t('filters.allRoles'), value: '' },
        { key: t('roles.admin'), value: 'admin' },
        { key: t('roles.staff'), value: 'staff' },
        { key: t('roles.customer'), value: 'customer' },
      ],
    },
    {
      type: 'select',
      paramName: 'isActive',
      placeholder: t('columns.status'),
      options: [
        { key: t('filters.allStatuses'), value: '' },
        { key: t('statuses.active'), value: 'true' },
        { key: t('statuses.inactive'), value: 'false' },
      ],
    },
  ];

  const downloadColumns = [
    { header: t('columns.name'), dataKey: 'name' },
    { header: t('columns.email'), dataKey: 'email' },
    { header: t('columns.phone'), dataKey: 'phone' },
    { header: t('columns.role'), dataKey: 'role' },
    {
      header: t('columns.verified'),
      dataKey: 'isEmailVerified',
      formatter: (item: Customer) =>
        item.isEmailVerified ? t('verifiedYes') : t('verifiedNo'),
    },
    {
      header: t('columns.bulkBuyer'),
      dataKey: 'isBulkBuyer',
      formatter: (item: Customer) =>
        item.isBulkBuyer ? t('yes') : t('no'),
    },
    {
      header: t('columns.cod'),
      dataKey: 'isCodEnabled',
      formatter: (item: Customer) =>
        item.isCodEnabled ? t('yes') : t('no'),
    },
    {
      header: t('columns.joined'),
      dataKey: 'createdAt',
      formatter: (item: Customer) => formatDate(item.createdAt),
    },
  ];

  const columnCount = canWrite ? 9 : 6;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-semibold">{t('title')}</h1>
        </div>
      </div>

      <GlobalFilters filters={filters} />

      {items.length > 0 && (
        <DownloadButtons
          fileName="customers_report"
          data={items}
          columns={downloadColumns}
        />
      )}

      <div className="rounded-md border overflow-auto">
        <Table className="min-w-[900px]">
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
                label={t('columns.phone')}
                sortKey="phone"
                requestSort={requestSort}
                sortConfig={sortConfig}
              />
              <TableHeaderCell
                label={t('columns.role')}
                sortKey="role"
                requestSort={requestSort}
                sortConfig={sortConfig}
              />
              <TableHeaderCell
                label={t('columns.verified')}
                sortKey="isEmailVerified"
                requestSort={requestSort}
                sortConfig={sortConfig}
              />
              <TableHeaderCell
                label={t('columns.joined')}
                sortKey="createdAt"
                requestSort={requestSort}
                sortConfig={sortConfig}
              />
              {canWrite && (
                <TableHeaderCell
                  label={t('columns.active')}
                  sortKey=""
                  requestSort={() => {}}
                  sortConfig={null}
                />
              )}
              {canWrite && (
                <TableHeaderCell
                  label={t('columns.bulkBuyer')}
                  sortKey=""
                  requestSort={() => {}}
                  sortConfig={null}
                />
              )}
              {canWrite && (
                <TableHeaderCell
                  label={t('columns.cod')}
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
                  <NoDataFound title={t('noCustomers')} />
                </TableCell>
              </TableRow>
            ) : (
              items.map((user) => (
                <TableRow key={user._id} className="!h-[55px]">
                  <TableCell className="pl-4 font-medium">
                    {user.name}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.email}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.phone || '—'}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${ROLE_COLORS[user.role] || 'bg-muted text-muted-foreground'}`}
                    >
                      {t(`roles.${user.role}`)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        user.isEmailVerified
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}
                    >
                      {user.isEmailVerified ? t('verifiedYes') : t('verifiedNo')}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(user.createdAt)}
                  </TableCell>
                  {canWrite && (
                    <TableCell>
                      <Switch
                        checked={user.isActive}
                        onCheckedChange={() =>
                          onToggleActive(user._id, user.isActive)
                        }
                        disabled={togglingUserId === user._id}
                        aria-label={`${t('toggleActive')} ${user.name}`}
                      />
                    </TableCell>
                  )}
                  {canWrite && (
                    <TableCell>
                      <Switch
                        checked={user.isBulkBuyer}
                        onCheckedChange={() =>
                          onToggleBulkBuyer(user._id, user.isBulkBuyer)
                        }
                        disabled={isTogglingBulk}
                        aria-label={`${t('toggleBulkBuyer')} ${user.name}`}
                      />
                    </TableCell>
                  )}
                  {canWrite && (
                    <TableCell>
                      <Switch
                        checked={user.isCodEnabled}
                        onCheckedChange={() =>
                          onToggleCod(user._id, user.isCodEnabled)
                        }
                        disabled={isTogglingCod}
                        aria-label={`${t('toggleCod')} ${user.name}`}
                      />
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
    </div>
  );
}
