'use client';

/**
 * NewArrivalsSection — auto-scrolling carousel of the latest products.
 *
 * Uses the shared SectionHeader, CarouselArrow, and ProductCarouselSkeleton primitives.
 */

import { CarouselArrow } from '@/components/public/common/CarouselArrow';
import { ProductCard } from '@/components/public/common/ProductCard';
import { ProductCarouselSkeleton } from '@/components/public/common/ProductCarouselSkeleton';
import { SectionHeader } from '@/components/public/common/SectionHeader';
import {
    Carousel,
    type CarouselApi,
    CarouselContent,
    CarouselItem,
} from '@/components/ui/carousel';
import { usePublicQuery } from '@/lib/api/public-hooks';
import { publicQueryKeys } from '@/lib/api/public-query-keys';
import type { Product, ProductListResponse } from '@/types/public';
import Autoplay from 'embla-carousel-autoplay';
import { AlertCircle, RefreshCw, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { NewArrivalsSectionProps } from './NewArrivalsSection.types';

interface NewArrivalsApiResponse {
    data: ProductListResponse;
}

export function NewArrivalsSection({ title }: NewArrivalsSectionProps) {
    const t = useTranslations('public.home');
    const tc = useTranslations('public.common');

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
        return () => {
            api.off('select', onSelect);
            api.off('reInit', onSelect);
        };
    }, [api, onSelect]);

    const { data, isLoading, isError, refetch } = usePublicQuery<NewArrivalsApiResponse>(
        publicQueryKeys.newArrivals,
        '/catalog/products',
        { staleTime: 1000 * 60 * 5 },
        { params: { sortBy: 'newest', limit: 8 } },
    );

    const rawInner = (data as any)?.data;
    const rawProducts: Product[] = Array.isArray(rawInner?.products)
        ? rawInner.products
        : Array.isArray(rawInner)
          ? rawInner
          : [];
    const products: Product[] = rawProducts.map((p: any) => ({
        ...p,
        _id: p._id ?? p.id ?? '',
    }));

    return (
        <section
            aria-labelledby="new-arrivals-heading"
            className="py-12 md:py-16 lg:py-20"
        >
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <SectionHeader
                    eyebrow={t('newArrivalsBadge')}
                    eyebrowIcon={<Sparkles className="size-3.5" aria-hidden="true" />}
                    title={title ?? t('newArrivalsTitle')}
                    titleId="new-arrivals-heading"
                    viewAllHref="/products?sortBy=newest"
                    viewAllLabel={t('newArrivalsViewAll')}
                    controls={
                        !isLoading && !isError && products.length > 0 ? (
                            <>
                                <CarouselArrow
                                    direction="prev"
                                    onClick={() => api?.scrollPrev()}
                                    disabled={!canScrollPrev}
                                    label={t('newArrivalsPrev')}
                                />
                                <CarouselArrow
                                    direction="next"
                                    onClick={() => api?.scrollNext()}
                                    disabled={!canScrollNext}
                                    label={t('newArrivalsNext')}
                                />
                            </>
                        ) : undefined
                    }
                />

                {isError && (
                    <div
                        role="alert"
                        className="flex flex-col items-center justify-center gap-4 rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-12 text-center"
                    >
                        <AlertCircle className="size-8 text-destructive" aria-hidden="true" />
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

                {isLoading && !isError && <ProductCarouselSkeleton />}

                {!isLoading && !isError && products.length > 0 && (
                    <Carousel
                        setApi={setApi}
                        opts={{ align: 'start', loop: true }}
                        plugins={[autoplayPlugin.current]}
                        className="w-full"
                    >
                        <CarouselContent className="-ml-3 md:-ml-4 py-2">
                            {products.map((product) => (
                                <CarouselItem
                                    key={product._id ?? (product as any).id}
                                    className="pl-3 md:pl-4 basis-[85%] sm:basis-1/2 lg:basis-1/3 xl:basis-1/4"
                                >
                                    <ProductCard product={product} showNewBadge />
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                    </Carousel>
                )}
            </div>
        </section>
    );
}

export default NewArrivalsSection;
