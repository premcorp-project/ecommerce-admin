'use client';

/**
 * TabbedProductsSection
 *
 * Displays a 3-tab compact product list (Hot Deals / Best Seller / Top Rated)
 * alongside a promotional card. Reuses the featuredProducts cache — no new API call.
 *
 * - All three tabs show the same first 6 products from the featured-products cache.
 * - Loading: 6 skeleton rows
 * - Error: localised error message + retry button
 * - Empty: localised message from public.home.tabs.empty
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 12.2, 13.1, 13.3, 13.4
 */

import { Skeleton } from '@/components/ui/skeleton';
import { usePublicQuery } from '@/lib/api/public-hooks';
import { publicQueryKeys } from '@/lib/api/public-query-keys';
import type { Product, ProductListResponse } from '@/types/public';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { TabbedProductRow } from './TabbedProductRow';
import type { TabbedProductsSectionProps } from './TabbedProductsSection.types';
import { TabbedPromoCard } from './TabbedPromoCard';

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS = ['hotDeals', 'bestSeller', 'topRated'] as const;
type TabKey = (typeof TABS)[number];

// ─── API response envelope ────────────────────────────────────────────────────

interface FeaturedProductsApiResponse {
    data: ProductListResponse;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TabbedProductsSection(_props: TabbedProductsSectionProps) {
    const t = useTranslations('public.home.tabs');
    const tc = useTranslations('public.common');

    const [activeTab, setActiveTab] = useState<TabKey>('hotDeals');

    const { data, isLoading, isError, refetch } = usePublicQuery<FeaturedProductsApiResponse>(
        publicQueryKeys.featuredProducts,
        '/catalog/products',
        {},
        { params: { isFeatured: true, limit: 8 } },
    );

    // Unwrap envelope — same pattern as FeaturedProductsSection
    const rawInner = (data as any)?.data;
    const rawProducts: Product[] = Array.isArray(rawInner?.products)
        ? rawInner.products
        : Array.isArray(rawInner)
          ? rawInner
          : [];
    const allProducts: Product[] = rawProducts.map((p: any) => ({
        ...p,
        _id: p._id ?? p.id ?? '',
    }));

    // Always exactly 6 rows (or fewer if less data available)
    const displayProducts = allProducts.slice(0, 6);

    return (
        <section aria-label="Tabbed product lists" className="py-12 md:py-16">
            <div className="container mx-auto px-4">
                {/* Tab bar */}
                <div className="flex gap-1 border-b border-border mb-6">
                    {TABS.map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => setActiveTab(tab)}
                            className={[
                                'px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                activeTab === tab
                                    ? 'border-b-2 border-primary text-primary'
                                    : 'text-muted-foreground hover:text-foreground',
                            ].join(' ')}
                            aria-selected={activeTab === tab}
                            role="tab"
                        >
                            {t(tab)}
                        </button>
                    ))}
                </div>

                {/* Content grid: 3 cols product list + 1 col promo card */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Left — product list */}
                    <div className="lg:col-span-3">
                        {isLoading && <SkeletonRows />}

                        {isError && !isLoading && (
                            <div
                                role="alert"
                                className="flex flex-col items-center justify-center gap-4 rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-10 text-center"
                            >
                                <AlertCircle className="size-7 text-destructive" aria-hidden="true" />
                                <div>
                                    <p className="font-semibold text-foreground">{tc('errorTitle')}</p>
                                    <p className="mt-1 text-sm text-muted-foreground">{tc('errorHint')}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => refetch()}
                                    className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <RefreshCw className="size-4" aria-hidden="true" />
                                    {tc('errorRetry')}
                                </button>
                            </div>
                        )}

                        {!isLoading && !isError && displayProducts.length === 0 && (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                {t('empty')}
                            </p>
                        )}

                        {!isLoading && !isError && displayProducts.length > 0 && (
                            <div>
                                {displayProducts.map((product) => (
                                    <TabbedProductRow key={product._id} product={product} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right — promo card */}
                    <div className="lg:col-span-1">
                        <TabbedPromoCard />
                    </div>
                </div>
            </div>
        </section>
    );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRows() {
    return (
        <div>
            {Array.from({ length: 6 }).map((_, i) => (
                <div
                    key={i}
                    className="flex items-center gap-3 py-3 border-b border-border"
                >
                    <Skeleton className="size-16 rounded-md shrink-0" />
                    <div className="flex flex-col gap-2 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/3" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export default TabbedProductsSection;
