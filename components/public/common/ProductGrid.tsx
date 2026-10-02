'use client';

/**
 * ProductGrid — responsive grid of ProductCards with loading and empty states.
 *
 * Grid breakpoints: 1 col → sm:2 cols → lg:3 cols → xl:4 cols
 *
 * Loading state: renders `skeletonCount` ProductSkeleton placeholders.
 * Empty state: renders EmptyState ONLY when products array is empty AND not loading.
 *   NEVER renders EmptyState when products are present.
 *
 * Requirements: 13.3, 14.4
 */

import type { Product } from '@/types/public';
import { PackageSearch } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { EmptyState } from './EmptyState';
import { ProductCard } from './ProductCard';
import { ProductSkeleton } from './ProductSkeleton';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProductGridProps {
    /** Array of products to render */
    products: Product[];
    /** When true, renders skeleton placeholders instead of product cards */
    isLoading: boolean;
    /** Number of skeleton cards to show while loading — defaults to 8 */
    skeletonCount?: number;
    /** Override the empty state title */
    emptyTitle?: string;
    /** Override the empty state description */
    emptyDescription?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProductGrid({
    products,
    isLoading,
    skeletonCount = 8,
    emptyTitle,
    emptyDescription,
}: ProductGridProps) {
    const t = useTranslations('public.products');

    // Loading state — show skeleton cards
    if (isLoading) {
        return (
            <div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6"
                aria-busy="true"
                aria-label={t('loading')}
            >
                {Array.from({ length: skeletonCount }, (_, i) => (
                    <ProductSkeleton key={i} />
                ))}
            </div>
        );
    }

    // Empty state — only when NOT loading AND products array is empty
    if (products.length === 0) {
        return (
            <EmptyState
                icon={<PackageSearch className="size-8" aria-hidden="true" />}
                title={emptyTitle ?? t('noResults')}
                description={emptyDescription ?? t('noResultsHint')}
            />
        );
    }

    // Products present — render grid (NEVER render EmptyState here)
    return (
        <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6"
            aria-label={t('resultsCount', { count: products.length })}
        >
            {products.map((product) => (
                <ProductCard key={product._id ?? (product as any).id} product={product} />
            ))}
        </div>
    );
}

export default ProductGrid;
