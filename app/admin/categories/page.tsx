'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { useAdminMutation, useAdminQuery } from '@/lib/api/admin-hooks';
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store';

import CategoryList, {
    Category,
    FlatCategory,
    flattenCategories,
} from '@/components/admin/categories/CategoryList';
import CategoryForm from '@/components/admin/forms/CategoryForm';
import { AppAlertDialog } from '@/components/shared/AppAlertDialog';

// --- Types ---

interface CategoriesResponse {
  success: boolean;
  categories: Category[];
  data?: { categories: Category[] };
}

// --- Component ---

export default function CategoriesPage() {
  const t = useTranslations('admin.categories');
  const queryClient = useQueryClient();
  const hasWriteAccess = useAdminAuthStore((state) => state.hasWriteAccess);
  const canWrite = hasWriteAccess('catalog');

  // Sheet state for create/edit
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Delete confirmation state
  const [deletingCategory, setDeletingCategory] = useState<FlatCategory | null>(null);

  // Toggle state
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Fetch categories tree (include inactive for admin management)
  const { data, isLoading, isError, refetch } =
    useAdminQuery<CategoriesResponse>(
      ['admin', 'categories', 'tree', 'all'],
      '/catalog/categories/tree',
      undefined,
      { params: { includeInactive: true } },
    );

  const categories = useMemo(() => {
    const raw = (data as any)?.data?.categories ?? data?.categories ?? [];
    return raw as Category[];
  }, [data]);

  const flatItems = useMemo(() => flattenCategories(categories), [categories]);

  // Delete mutation
  const { mutateAsync: deleteCategory, isPending: isDeleting } =
    useAdminMutation<{ success: boolean; message: string }, { id: string }>(
      'delete',
      (variables) => `/catalog/categories/${variables.id}`,
      {
        onSuccess: () => {
          toast.success(t('toast.deleteSuccess'));
          queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
          queryClient.invalidateQueries({ queryKey: ['admin', 'categories', 'tree'] });
          queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
        },
        onError: (error) => {
          const message = (error as any)?.response?.data?.message;
          toast.error(message || t('toast.deleteFailed'));
        },
      },
    );

  // Toggle active status mutation
  const { mutateAsync: toggleActive, isPending: isToggling } =
    useAdminMutation<{ success: boolean }, { id: string; isActive: boolean }>(
      'put',
      (variables) => `/catalog/categories/${variables.id}`,
      {
        onSuccess: () => {
          toast.success(t('toast.statusUpdated'));
          queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
          queryClient.invalidateQueries({ queryKey: ['admin', 'categories', 'tree'] });
          queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
        },
        onError: () => {
          toast.error(t('toast.statusUpdateFailed'));
        },
      },
    );

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    setTogglingId(id);
    try {
      await toggleActive({ id, isActive: !currentActive });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;
    try {
      await deleteCategory({ id: deletingCategory._id });
      setDeletingCategory(null);
    } catch {
      // error toast is handled by the mutation's onError callback
    }
  };

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setSheetOpen(true);
  };

  const handleOpenEdit = (category: FlatCategory) => {
    setEditingCategory(category);
    setSheetOpen(true);
  };

  return (
    <>
      <CategoryList
        flatItems={flatItems}
        isLoading={isLoading}
        isError={isError}
        refetch={refetch}
        canWrite={canWrite}
        isToggling={isToggling}
        togglingId={togglingId}
        onToggleActive={handleToggleActive}
        onOpenCreate={handleOpenCreate}
        onOpenEdit={handleOpenEdit}
        onDelete={setDeletingCategory}
      />

      {/* Delete confirmation dialog */}
      {deletingCategory && (
        <AppAlertDialog
          open={!!deletingCategory}
          onOpenChange={(open) => !open && setDeletingCategory(null)}
          title={t('deleteCategory')}
          subTitle={t('deleteConfirm', { name: deletingCategory.name })}
          description={t('deleteDescription')}
          variant="delete"
          confirmLabel={t('deleteCategory')}
          onConfirm={handleDelete}
          loading={isDeleting}
        />
      )}

      {/* Multi-step category form (Sheet is self-contained inside CategoryForm) */}
      <CategoryForm
        open={sheetOpen}
        item={editingCategory}
        onSuccess={() => setSheetOpen(false)}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
}
