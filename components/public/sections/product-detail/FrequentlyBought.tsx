'use client';

/**
 * FrequentlyBought — Frequently Bought Together section on the product detail page.
 *
 * Accepts an array of raw product IDs from `product.frequentlyBoughtTogether`.
 * Fetches each product separately via GET /catalog/products/:id using useQueries
 * for parallel execution (never sequential).
 *
 * - Returns null when `frequentlyBoughtTogether` is empty
 * - Shows ProductSkeleton placeholders while any query is loading
 * - Renders ProductCard components for loaded products
 * - Horizontal scroll on mobile (overflow-x-auto flex row)
 * - Skips products that failed to load (graceful partial failure)
 *
 * Requirements: 5.11
 */

import { ProductCard } from '@/components/public/common/ProductCard';
import { ProductSkeleton } from '@/components/public/common/ProductSkeleton';
import publicApi from '@/lib/api/public-api';
import type { Product } from '@/types/public';
import { useQueries } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FrequentlyBoughtProps {
    /** Raw product IDs from product.frequentlyBoughtTogether */
    frequentlyBoughtTogether: string[];
}

// ─── API response envelope ────────────────────────────────────────────────────

interface ProductDetailApiResponse {
    success: boolean;
    data: Product;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FrequentlyBought({ frequentlyBoughtTogether }: FrequentlyBoughtProps) {
    const t = useTranslations('public.product');

    // Requirement 5.11: if the array is empty, render nothing
    const hasIds = (frequentlyBoughtTogether ?? []).length > 0;

    // useQueries for parallel fetching — one query per product ID
    // Each query is cached independently under ['public', 'product', id]
    const productQueries = useQueries({
        queries: hasIds
            ? (frequentlyBoughtTogether ?? []).map((id) => ({
                  queryKey: ['public', 'product', id] as const,
                  queryFn: async (): Promise<Product> => {
                      const res = await publicApi.get<ProductDetailApiResponse>(
                          `/catalog/products/${id}`,
                      );
                      return res.data.data;
                  },
                  staleTime: 5 * 60 * 1000, // 5 minutes — product data changes infrequently
                  retry: 1,
              }))
            : [],
    });

    // Return nothing when there are no IDs to fetch
    if (!hasIds) return null;

    const isAnyLoading = productQueries.some((q) => q.isLoading || q.isPending);

    // Collect successfully loaded products (skip failed ones gracefully)
    const loadedProducts = productQueries
        .map((q) => q.data)
        .filter((p): p is Product => p !== undefined && p !== null);

    // If all queries failed and none are loading, render nothing
    if (!isAnyLoading && loadedProducts.length === 0) return null;

    return (
        <section aria-labelledby="fbt-heading" className="py-8">
            {/* Section heading */}
            <h2
                id="fbt-heading"
                className="text-lg font-semibold text-foreground mb-4"
            >
                {t('relatedProducts')}
            </h2>

            {/*
             * Horizontal scroll container — mobile-first.
             * On mobile: overflow-x-auto with flex row so cards scroll horizontally.
             * On desktop (md+): wrap into a grid for a cleaner layout.
             */}
            <div
                className="
                    flex flex-row gap-4
                    overflow-x-auto pb-2
                    md:overflow-x-visible md:pb-0
                    md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
                    scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent
                "
                role="list"
                aria-label={t('relatedProducts')}
            >
                {isAnyLoading
                    ? // Show skeletons for each pending product ID
                      (frequentlyBoughtTogether ?? []).map((id) => (
                          <div
                              key={`skeleton-${id}`}
                              role="listitem"
                              className="shrink-0 w-56 md:w-auto"
                          >
                              <ProductSkeleton />
                          </div>
                      ))
                    : // Render loaded products as ProductCards
                      loadedProducts.map((product) => (
                          <div
                              key={product._id}
                              role="listitem"
                              className="shrink-0 w-56 md:w-auto"
                          >
                              <ProductCard product={product} />
                          </div>
                      ))}
            </div>
        </section>
    );
}

export default FrequentlyBought;
