'use client';

/**
 * TagGridSection — horizontal slider of fixed-size tag/collection cards.
 *
 * Each card is a 140×140 square with an image (or fallback icon), a bold tag name
 * and product count. The slider is drag-free for tactile horizontal scrolling.
 *
 * Uses the shared SectionHeader + CarouselArrow primitives.
 */

import { CarouselArrow } from '@/components/public/common/CarouselArrow';
import { SectionHeader } from '@/components/public/common/SectionHeader';
import {
    Carousel,
    type CarouselApi,
    CarouselContent,
    CarouselItem,
} from '@/components/ui/carousel';
import { Skeleton } from '@/components/ui/skeleton';
import { usePublicQuery } from '@/lib/api/public-hooks';
import { publicQueryKeys } from '@/lib/api/public-query-keys';
import { cn } from '@/lib/utils';
import type { Tag } from '@/types/public';
import { AlertCircle, RefreshCw, Tag as TagIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { TagGridSectionProps } from './TagGridSection.types';

interface TagsResponse {
    data: { tags: Tag[] };
}

// ─── Tag Card ─────────────────────────────────────────────────────────────────

function TagCard({ tag }: { tag: Tag }) {
    const t = useTranslations('public.home');
    const hasImage = Boolean(tag.image?.url);

    return (
        <Link
            href={`/products?tags=${tag.slug}`}
            className={cn(
                'group flex flex-col items-center justify-center gap-2 w-[140px] h-[140px]',
                'rounded-xl border border-border bg-card px-3',
                'transition-all duration-200',
                'hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            )}
            aria-label={t('tagCardAriaLabel', { name: tag.name })}
        >
            <div className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                {hasImage ? (
                    <Image
                        src={tag.image!.url}
                        alt={tag.name}
                        width={56}
                        height={56}
                        className="object-contain size-full"
                    />
                ) : (
                    <div className="flex size-full items-center justify-center rounded-lg bg-muted/50">
                        <TagIcon className="size-5 text-muted-foreground" aria-hidden="true" />
                    </div>
                )}
            </div>

            <div className="flex flex-col items-center min-w-0 w-full">
                <span className="text-xs font-bold text-foreground text-center line-clamp-2 leading-tight transition-colors group-hover:text-primary">
                    {tag.name}
                </span>
                {typeof tag.productCount === 'number' && (
                    <span className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                        {t('tagProductCount', { count: tag.productCount })}
                    </span>
                )}
            </div>
        </Link>
    );
}

function TagSliderSkeleton() {
    return (
        <div className="flex gap-3 overflow-hidden" aria-hidden="true">
            {Array.from({ length: 8 }).map((_, i) => (
                <div
                    key={i}
                    className="flex w-[140px] h-[140px] shrink-0 flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card px-3"
                >
                    <Skeleton className="size-14 shrink-0 rounded-lg" />
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-2.5 w-12" />
                </div>
            ))}
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TagGridSection({ title, className }: TagGridSectionProps) {
    const t = useTranslations('public.home');

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

    const { data, isLoading, isError, refetch } = usePublicQuery<TagsResponse>(
        publicQueryKeys.tags,
        '/catalog/tags',
    );

    const tags: Tag[] = Array.isArray((data as any)?.data?.tags)
        ? (data as any).data.tags
        : Array.isArray((data as any)?.data)
          ? (data as any).data
          : [];

    return (
        <section
            className={cn('py-12 md:py-16 lg:py-20', className)}
            aria-labelledby="tag-grid-heading"
        >
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <SectionHeader
                    title={title ?? t('tagsTitle')}
                    titleId="tag-grid-heading"
                    viewAllHref="/products"
                    viewAllLabel={t('viewAll')}
                    controls={
                        !isLoading && !isError && tags.length > 0 ? (
                            <>
                                <CarouselArrow
                                    direction="prev"
                                    onClick={() => api?.scrollPrev()}
                                    disabled={!canScrollPrev}
                                    label={t('tagPrev')}
                                />
                                <CarouselArrow
                                    direction="next"
                                    onClick={() => api?.scrollNext()}
                                    disabled={!canScrollNext}
                                    label={t('tagNext')}
                                />
                            </>
                        ) : undefined
                    }
                />

                {isLoading && <TagSliderSkeleton />}

                {isError && !isLoading && (
                    <div className="flex items-center justify-center gap-3 py-6">
                        <AlertCircle className="size-5 text-destructive" aria-hidden="true" />
                        <p className="text-sm text-foreground">{t('tagsError')}</p>
                        <button
                            type="button"
                            onClick={() => refetch()}
                            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                            <RefreshCw className="size-3" aria-hidden="true" />
                            {t('retry')}
                        </button>
                    </div>
                )}

                {!isLoading && !isError && tags.length > 0 && (
                    <Carousel
                        setApi={setApi}
                        opts={{ align: 'start', loop: false, dragFree: true }}
                        className="w-full"
                    >
                        <CarouselContent className="-ml-3 py-2">
                            {tags.map((tag) => (
                                <CarouselItem key={tag._id} className="pl-3 basis-auto">
                                    <TagCard tag={tag} />
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                    </Carousel>
                )}

                {!isLoading && !isError && tags.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                        {t('tagsEmpty')}
                    </p>
                )}
            </div>
        </section>
    );
}

export default TagGridSection;
