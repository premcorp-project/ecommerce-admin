'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Edit, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';

import { useCurrency } from '@/hooks/use-currency';
import { useQueryParams } from '@/hooks/use-query-params';
import { useSortableData } from '@/hooks/use-sortable-data';
import { useAdminMutation, useAdminQuery } from '@/lib/api/admin-hooks';
import { adminQueryKeys } from '@/lib/api/admin-query-keys';

import { AppButton } from '@/components/shared/AppButton';
import AppPagination from '@/components/shared/AppPagination';
import { DownloadButtons } from '@/components/shared/DownloadButtons';
import { Filter, GlobalFilters } from '@/components/shared/GlobalFilters';
import NoDataFound from '@/components/shared/NoDataFound';
import TableHeaderCell from '@/components/shared/TableHeaderCell';
import { TableShimmer, TLimitType } from '@/components/shared/TableShimmer';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

// --- Types ---

export interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  /** Lowest variant price — displayed as "From £X.XX" */
  minPrice: number;
  category: { _id: string; name: string };
  images: { url: string; publicId: string }[];
  isFeatured: boolean;
  status: 'draft' | 'active' | 'sold';
  createdAt: string;
  updatedAt: string;
}

export interface ProductsPagination {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  perPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface ProductListProps {
  products: Product[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  pagination: ProductsPagination | undefined;
  canWrite: boolean;
  limit: TLimitType;
  onOpenCreate: () => void;
  onOpenEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

// --- Constants ---

const DEFAULT_LIMIT: TLimitType = 25;

// --- Component ---

export default function ProductList({
  products,
  isLoading,
  isError,
  refetch,
  pagination,
  canWrite,
  limit,
  onOpenCreate,
  onOpenEdit,
  onDelete,
}: ProductListProps) {
  const t = useTranslations('admin.products');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();

  // Client-side sorting
  const { items, requestSort, sortConfig } = useSortableData<Product>(products);

  const { formatCurrency } = useCurrency();

  // Status update mutation
  const { mutateAsync: updateStatus, isPending: isUpdatingStatus } =
    useAdminMutation<{ success: boolean }, { _id: string; status: string }>(
      'put',
      (variables) => `/catalog/products/${variables._id}`,
      {
        onSuccess: () => {
          toast.success(t('toast.statusUpdated'));
          queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
        },
        onError: () => {
          toast.error(t('toast.deleteFailed'));
        },
      },
    );

  const handleStatusChange = async (productId: string, newStatus: string) => {
    await updateStatus({ _id: productId, status: newStatus });
  };

  // Status badge helper
  const getStatusBadge = (status: Product['status']) => {
    const badgeClasses: Record<string, string> = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      sold: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return badgeClasses[status] || 'bg-muted text-muted-foreground';
  };

  // Fetch categories tree for filter dropdown
  const { data: categoriesData } = useAdminQuery<any>(
    adminQueryKeys.categories(),
    '/catalog/categories/tree',
  );

  // Fetch tags for filter dropdown
  const { data: tagsData } = useAdminQuery<any>(
    adminQueryKeys.tags(),
    '/catalog/tags',
  );

  const allTags: { _id: string; name: string; slug: string }[] = (tagsData as any)?.data?.tags ?? (tagsData as any)?.tags ?? [];
  const tagOptions: { key: string; value: string }[] = [
    { key: t('filters.allTags'), value: '' },
    ...allTags.map((tag) => ({ key: tag.name, value: tag.slug })),
  ];

  const { getParam } = useQueryParams();
  const selectedCategory = getParam('category') || '';

  // Build parent category options (top-level only)
  const allCategories = categoriesData?.data?.categories ?? categoriesData?.categories ?? [];
  const parentCategories = allCategories.filter((c: { parent: string | null }) => !c.parent);

  const categoryOptions: { key: string; value: string }[] = [
    { key: t('filters.allCategories'), value: '' },
    ...parentCategories.map((cat: { _id: string; name: string }) => ({ key: cat.name, value: cat._id })),
  ];

  // Build subcategory options — only when a parent category is selected
  const subcategoryOptions: { key: string; value: string }[] | null = (() => {
    if (!selectedCategory) return null;
    const selectedParent = parentCategories.find((c: { _id: string }) => c._id === selectedCategory);
    if (!selectedParent || !selectedParent.children || selectedParent.children.length === 0) return null;
    return [
      { key: t('filters.allSubcategories'), value: selectedCategory },
      ...selectedParent.children.map((child: { _id: string; name: string }) => ({ key: child.name, value: child._id })),
    ];
  })();

  // Filter configuration
  const filters: Filter[] = [
    {
      type: 'search',
      paramName: 'search',
      placeholder: t('searchPlaceholder'),
    },
    {
      type: 'select',
      paramName: 'status',
      placeholder: t('filters.allStatuses'),
      options: [
        { key: t('filters.allStatuses'), value: '' },
        { key: t('statuses.active'), value: 'active' },
        { key: t('statuses.draft'), value: 'draft' },
        { key: t('statuses.sold'), value: 'sold' },
      ],
    },
    {
      type: 'select',
      paramName: 'category',
      placeholder: t('filters.allCategories'),
      options: categoryOptions,
    },
    // Subcategory filter — only shown when parent has children
    ...(subcategoryOptions ? [{
      type: 'select' as const,
      paramName: 'subcategory',
      placeholder: t('filters.allSubcategories'),
      options: subcategoryOptions,
    }] : []),
    {
      type: 'select',
      paramName: 'featured',
      placeholder: t('filters.allFeatured'),
      options: [
        { key: t('filters.allFeatured'), value: '' },
        { key: t('filters.featuredOnly'), value: 'true' },
        { key: t('filters.notFeatured'), value: 'false' },
      ],
    },
    {
      type: 'select',
      paramName: 'tags',
      placeholder: t('filters.allTags'),
      options: tagOptions,
    },
  ];

  const downloadColumns = [
    { header: t('columns.name'), dataKey: 'name' },
    { header: t('columns.slug'), dataKey: 'slug' },
    { header: t('columns.price'), dataKey: 'minPrice', formatter: (item: Product) => formatCurrency(item.minPrice) },
    {
      header: t('columns.category'),
      dataKey: 'category',
      formatter: (item: Product) => item.category?.name || '',
    },
    {
      header: t('columns.status'),
      dataKey: 'status',
      formatter: (item: Product) => t(`statuses.${item.status}`),
    },
    {
      header: t('columns.featured'),
      dataKey: 'isFeatured',
      formatter: (item: Product) => (item.isFeatured ? t('featuredYes') : t('featuredNo')),
    },
  ];

  const colCount = canWrite ? 8 : 7;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        {canWrite && (
          <AppButton onClick={onOpenCreate} leftIcon={<Plus size={18} />}>
            {t('addProduct')}
          </AppButton>
        )}
      </div>

      <GlobalFilters filters={filters} />

      {items.length > 0 && (
        <DownloadButtons
          fileName="products_report"
          data={items}
          columns={downloadColumns}
        />
      )}

      <div className="rounded-md border overflow-auto">
        <Table className="min-w-[1000px]">
          <TableHeader className="bg-accent rounded-t-md">
            <TableRow>
              <TableHeaderCell
                label={t('columns.image')}
                sortKey=""
                requestSort={() => {}}
                sortConfig={null}
                containerClass="pl-4"
              />
              <TableHeaderCell
                label={t('columns.name')}
                sortKey="name"
                requestSort={requestSort}
                sortConfig={sortConfig}
                containerClass="pl-4"
              />
              <TableHeaderCell
                label={t('columns.slug')}
                sortKey="slug"
                requestSort={requestSort}
                sortConfig={sortConfig}
              />
              <TableHeaderCell
                label={t('columns.price')}
                sortKey="minPrice"
                requestSort={requestSort}
                sortConfig={sortConfig}
              />
              <TableHeaderCell
                label={t('columns.category')}
                sortKey="category.name"
                requestSort={requestSort}
                sortConfig={sortConfig}
              />
              <TableHeaderCell
                label={t('columns.status')}
                sortKey="status"
                requestSort={requestSort}
                sortConfig={sortConfig}
              />
              <TableHeaderCell
                label={t('columns.featured')}
                sortKey="isFeatured"
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
              <TableShimmer limit={limit} columns={colCount} />
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={colCount} className="text-center py-8">
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
                <TableCell colSpan={colCount} className="text-center">
                  <NoDataFound title={t('noProducts')} />
                </TableCell>
              </TableRow>
            ) : (
              items.map((product) => (
                <TableRow key={product._id} className="!h-[55px]">
                  <TableCell className="pl-4">
                    {product.images?.[0]?.url ? (
                      <img
                        src={product.images[0].url}
                        alt={product.name}
                        className="h-10 w-10 rounded object-contain bg-muted"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">—</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate">{product.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {product.slug}
                  </TableCell>
                  <TableCell className="font-medium">
                    {t('columns.fromPrice', { price: formatCurrency(product.minPrice) })}
                  </TableCell>
                  <TableCell>{product.category?.name || '—'}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadge(product.status)}`}
                    >
                      {t(`statuses.${product.status}`)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        product.isFeatured
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {product.isFeatured ? t('featuredYes') : t('featuredNo')}
                    </span>
                  </TableCell>
                  {canWrite && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                            aria-label={t('columns.actions')}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {product.status === 'draft' && (
                            <DropdownMenuItem
                              className="flex items-center gap-2 cursor-pointer text-green-700 dark:text-green-400"
                              disabled={isUpdatingStatus}
                              onClick={() => handleStatusChange(product._id, 'active')}
                            >
                              {t('actions.publish')}
                            </DropdownMenuItem>
                          )}
                          {product.status === 'active' && (
                            <DropdownMenuItem
                              className="flex items-center gap-2 cursor-pointer text-red-700 dark:text-red-400"
                              disabled={isUpdatingStatus}
                              onClick={() => handleStatusChange(product._id, 'sold')}
                            >
                              {t('actions.markSold')}
                            </DropdownMenuItem>
                          )}
                          {(product.status === 'active' || product.status === 'sold') && (
                            <DropdownMenuItem
                              className="flex items-center gap-2 cursor-pointer text-yellow-700 dark:text-yellow-400"
                              disabled={isUpdatingStatus}
                              onClick={() => handleStatusChange(product._id, 'draft')}
                            >
                              {t('actions.unpublish')}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => onOpenEdit(product)}
                          >
                            <Edit className="h-4 w-4" />
                            {tCommon('edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                            onClick={() => onDelete(product)}
                          >
                            <Trash2 className="h-4 w-4" />
                            {tCommon('delete')}
                          </DropdownMenuItem>
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
    </div>
  );
}
