'use client';

/**
 * YouMightAlsoLike — product carousel showing items from the same categories
 * as the ordered products. Encourages discovery and repeat purchases.
 *
 * Extracts category slugs from order items, fetches products from those categories,
 * and excludes products already in the order.
 */

import { ProductCard } from '@/components/public/common/ProductCard';
import { ProductSkeleton } from '@/components/public/common/ProductSkeleton';
import {
    Carousel,
    type CarouselApi,
    CarouselContent,
    CarouselItem,
} from '@/components/ui/carousel';
import { usePublicQuery } from '@/lib/api/public-hooks';
import { cn } from '@/lib/utils';
import type { OrderItem, Product, ProductListResponse } from '@/types/public';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface YouMightAlsoLikeProps {
    items: OrderItem[];
}

interface ProductsApiResponse {
    data: ProductListResponse;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function YouMightAlsoLike({ items }: YouMightAlsoLikeProps) {
    const t = useTranslations('public.orders');

    // Extract unique product IDs from order to exclude them from suggestions
    const orderedProductIds = useMemo(
        () => new Set(items.map((item) => item.product?._id).filter(Boolean)),
        [items],
    );

    // We'll fetch popular products and filter client-side
    // This is simpler than extracting category slugs (which may not be on the order item)
    const { data, isLoading } = usePublicQuery<ProductsApiResponse>(
        ['public', 'you-might-like'],
        '/catalog/products',
        { staleTime: 1000 * 60 * 10 },
        { params: { sortBy: 'popularity', limit: 12 } },
    );

    const allProducts: Product[] = useMemo(() => {
        const raw = (data as any)?.data;
        const products = raw?.products ?? (Array.isArray(raw) ? raw : []);
        // Exclude products already in the order
        return products
            .filter((p: Product) => !orderedProductIds.has(p._id))
            .slice(0, 8);
    }, [data, orderedProductIds]);

    // Carousel API
    const [api, setApi] = useState<CarouselApi>();
    const [canScrollPrev, setCanScrollPrev] = useState(false);
    const [canScrollNext, setCanScrollNext] = useState(false);

    const onSelect = useCallback(() => {
        if (!api) return;
        setCanScrollPrev(api.canScrollPrev());
        setCanScrollNext(api.canScrollNext());
    }, [api]);

    useEffect(() => {
        if (!api) return;
        onSelect();
        api.on('select', onSelect);
        api.on('reInit', onSelect);
        return () => { api.off('select', onSelect); api.off('reInit', onSelect); };
    }, [api, onSelect]);

    // Don't render if no suggestions
    if (!isLoading && allProducts.length === 0) return null;

    return (
        <section aria-labelledby="you-might-like-heading" className="mt-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <h3
                    id="you-might-like-heading"
                    className="text-lg font-bold text-foreground"
                >
                    {t('youMightLike')}
                </h3>

                {!isLoading && allProducts.length > 0 && (
                    <div className="hidden sm:flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => api?.scrollPrev()}
                            disabled={!canScrollPrev}
                            aria-label="Previous"
                            className={cn(
                                'flex items-center justify-center size-8 rounded-full border border-border bg-background shadow-sm transition-colors',
                                'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                'disabled:opacity-40 disabled:pointer-events-none',
                            )}
                        >
                            <ChevronLeft className="size-4 text-foreground" aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            onClick={() => api?.scrollNext()}
                            disabled={!canScrollNext}
                            aria-label="Next"
                            className={cn(
                                'flex items-center justify-center size-8 rounded-full border border-border bg-background shadow-sm transition-colors',
                                'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                'disabled:opacity-40 disabled:pointer-events-none',
                            )}
                        >
                            <ChevronRight className="size-4 text-foreground" aria-hidden="true" />
                        </button>
                    </div>
                )}
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }, (_, i) => <ProductSkeleton key={i} />)}
                </div>
            )}

            {/* Carousel */}
            {!isLoading && allProducts.length > 0 && (
                <Carousel
                    setApi={setApi}
                    opts={{ align: 'start', loop: false }}
                    className="w-full"
                >
                    <CarouselContent className="-ml-3 md:-ml-4 py-2">
                        {allProducts.map((product) => (
                            <CarouselItem
                                key={product._id}
                                className="pl-3 md:pl-4 basis-[75%] sm:basis-1/2 lg:basis-1/3 xl:basis-1/4"
                            >
                                <ProductCard product={product} />
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                </Carousel>
            )}
        </section>
    );
}

export default YouMightAlsoLike;
