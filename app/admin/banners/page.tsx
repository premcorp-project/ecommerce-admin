'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Image as ImageIcon, Layout, Megaphone, MousePointerClick } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { useAdminMutation, useAdminQuery } from '@/lib/api/admin-hooks';
import { adminQueryKeys } from '@/lib/api/admin-query-keys';
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store';

import BannerList, { Banner } from '@/components/admin/banners/BannerList';
import BannerForm from '@/components/admin/forms/BannerForm';
import { AppAlertDialog } from '@/components/shared/AppAlertDialog';
import { TLimitType } from '@/components/shared/TableShimmer';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// --- Types ---

interface BannersResponse {
  success: boolean;
  data: {
    banners: Banner[];
  };
}

// --- Constants ---

const DEFAULT_LIMIT: TLimitType = 25;

const PLACEMENTS = ['hero', 'promo', 'category', 'popup'] as const;

// --- Component ---

export default function BannersPage() {
  const t = useTranslations('admin.banners');
  const queryClient = useQueryClient();
  const hasWriteAccess = useAdminAuthStore((state) => state.hasWriteAccess);
  const canWrite = hasWriteAccess('catalog');

  // Sheet state for create/edit
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [deletingBanner, setDeletingBanner] = useState<Banner | null>(null);

  // Fetch all banners
  const { data, isLoading, isError, refetch } = useAdminQuery<BannersResponse>(
    adminQueryKeys.banners(),
    '/banners',
  );

  const allBanners = data?.data?.banners ?? [];

  // Filter banners by placement
  const bannersByPlacement = useMemo(() => {
    const grouped: Record<string, Banner[]> = { hero: [], promo: [], category: [], popup: [] };
    allBanners.forEach((b) => {
      const placement = (b as any).placement || 'hero';
      if (grouped[placement]) grouped[placement].push(b);
      else grouped.hero.push(b);
    });
    return grouped;
  }, [allBanners]);

  // Delete mutation
  const { mutateAsync: deleteBanner, isPending: isDeleting } = useAdminMutation<
    { success: boolean; message: string },
    string
  >('delete', (bannerId) => `/banners/${bannerId}`, {
    onSuccess: () => {
      toast.success(t('toast.deleteSuccess'));
      queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] });
    },
    onError: () => {
      toast.error(t('toast.deleteFailed'));
    },
  });

  const handleDelete = async () => {
    if (!deletingBanner) return;
    await deleteBanner(deletingBanner._id);
    setDeletingBanner(null);
  };

  const handleCreate = () => {
    setEditingBanner(null);
    setSheetOpen(true);
  };

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setSheetOpen(true);
  };

  return (
    <>
      <div className="p-4 space-y-6">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>

        <Tabs defaultValue="hero" className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto flex-wrap gap-0">
            <TabsTrigger
              value="hero"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium"
            >
              <ImageIcon className="size-4 mr-2" />
              {t('tabs.hero')}
              <span className="ml-1.5 text-xs text-muted-foreground">({bannersByPlacement.hero.length})</span>
            </TabsTrigger>
            <TabsTrigger
              value="promo"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium"
            >
              <Layout className="size-4 mr-2" />
              {t('tabs.promo')}
              <span className="ml-1.5 text-xs text-muted-foreground">({bannersByPlacement.promo.length})</span>
            </TabsTrigger>
            <TabsTrigger
              value="category"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium"
            >
              <Megaphone className="size-4 mr-2" />
              {t('tabs.category')}
              <span className="ml-1.5 text-xs text-muted-foreground">({bannersByPlacement.category.length})</span>
            </TabsTrigger>
            <TabsTrigger
              value="popup"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium"
            >
              <MousePointerClick className="size-4 mr-2" />
              {t('tabs.popup')}
              <span className="ml-1.5 text-xs text-muted-foreground">({bannersByPlacement.popup.length})</span>
            </TabsTrigger>
          </TabsList>

          {PLACEMENTS.map((placement) => (
            <TabsContent key={placement} value={placement} className="mt-4">
              <BannerList
                banners={bannersByPlacement[placement]}
                isLoading={isLoading}
                isError={isError}
                refetch={refetch}
                canWrite={canWrite}
                limit={DEFAULT_LIMIT}
                isDeleting={isDeleting}
                deletingBannerId={deletingBanner?._id ?? null}
                onEdit={handleEdit}
                onDelete={setDeletingBanner}
                onCreate={handleCreate}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Delete confirmation dialog */}
      {deletingBanner && (
        <AppAlertDialog
          open={!!deletingBanner}
          onOpenChange={(open) => !open && setDeletingBanner(null)}
          title={t('deleteBanner')}
          subTitle={t('deleteConfirm', { title: deletingBanner.title })}
          description={t('deleteDescription')}
          variant="delete"
          confirmLabel={t('deleteBanner')}
          onConfirm={handleDelete}
          loading={isDeleting}
        />
      )}

      {/* Create/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {editingBanner ? t('editBanner') : t('addBanner')}
            </SheetTitle>
            <SheetDescription>
              {editingBanner ? t('editDescription') : t('addDescription')}
            </SheetDescription>
          </SheetHeader>
          <BannerForm
            item={editingBanner}
            onSuccess={() => setSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
