'use client';

import { Image, Pencil, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useSortableData } from '@/hooks/use-sortable-data';

import { AppButton } from '@/components/shared/AppButton';
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

export interface Banner {
  _id: string;
  title: string;
  image?: { url: string; publicId: string } | string;
  link?: string;
  isActive: boolean;
  position: number;
  createdAt: string;
}

interface BannerListProps {
  banners: Banner[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  canWrite: boolean;
  limit: TLimitType;
  isDeleting: boolean;
  deletingBannerId: string | null;
  onEdit: (banner: Banner) => void;
  onDelete: (banner: Banner) => void;
  onCreate: () => void;
}

// --- Component ---

export default function BannerList({
  banners,
  isLoading,
  isError,
  refetch,
  canWrite,
  limit,
  isDeleting,
  deletingBannerId,
  onEdit,
  onDelete,
  onCreate,
}: BannerListProps) {
  const t = useTranslations('admin.banners');
  const tCommon = useTranslations('common');

  // Client-side sorting
  const { items, requestSort, sortConfig } = useSortableData<Banner>(banners);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const downloadColumns = [
    { header: t('columns.title'), dataKey: 'title' },
    { header: t('columns.link'), dataKey: 'link' },
    { header: t('columns.position'), dataKey: 'position' },
    {
      header: t('columns.status'),
      dataKey: 'isActive',
      formatter: (item: Banner) =>
        item.isActive ? t('statuses.active') : t('statuses.inactive'),
    },
    {
      header: t('columns.created'),
      dataKey: 'createdAt',
      formatter: (item: Banner) => formatDate(item.createdAt),
    },
  ];

  const columnCount = canWrite ? 7 : 6;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-semibold">{t('title')}</h1>
        </div>
        {canWrite && (
          <AppButton onClick={onCreate} leftIcon={<Plus size={18} />}>
            {t('addBanner')}
          </AppButton>
        )}
      </div>

      {items.length > 0 && (
        <DownloadButtons
          fileName="banners_report"
          data={items}
          columns={downloadColumns}
        />
      )}

      <div className="rounded-md border overflow-auto">
        <Table className="min-w-[800px]">
          <TableHeader className="bg-accent rounded-t-md">
            <TableRow>
              <TableHeaderCell
                label={t('columns.title')}
                sortKey="title"
                requestSort={requestSort}
                sortConfig={sortConfig}
                containerClass="pl-4"
              />
              <TableHeaderCell
                label={t('columns.image')}
                sortKey=""
                requestSort={() => {}}
                sortConfig={null}
              />
              <TableHeaderCell
                label={t('columns.link')}
                sortKey="link"
                requestSort={requestSort}
                sortConfig={sortConfig}
              />
              <TableHeaderCell
                label={t('columns.position')}
                sortKey="position"
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
                label={t('columns.created')}
                sortKey="createdAt"
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
                  <NoDataFound title={t('noBanners')} />
                </TableCell>
              </TableRow>
            ) : (
              items.map((banner) => (
                <TableRow key={banner._id} className="!h-[55px]">
                  <TableCell className="pl-4 font-medium">
                    {banner.title}
                  </TableCell>
                  <TableCell>
                    {banner.image ? (
                      <img
                        src={
                          typeof banner.image === 'string'
                            ? banner.image
                            : banner.image.url
                        }
                        alt={banner.title}
                        className="h-10 w-16 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-16 items-center justify-center rounded bg-muted">
                        <Image size={16} className="text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {banner.link || '—'}
                  </TableCell>
                  <TableCell className="text-sm">{banner.position}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        banner.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                    >
                      {banner.isActive
                        ? t('statuses.active')
                        : t('statuses.inactive')}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(banner.createdAt)}
                  </TableCell>
                  {canWrite && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onEdit(banner)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          aria-label={`${tCommon('edit')} ${banner.title}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(banner)}
                          disabled={isDeleting && deletingBannerId === banner._id}
                          className="rounded p-1.5 text-muted-foreground hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors disabled:opacity-50"
                          aria-label={`${tCommon('delete')} ${banner.title}`}
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
      </div>
    </div>
  );
}
