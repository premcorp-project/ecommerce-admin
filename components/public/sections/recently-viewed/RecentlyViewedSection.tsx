'use client';

/**
 * RecentlyViewedSection — shows products the user has recently viewed.
 *
 * Data source: localStorage key 'chemibuild_recently_viewed'.
 * The product detail page writes to this store when a product is viewed.
 * This section reads from it and renders a carousel of product cards.
 *
 * - Only renders if there are items in localStorage (hidden otherwise)
 * - No API call — uses denormalised product data stored at view time
 * - Carousel with same pattern as Featured/Best Sellers
 * - Max 8 items stored, FIFO eviction
 */

import { ProductCard } from '@/components/public/common/ProductCard';
import {
    Carousel,
    type CarouselApi,
    CarouselContent,
    CarouselItem,
} from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import type { Product } from '@/types/public';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import type { RecentlyViewedSectionProps } from './RecentlyViewedSection.types';

// ─── LocalStorage key ─────────────────────────────────────────────────────────

const STORAGE_KEY = 'chemibuild_recently_viewed';
const MAX_ITEMS = 8;
const EXPIRY_DAYS = 7;

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecentlyViewedItem {
    product: Product;
    viewedAt: number; // timestamp in ms
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRawItems(): RecentlyViewedItem[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);

        // Migration: handle old format (plain Product[]) → new format with viewedAt
        if (Array.isArray(parsed) && parsed.length > 0 && !('viewedAt' in parsed[0])) {
            const migrated: RecentlyViewedItem[] = (parsed as Product[]).map((p) => ({
                product: p,
                viewedAt: Date.now(),
            }));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
            return migrated;
        }

        return parsed as RecentlyViewedItem[];
    } catch {
        return [];
    }
}

function filterExpired(items: RecentlyViewedItem[]): RecentlyViewedItem[] {
    const cutoff = Date.now() - EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    return items.filter((item) => item.viewedAt > cutoff);
}

export function getRecentlyViewed(): Product[] {
    const items = filterExpired(getRawItems());
    // Persist cleaned list back to storage
    if (typeof window !== 'undefined') {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        } catch { /* ignore */ }
    }
    return items.map((item) => item.product);
}

export function addToRecentlyViewed(product: Product): void {
    if (typeof window === 'undefined') return;
    try {
        const existing = filterExpired(getRawItems());
        // Remove if already exists (move to front)
        const filtered = existing.filter((item) => item.product._id !== product._id);
        // Add to front with current timestamp, cap at MAX_ITEMS
        const updated: RecentlyViewedItem[] = [
            { product, viewedAt: Date.now() },
            ...filtered,
        ].slice(0, MAX_ITEMS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
        // localStorage full or unavailable — silently fail
    }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RecentlyViewedSection({ title }: RecentlyViewedSectionProps) {
    const t = useTranslations('public.home');
    const [products, setProducts] = useState<Product[]>([]);
    const [api, setApi] = useState<CarouselApi>();
    const [canScrollPrev, setCanScrollPrev] = useState(false);
    const [canScrollNext, setCanScrollNext] = useState(false);

    // Load from localStorage after hydration — filter out unavailable/draft/sold products
    useEffect(() => {
        const items = getRecentlyViewed().filter(
            (p) => p.available && p.status === 'active',
        );
        setProducts(items);
    }, []);

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

    // Don't render if no recently viewed products
    if (products.length === 0) return null;

    return (
        <section
            aria-labelledby="recently-viewed-heading"
            className="py-12 md:py-16 lg:py-20"
        >
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section header with navigation arrows */}
                <div className="flex items-center justify-between mb-8 md:mb-10">
                    <div className="flex items-center gap-3">
                        <Clock className="size-5 text-muted-foreground" aria-hidden="true" />
                        <h2
                            id="recently-viewed-heading"
                            className="text-2xl font-bold text-foreground sm:text-3xl"
                        >
                            {title ?? t('recentlyViewed.title')}
                        </h2>
                    </div>

                    {/* Prev / Next arrows */}
                    <div className="hidden sm:flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => api?.scrollPrev()}
                            disabled={!canScrollPrev}
                            aria-label={t('recentlyViewed.prev')}
                            className={cn(
                                'flex items-center justify-center size-9 rounded-full border border-border bg-background shadow-sm transition-colors',
                                'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                'disabled:opacity-40 disabled:pointer-events-none',
                            )}
                        >
                            <ChevronLeft className="size-5 text-foreground" aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            onClick={() => api?.scrollNext()}
                            disabled={!canScrollNext}
                            aria-label={t('recentlyViewed.next')}
                            className={cn(
                                'flex items-center justify-center size-9 rounded-full border border-border bg-background shadow-sm transition-colors',
                                'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                'disabled:opacity-40 disabled:pointer-events-none',
                            )}
                        >
                            <ChevronRight className="size-5 text-foreground" aria-hidden="true" />
                        </button>
                    </div>
                </div>

                {/* Product carousel */}
                <Carousel
                    setApi={setApi}
                    opts={{ align: 'start', loop: false }}
                    className="w-full"
                >
                    <CarouselContent className="-ml-3 md:-ml-4 py-2">
                        {products.map((product) => (
                            <CarouselItem
                                key={product._id}
                                className="pl-3 md:pl-4 basis-[85%] sm:basis-1/2 lg:basis-1/3 xl:basis-1/4"
                            >
                                <ProductCard product={product} />
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                </Carousel>
            </div>
        </section>
    );
}

export default RecentlyViewedSection;
