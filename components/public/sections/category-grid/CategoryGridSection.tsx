'use client';

/**
 * CategoryGridSection — horizontally scrollable row of category cards.
 *
 * Each card: rounded thumbnail-sized image, category name. Links to
 * /products?category={slug}.
 *
 * Uses the shared SectionHeader + CarouselArrow primitives so the visual
 * rhythm matches the rest of the homepage.
 *
 * Requirements: 3.4, 4.1–4.8
 */

import { CarouselArrow } from '@/components/public/common/CarouselArrow';
import { SectionHeader } from '@/components/public/common/SectionHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { usePublicQuery } from '@/lib/api/public-hooks';
import { publicQueryKeys } from '@/lib/api/public-query-keys';
import { cn } from '@/lib/utils';
import type { Category } from '@/types/public';
import { AlertCircle, RefreshCw, Tag } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import { useRef } from 'react';
import type { CategoryGridSectionProps } from './CategoryGridSection.types';

interface CategoriesResponse {
    data: Category[];
}

// ─── Category Card ────────────────────────────────────────────────────────────

function CategoryCard({ category }: { category: Category }) {
    const t = useTranslations('public.home');
    const hasImage = Boolean(category.image?.url);

    return (
        <Link
            href={`/products?category=${category.slug}`}
            className={cn(
                'group flex flex-col items-center justify-center gap-3',
                'rounded-xl border border-border bg-card p-5 text-center',
                'min-w-[140px] w-[140px] h-[160px] shrink-0',
                'transition-all duration-200',
                'hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            )}
            aria-label={t('categoryCardAriaLabel', { name: category.name })}
        >
            <div className="flex size-16 items-center justify-center rounded-full bg-muted/40 transition-all duration-200 group-hover:bg-primary/10 group-hover:scale-105">
                {hasImage ? (
                    <Image
                        src={category.image!.url}
                        alt={category.name}
                        width={56}
                        height={56}
                        className="size-14 object-contain"
                    />
                ) : (
                    <Tag className="size-6 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden="true" />
                )}
            </div>

            <span className="text-sm font-semibold leading-tight line-clamp-2 text-foreground transition-colors group-hover:text-primary">
                {category.name}
            </span>
        </Link>
    );
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function CategoryRowSkeleton() {
    return (
        <div className="flex gap-4 overflow-hidden" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="min-w-[140px] w-[140px] h-[160px] rounded-xl shrink-0" />
            ))}
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CategoryGridSection({ title, className }: CategoryGridSectionProps) {
    const t = useTranslations('public.home');
    const scrollRef = useRef<HTMLDivElement>(null);

    const { data, isLoading, isError, refetch } = usePublicQuery<CategoriesResponse>(
        publicQueryKeys.categories,
        '/catalog/categories',
    );

    const rawData = (data as unknown as { data: unknown })?.data;
    const categories: Category[] = Array.isArray(rawData)
        ? rawData
        : Array.isArray((rawData as any)?.categories)
          ? (rawData as any).categories
          : [];
    const topLevel = categories.filter((c) => !c.parent);

    const scrollBy = (direction: 'prev' | 'next') => {
        if (!scrollRef.current) return;
        const amount = 320;
        scrollRef.current.scrollBy({
            left: direction === 'prev' ? -amount : amount,
            behavior: 'smooth',
        });
    };

    return (
        <section
            className={cn('py-12 md:py-16 lg:py-20', className)}
            aria-labelledby="category-grid-heading"
        >
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <SectionHeader
                    title={title ?? t('categoriesTitle')}
                    titleId="category-grid-heading"
                    viewAllHref="/products"
                    viewAllLabel={t('viewAll')}
                    controls={
                        !isLoading && !isError && topLevel.length > 0 ? (
                            <>
                                <CarouselArrow
                                    direction="prev"
                                    onClick={() => scrollBy('prev')}
                                    label={t('categoryPrev')}
                                />
                                <CarouselArrow
                                    direction="next"
                                    onClick={() => scrollBy('next')}
                                    label={t('categoryNext')}
                                />
                            </>
                        ) : undefined
                    }
                />

                {isLoading && <CategoryRowSkeleton />}

                {isError && !isLoading && (
                    <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                        <AlertCircle className="size-8 text-destructive" aria-hidden="true" />
                        <div className="flex flex-col gap-1">
                            <p className="font-semibold text-foreground">{t('categoriesError')}</p>
                            <p className="text-sm text-muted-foreground">{t('categoriesErrorHint')}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => refetch()}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <RefreshCw className="size-4" aria-hidden="true" />
                            {t('retry')}
                        </button>
                    </div>
                )}

                {!isLoading && !isError && topLevel.length > 0 && (
                    <div
                        ref={scrollRef}
                        className="flex gap-4 overflow-x-auto overflow-y-visible scroll-smooth py-2 -mx-4 px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                    >
                        {topLevel.map((category) => (
                            <CategoryCard key={category._id} category={category} />
                        ))}
                    </div>
                )}

                {!isLoading && !isError && topLevel.length === 0 && (
                    <p className="py-12 text-center text-sm text-muted-foreground">
                        {t('categoriesEmpty')}
                    </p>
                )}
            </div>
        </section>
    );
}

export default CategoryGridSection;
