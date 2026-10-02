'use client';

import { Edit, ImageOff, Plus, Trash2 } from 'lucide-react';

import { useTranslations } from 'next-intl';

import { AppButton } from '@/components/shared/AppButton';
import { DownloadButtons } from '@/components/shared/DownloadButtons';
import NoDataFound from '@/components/shared/NoDataFound';
import TableHeaderCell from '@/components/shared/TableHeaderCell';
import { TableShimmer } from '@/components/shared/TableShimmer';
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

// --- Types ---

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: { url: string; publicId: string } | null;
  parent: string | null;
  children?: Category[];
  isActive: boolean;
  createdAt: string;
}

export interface FlatCategory extends Category {
  depth: number;
  parentName?: string;
}

interface CategoryListProps {
  flatItems: FlatCategory[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  canWrite: boolean;
  isToggling: boolean;
  togglingId: string | null;
  onToggleActive: (id: string, currentActive: boolean) => void;
  onOpenCreate: () => void;
  onOpenEdit: (category: FlatCategory) => void;
  onDelete: (category: FlatCategory) => void;
}

// --- Helpers ---

export function flattenCategories(categories: Category[]): FlatCategory[] {
  const result: FlatCategory[] = [];
  for (const cat of categories) {
    result.push({ ...cat, depth: 0 });
    if (cat.children?.length) {
      for (const child of cat.children) {
        result.push({ ...child, depth: 1, parentName: cat.name });
      }
    }
  }
  return result;
}

// --- Component ---

export default function CategoryList({
  flatItems,
  isLoading,
  isError,
  refetch,
  canWrite,
  isToggling,
  togglingId,
  onToggleActive,
  onOpenCreate,
  onOpenEdit,
  onDelete,
}: CategoryListProps) {
  const t = useTranslations('admin.categories');
  const tCommon = useTranslations('common');

  const columnCount = canWrite ? 7 : 6;

  const downloadColumns = [
    { header: t('columns.name'), dataKey: 'name' },
    { header: t('columns.slug'), dataKey: 'slug' },
    {
      header: t('columns.parent'),
      dataKey: 'parentName',
      formatter: (item: FlatCategory) => item.parentName ?? '—',
    },
    {
      header: t('columns.status'),
      dataKey: 'isActive',
      formatter: (item: FlatCategory) =>
        item.isActive ? t('statuses.active') : t('statuses.inactive'),
    },
    {
      header: t('columns.created'),
      dataKey: 'createdAt',
      formatter: (item: FlatCategory) =>
        new Date(item.createdAt).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
    },
  ];

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        {canWrite && (
          <AppButton onClick={onOpenCreate} leftIcon={<Plus size={18} />}>
            {t('addCategory')}
          </AppButton>
        )}
      </div>

      {flatItems.length > 0 && (
        <DownloadButtons
          fileName="categories_report"
          data={flatItems}
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
                requestSort={() => {}}
                sortConfig={null}
                containerClass="pl-4"
              />
              <TableHeaderCell
                label={t('columns.image')}
                sortKey=""
                requestSort={() => {}}
                sortConfig={null}
              />
              <TableHeaderCell
                label={t('columns.slug')}
                sortKey="slug"
                requestSort={() => {}}
                sortConfig={null}
              />
              <TableHeaderCell
                label={t('columns.parent')}
                sortKey="parent"
                requestSort={() => {}}
                sortConfig={null}
              />
              <TableHeaderCell
                label={t('columns.status')}
                sortKey="isActive"
                requestSort={() => {}}
                sortConfig={null}
              />
              <TableHeaderCell
                label={t('columns.created')}
                sortKey="createdAt"
                requestSort={() => {}}
                sortConfig={null}
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
              <TableShimmer limit={10} columns={columnCount} />
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
            ) : flatItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="text-center">
                  <NoDataFound title={t('noCategories')} />
                </TableCell>
              </TableRow>
            ) : (
              flatItems.map((category) => (
                <TableRow key={category._id} className="!h-[55px]">
                  <TableCell
                    className={`font-medium ${category.depth === 1 ? 'pl-10' : 'pl-4'}`}
                  >
                    {category.depth === 1 && (
                      <span className="text-muted-foreground mr-1">↳</span>
                    )}
                    {category.name}
                  </TableCell>
                  <TableCell>
                    {category.image?.url ? (
                      <img
                        src={category.image.url}
                        alt={category.name}
                        className="h-9 w-9 rounded-md object-cover border"
                      />
                    ) : (
                      <span className="flex h-9 w-9 items-center justify-center rounded-md border bg-muted">
                        <ImageOff size={14} className="text-muted-foreground" aria-hidden="true" />
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {category.slug}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {category.parentName ?? '—'}
                  </TableCell>
                  <TableCell>
                    {canWrite ? (
                      <button
                        type="button"
                        disabled={isToggling && togglingId === category._id}
                        onClick={() =>
                          onToggleActive(category._id, category.isActive)
                        }
                        className="cursor-pointer"
                        aria-label={`${t('toggleStatus')} ${category.name}`}
                      >
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-opacity ${
                            category.isActive
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          } ${isToggling && togglingId === category._id ? 'opacity-50' : 'hover:opacity-80'}`}
                        >
                          {category.isActive
                            ? t('statuses.active')
                            : t('statuses.inactive')}
                        </span>
                      </button>
                    ) : (
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          category.isActive
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {category.isActive
                          ? t('statuses.active')
                          : t('statuses.inactive')}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(category.createdAt).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </TableCell>
                  {canWrite && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onOpenEdit(category)}
                          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                          aria-label={`${tCommon('edit')} ${category.name}`}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => onDelete(category)}
                          className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 transition-colors"
                          aria-label={`${tCommon('delete')} ${category.name}`}
                        >
                          <Trash2 size={16} />
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
