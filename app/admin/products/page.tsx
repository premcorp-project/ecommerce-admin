'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import toast from 'react-hot-toast';

import ProductForm from '@/components/admin/forms/ProductForm';
import ProductList, { Product, ProductsPagination } from '@/components/admin/products/ProductList';
import { AppAlertDialog } from '@/components/shared/AppAlertDialog';
import { TLimitType } from '@/components/shared/TableShimmer';
import { useQueryParams } from '@/hooks/use-query-params';
import { useAdminMutation, useAdminQuery } from '@/lib/api/admin-hooks';
import { adminQueryKeys } from '@/lib/api/admin-query-keys';
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store';

// --- Types ---

interface ProductsResponse {
  success: boolean;
  data: {
    products: Product[];
    pagination: ProductsPagination;
  };
}

// --- Constants ---

const DEFAULT_LIMIT: TLimitType = 25;

// --- Component ---

export default function ProductsPage() {
  const t = useTranslations('admin.products');
  const queryClient = useQueryClient();
  const { getParam } = useQueryParams();
  const hasWriteAccess = useAdminAuthStore((state) => state.hasWriteAccess);
  const canWrite = hasWriteAccess('catalog');

  // Sheet state for create/edit
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Delete confirmation state
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  // Read filter/pagination state from URL query params
  const page = Number(getParam('page')) || 1;
  const limit = (Number(getParam('limit')) || DEFAULT_LIMIT) as TLimitType;
  const search = getParam('search') || '';
  const status = getParam('status') || '';
  const category = getParam('category') || '';
  const subcategory = getParam('subcategory') || '';
  const featured = getParam('featured') || '';
  const tags = getParam('tags') || '';

  // Use subcategory if selected, otherwise parent category
  const effectiveCategory = subcategory || category;

  // Build query params
  const queryParams = {
    page,
    limit,
    includeAll: true,
    ...(search && { search }),
    ...(status && { status }),
    ...(effectiveCategory && { category: effectiveCategory }),
    ...(featured && { featured: featured }),
    ...(tags && { tags }),
  };

  // Fetch products
  const { data, isLoading, isError, refetch } = useAdminQuery<ProductsResponse>(
    adminQueryKeys.products(queryParams),
    '/catalog/products',
    {
      placeholderData: (previousData) => previousData,
    },
    { params: queryParams },
  );

  const products = data?.data?.products ?? [];
  const pagination = data?.data?.pagination;

  // Delete mutation
  const { mutateAsync: deleteProduct, isPending: isDeleting } =
    useAdminMutation<{ success: boolean; message: string }, { productId: string }>(
      'delete',
      (variables) => `/catalog/products/${variables.productId}`,
      {
        onSuccess: () => {
          toast.success(t('toast.deleteSuccess'));
          queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
          setDeletingProduct(null);
        },
        onError: () => {
          toast.error(t('toast.deleteFailed'));
        },
      },
    );

  const handleDelete = async () => {
    if (!deletingProduct) return;
    await deleteProduct({ productId: deletingProduct._id });
  };

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setSheetOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setSheetOpen(true);
  };

  return (
    <>
      <ProductList
        products={products}
        isLoading={isLoading}
        isError={isError}
        refetch={refetch}
        pagination={pagination}
        canWrite={canWrite}
        limit={limit}
        onOpenCreate={handleOpenCreate}
        onOpenEdit={handleOpenEdit}
        onDelete={setDeletingProduct}
      />

      {/* Delete confirmation dialog */}
      {deletingProduct && (
        <AppAlertDialog
          open={!!deletingProduct}
          onOpenChange={(open) => !open && setDeletingProduct(null)}
          title={t('deleteProduct')}
          subTitle={t('deleteConfirm', { name: deletingProduct.name })}
          description={t('deleteDescription')}
          variant="delete"
          confirmLabel={t('deleteProduct')}
          onConfirm={handleDelete}
          loading={isDeleting}
        />
      )}

      {/* Product create/edit form sheet */}
      <ProductForm
        open={sheetOpen}
        item={editingProduct}
        onSuccess={() => {
          setSheetOpen(false);
          setEditingProduct(null);
        }}
        onClose={() => {
          setSheetOpen(false);
          setEditingProduct(null);
        }}
      />
    </>
  );
}
