'use client';

import { Pencil, Ticket, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useCurrency } from '@/hooks/use-currency';
import { useSortableData } from '@/hooks/use-sortable-data';

import { DownloadButtons } from '@/components/shared/DownloadButtons';
import NoDataFound from '@/components/shared/NoDataFound';
import TableHeaderCell from '@/components/shared/TableHeaderCell';
import { TableShimmer, TLimitType } from '@/components/shared/TableShimmer';
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

// --- Types ---

export interface Coupon {
  _id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minimumOrderAmount?: number;
  expiryDate: string;
  usageLimit?: number;
  usageCount: number;
  perUserLimit: number | null;
  isActive: boolean;
  createdAt?: string;
}

interface CouponListProps {
  coupons: Coupon[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  canWrite: boolean;
  limit: TLimitType;
  isDeleting: boolean;
  deletingCouponId: string | null;
  onEdit: (coupon: Coupon) => void;
  onDelete: (coupon: Coupon) => void;
  onCreate: () => void;
}

// --- Component ---

export default function CouponList({
  coupons,
  isLoading,
  isError,
  refetch,
  canWrite,
  limit,
  isDeleting,
  deletingCouponId,
  onEdit,
  onDelete,
  onCreate,
}: CouponListProps) {
  const t = useTranslations('admin.coupons');
  const tCommon = useTranslations('common');

  // Client-side sorting
  const { items, requestSort, sortConfig } = useSortableData<Coupon>(coupons);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const { formatCurrency } = useCurrency();

  const downloadColumns = [
    { header: t('columns.code'), dataKey: 'code' },
    { header: t('columns.discountType'), dataKey: 'discountType' },
    { header: t('columns.value'), dataKey: 'discountValue' },
    {
      header: t('columns.minOrder'),
      dataKey: 'minimumOrderAmount',
      formatter: (item: Coupon) =>
        item.minimumOrderAmount != null
          ? formatCurrency(item.minimumOrderAmount)
          : '—',
    },
    {
      header: t('columns.usage'),
      dataKey: 'usageCount',
      formatter: (item: Coupon) =>
        `${item.usageCount}${item.usageLimit != null ? `/${item.usageLimit}` : ''}`,
    },
    {
      header: t('columns.perUserLimit'),
      dataKey: 'perUserLimit',
      formatter: (item: Coupon) =>
        item.perUserLimit === null
          ? t('perUserLimitValues.unlimited')
          : item.perUserLimit === 1
            ? t('perUserLimitValues.oneTime')
            : t('perUserLimitValues.nTimes', { n: item.perUserLimit }),
    },
    {
      header: t('columns.expiryDate'),
      dataKey: 'expiryDate',
      formatter: (item: Coupon) => formatDate(item.expiryDate),
    },
    {
      header: t('columns.status'),
      dataKey: 'isActive',
      formatter: (item: Coupon) =>
        item.isActive ? t('statuses.active') : t('statuses.inactive'),
    },
  ];

  const columnCount = canWrite ? 9 : 8;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ticket className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-semibold">{t('title')}</h1>
        </div>
        {canWrite && (
          <button
            onClick={onCreate}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {t('addCoupon')}
          </button>
        )}
      </div>

      {items.length > 0 && (
        <DownloadButtons
          fileName="coupons_report"
          data={items}
          columns={downloadColumns}
        />
      )}

      <div className="rounded-md border overflow-auto">
        <Table className="min-w-[1000px]">
          <TableHeader className="bg-accent rounded-t-md">
            <TableRow>
              <TableHeaderCell
                label={t('columns.code')}
                sortKey="code"
                requestSort={requestSort}
                sortConfig={sortConfig}
                containerClass="pl-4"
              />
              <TableHeaderCell
                label={t('columns.discountType')}
                sortKey="discountType"
                requestSort={requestSort}
                sortConfig={sortConfig}
              />
              <TableHeaderCell
                label={t('columns.value')}
                sortKey="discountValue"
                requestSort={requestSort}
                sortConfig={sortConfig}
              />
              <TableHeaderCell
                label={t('columns.minOrder')}
                sortKey="minimumOrderAmount"
                requestSort={requestSort}
                sortConfig={sortConfig}
              />
              <TableHeaderCell
                label={t('columns.usage')}
                sortKey="usageCount"
                requestSort={requestSort}
                sortConfig={sortConfig}
              />
              <TableHeaderCell
                label={t('columns.perUserLimit')}
                sortKey="perUserLimit"
                requestSort={requestSort}
                sortConfig={sortConfig}
              />
              <TableHeaderCell
                label={t('columns.expiryDate')}
                sortKey="expiryDate"
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
                  <NoDataFound title={t('noCoupons')} />
                </TableCell>
              </TableRow>
            ) : (
              items.map((coupon) => (
                <TableRow key={coupon._id} className="!h-[55px]">
                  <TableCell className="pl-4 font-medium uppercase">
                    {coupon.code}
                  </TableCell>
                  <TableCell className="capitalize">
                    {t(`discountTypes.${coupon.discountType}`)}
                  </TableCell>
                  <TableCell>
                    {coupon.discountType === 'percentage'
                      ? `${coupon.discountValue}%`
                      : formatCurrency(coupon.discountValue)}
                  </TableCell>
                  <TableCell>
                    {coupon.minimumOrderAmount != null
                      ? formatCurrency(coupon.minimumOrderAmount)
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {coupon.usageCount}
                    {coupon.usageLimit != null ? `/${coupon.usageLimit}` : ''}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {coupon.perUserLimit === null
                      ? t('perUserLimitValues.unlimited')
                      : coupon.perUserLimit === 1
                        ? t('perUserLimitValues.oneTime')
                        : t('perUserLimitValues.nTimes', { n: coupon.perUserLimit })}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(coupon.expiryDate)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        coupon.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                    >
                      {coupon.isActive ? t('statuses.active') : t('statuses.inactive')}
                    </span>
                  </TableCell>
                  {canWrite && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onEdit(coupon)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          aria-label={`${t('editCoupon')} ${coupon.code}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDelete(coupon)}
                          disabled={isDeleting && deletingCouponId === coupon._id}
                          className="rounded p-1.5 text-muted-foreground hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors disabled:opacity-50"
                          aria-label={`${t('deleteCoupon')} ${coupon.code}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="p-3 bg-accent/30 border-t rounded-b-md">
          {/* No pagination — coupons endpoint returns all coupons */}
        </div>
      </div>
    </div>
  );
}
