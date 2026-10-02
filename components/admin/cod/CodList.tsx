'use client';

import { Banknote } from 'lucide-react';
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

export interface CodUser {
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

export interface CodPagination {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  perPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface CodListProps {
  users: CodUser[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  pagination: CodPagination | undefined;
  canWrite: boolean;
  limit: TLimitType;
  togglingUserId: string | null;
  onToggleCod: (userId: string, currentStatus: boolean) => void;
}

// --- Constants ---

const DEFAULT_LIMIT: TLimitType = 25;

// --- Component ---

export default function CodList({
  users,
  isLoading,
  isError,
  refetch,
  pagination,
  canWrite,
  limit,
  togglingUserId,
  onToggleCod,
}: CodListProps) {
  const t = useTranslations('admin.cod');
  const tCommon = useTranslations('common');

  // Client-side sorting
  const { items, requestSort, sortConfig } = useSortableData<CodUser>(users);

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

  const downloadColumns = [
    { header: t('columns.name'), dataKey: 'name' },
    { header: t('columns.email'), dataKey: 'email' },
    { header: t('columns.phone'), dataKey: 'phone' },
    {
      header: t('columns.status'),
      dataKey: 'isActive',
      formatter: (item: CodUser) =>
        item.isActive ? t('statuses.active') : t('statuses.inactive'),
    },
    {
      header: t('columns.joined'),
      dataKey: 'createdAt',
      formatter: (item: CodUser) => formatDate(item.createdAt),
    },
  ];

  const columnCount = canWrite ? 6 : 5;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Banknote className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-semibold">{t('title')}</h1>
        </div>
      </div>

      <GlobalFilters filters={filters} />

      {items.length > 0 && (
        <DownloadButtons
          fileName="cod_users_report"
          data={items}
          columns={downloadColumns}
        />
      )}

      <div className="rounded-md border overflow-auto">
        <Table className="min-w-[800px]">
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
                label={t('columns.joined')}
                sortKey="createdAt"
                requestSort={requestSort}
                sortConfig={sortConfig}
              />
              <TableHeaderCell
                label={t('columns.status')}
                sortKey="isActive"
                requestSort={requestSort}
                sortConfig={sortConfig}
              />
              {canWrite && (
                <TableHeaderCell
                  label={t('columns.codEnabled')}
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
                  <NoDataFound title={t('noCodUsers')} />
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
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        user.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                    >
                      {user.isActive ? t('statuses.active') : t('statuses.inactive')}
                    </span>
                  </TableCell>
                  {canWrite && (
                    <TableCell>
                      <Switch
                        checked={user.isCodEnabled}
                        onCheckedChange={() =>
                          onToggleCod(user._id, user.isCodEnabled)
                        }
                        disabled={togglingUserId === user._id}
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
