'use client';

/**
 * WishlistGrid — renders the authenticated customer's wishlist as a product grid.
 *
 * - Fetches GET /wishlist
 * - Renders each item as a ProductCard with an overlay remove button
 * - Remove calls DELETE /wishlist/:itemId using the wishlist item `_id`
 * - Uses optimistic removal via TanStack Query onMutate/onError/onSettled
 * - Shows skeleton while loading, EmptyState when empty
 *
 * Requirements: 9.6, 15.6
 */

import { EmptyState } from '@/components/public/common/EmptyState';
import { ProductSkeleton } from '@/components/public/common/ProductSkeleton';
import { usePublicMutation, usePublicQuery } from '@/lib/api/public-hooks';
import { publicQueryKeys } from '@/lib/api/public-query-keys';
import type { WishlistItem } from '@/types/public';
import { useQueryClient } from '@tanstack/react-query';
import { Heart, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WishlistResponse {
  items: WishlistItem[];
}

// ─── WishlistCard ─────────────────────────────────────────────────────────────

interface WishlistCardProps {
  item: WishlistItem;
  onRemove: (itemId: string) => void;
  isRemoving: boolean;
}

function WishlistCard({ item, onRemove, isRemoving }: WishlistCardProps) {
  const t = useTranslations('public.account');
  const tCommon = useTranslations('public.common');
  const { product } = item;

  const primaryImage = product.images[0]?.url ?? null;

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onRemove(item._id);
  };

  return (
    <div className="relative group">
      <Link
        href={`/products/${product.slug}`}
        className="flex flex-col rounded-lg border border-border bg-card overflow-hidden transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={product.name}
      >
        {/* Product image — 4:3 aspect ratio */}
        <div className="relative w-full aspect-[4/3] bg-muted overflow-hidden">
          {primaryImage ? (
            <Image
              src={primaryImage}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex items-center justify-center size-full text-muted-foreground">
              <span className="text-xs">{t('noImage')}</span>
            </div>
          )}

          {/* Remove button — top-right, min 44×44px touch target */}
          <button
            type="button"
            onClick={handleRemove}
            disabled={isRemoving}
            aria-label={t('removeFromWishlist')}
            className="absolute top-2 right-2 z-10 flex items-center justify-center size-11 rounded-full bg-background/80 backdrop-blur-sm border border-border/60 transition-all duration-150 hover:bg-destructive/10 hover:border-destructive/40 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2
              className="size-4 text-muted-foreground group-hover:text-destructive transition-colors"
              aria-hidden="true"
            />
          </button>
        </div>

        {/* Card body */}
        <div className="flex flex-col gap-2 p-4">
          <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
            {product.name}
          </h3>

          {/* Price — wishlist items carry their own pre-calculated effective
              price; minPrice is shown with strikethrough only when there is an
              active discount (effectivePrice < minPrice). */}
          {item.effectivePrice != null ? (
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold text-foreground">
                £{item.effectivePrice.toFixed(2)}
              </span>
              {item.minPrice != null && item.minPrice > item.effectivePrice && (
                <span className="text-xs text-muted-foreground line-through">
                  £{item.minPrice.toFixed(2)}
                </span>
              )}
            </div>
          ) : item.minPrice != null ? (
            <span className="text-sm font-medium text-foreground">
              <span className="text-xs font-normal text-muted-foreground me-1">From</span>
              £{item.minPrice.toFixed(2)}
            </span>
          ) : (
            <span className="text-xs text-primary font-medium">{t('viewForPrice')}</span>
          )}
        </div>
      </Link>
    </div>
  );
}

// ─── WishlistGrid ─────────────────────────────────────────────────────────────

export function WishlistGrid() {
  const t = useTranslations('public.account');
  const tCommon = useTranslations('public.common');
  const queryClient = useQueryClient();

  // Fetch wishlist
  const { data: raw, isLoading, isError } = usePublicQuery<WishlistResponse>(
    publicQueryKeys.wishlist,
    '/wishlist',
  );

  // Unwrap response envelope — backend returns { success, data: { items } }
  const items: WishlistItem[] =
    (raw as any)?.data?.items ?? (raw as any)?.items ?? [];

  // Remove mutation with optimistic update
  const removeMutation = usePublicMutation<unknown, { itemId: string }>(
    'delete',
    (vars) => `/wishlist/${vars.itemId}`,
    {
      onMutate: async ({ itemId }) => {
        // 1. Cancel any outgoing refetches
        await queryClient.cancelQueries({ queryKey: publicQueryKeys.wishlist });

        // 2. Snapshot the previous value
        const previousWishlist = queryClient.getQueryData(publicQueryKeys.wishlist);

        // 3. Optimistically remove the item from the cache
        queryClient.setQueryData(publicQueryKeys.wishlist, (old: any) => {
          if (!old) return old;
          const unwrapped = old?.data ?? old;
          const updatedItems = (unwrapped?.items ?? []).filter(
            (item: WishlistItem) => item._id !== itemId,
          );
          // Preserve the response envelope shape
          if (old?.data) {
            return { ...old, data: { ...old.data, items: updatedItems } };
          }
          return { ...old, items: updatedItems };
        });

        // 4. Return context with snapshot for rollback
        return { previousWishlist };
      },
      onError: (_err, _vars, context: any) => {
        // Roll back to snapshot
        if (context?.previousWishlist !== undefined) {
          queryClient.setQueryData(publicQueryKeys.wishlist, context.previousWishlist);
        }
        toast.error(t('wishlistError'));
      },
      onSettled: () => {
        // Always refetch to sync with server
        queryClient.invalidateQueries({ queryKey: publicQueryKeys.wishlist });
      },
    },
  );

  const handleRemove = async (itemId: string) => {
    try {
      await removeMutation.mutateAsync({ itemId });
      toast.success(t('wishlistRemoved'));
    } catch {
      // onError already showed the toast — swallow the rejection
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-6">{t('wishlistTitle')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-6">{t('wishlistTitle')}</h2>
        <EmptyState
          icon={<Heart className="size-8" />}
          title={t('wishlistError')}
          description={tCommon('errorHint')}
          ctaLabel={tCommon('tryAgain')}
          ctaHref="#"
        />
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-6">{t('wishlistTitle')}</h2>
        <EmptyState
          icon={<Heart className="size-8" />}
          title={t('noWishlist')}
          description={t('noWishlistHint')}
          ctaLabel={t('browseProducts')}
          ctaHref="/products"
        />
      </div>
    );
  }

  // ── Wishlist grid ──────────────────────────────────────────────────────────
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground">{t('wishlistTitle')}</h2>
        <span className="text-sm text-muted-foreground">
          {items.length === 1
            ? t('itemCount', { count: 1 })
            : t('itemCountPlural', { count: items.length })}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.map((item) => (
          <WishlistCard
            key={item._id}
            item={item}
            onRemove={handleRemove}
            isRemoving={
              removeMutation.isPending &&
              (removeMutation.variables as any)?.itemId === item._id
            }
          />
        ))}
      </div>
    </div>
  );
}

export default WishlistGrid;
