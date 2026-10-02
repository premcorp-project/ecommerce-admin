'use client';

/**
 * RelatedProducts — "You Might Also Like" carousel on product detail page.
 *
 * Fetches products from the same category, excludes the current product.
 * Auto-scrolling carousel with same pattern as homepage sections.
 * Hidden if fewer than 2 related products found.
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
import type { Product, ProductListResponse } from '@/types/public';
import Autoplay from 'embla-carousel-autoplay';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RelatedProductsProps {
    categorySlug?: string;
    excludeProductId: string;
}

interface ProductsApiResponse {
    data: ProductListResponse;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RelatedProducts({ categorySlug, excludeProductId }: RelatedProductsProps) {
    const t = useTranslations('public.product');

    const autoplayPlugin = useRef(
        Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true }),
    );

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

    const { data, isLoading } = usePublicQuery<ProductsApiResponse>(
        ['public', 'related-products', categorySlug ?? ''],
        '/catalog/products',
        { staleTime: 1000 * 60 * 10, enabled: !!categorySlug },
        { params: { category: categorySlug, limit: 10 } },
    );

    const products: Product[] = useMemo(() => {
        const raw = (data as any)?.data;
        const all = raw?.products ?? (Array.isArray(raw) ? raw : []);
        return all.filter((p: Product) => p._id !== excludeProductId).slice(0, 8);
    }, [data, excludeProductId]);

    // Don't render if no category or fewer than 2 products
    if (!categorySlug) return null;
    if (!isLoading && products.length < 2) return null;

    return (
        <section aria-labelledby="related-products-heading" className="mt-14 pt-10 border-t border-border">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2
                    id="related-products-heading"
                    className="text-xl font-bold text-foreground"
                >
                    {t('youMightAlsoLike')}
                </h2>

                {!isLoading && products.length > 0 && (
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
            {!isLoading && products.length >= 2 && (
                <Carousel
                    setApi={setApi}
                    opts={{ align: 'start', loop: true }}
                    plugins={[autoplayPlugin.current]}
                    className="w-full"
                >
                    <CarouselContent className="-ml-3 md:-ml-4 py-2">
                        {products.map((product) => (
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

export default RelatedProducts;
