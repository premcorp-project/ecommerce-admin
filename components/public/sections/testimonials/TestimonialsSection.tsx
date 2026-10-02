'use client';

/**
 * TestimonialsSection — fetches real testimonials from GET /config/testimonials.
 *
 * Design:
 * - Auto-scrolling carousel (5s interval, pause on hover)
 * - 1 card mobile, 2 tablet, 3 desktop
 * - Large decorative quote mark, star rating, avatar with initials fallback
 * - Industry badge with semantic colors
 * - Don't render if fewer than 3 testimonials
 * - Skeleton loading state
 *
 * Requirements: 9.1–9.7, 12.2, 13.1–13.4
 */

import { Rating } from '@/components/public/common/Rating';
import {
    Carousel,
    type CarouselApi,
    CarouselContent,
    CarouselItem,
} from '@/components/ui/carousel';
import { Skeleton } from '@/components/ui/skeleton';
import { usePublicQuery } from '@/lib/api/public-hooks';
import { cn } from '@/lib/utils';
import Autoplay from 'embla-carousel-autoplay';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Testimonial, TestimonialsSectionProps } from './TestimonialsSection.types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
    return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500',
    'bg-orange-500', 'bg-pink-500', 'bg-cyan-500',
];

function getAvatarColor(name: string): string {
    return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

// ─── Industry badge ───────────────────────────────────────────────────────────

const INDUSTRY_STYLES: Record<string, string> = {
    Manufacturing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    Healthcare: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    Hospitality: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    Construction: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    Automotive: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    Education: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    'Cleaning Services': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    'Food & Beverage': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

// ─── Testimonial Card ─────────────────────────────────────────────────────────

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
    return (
        <article className="flex flex-col h-full rounded-xl border border-border bg-card p-6 transition-all duration-200 hover:border-primary/40 hover:shadow-lg">
            {/* Rating */}
            <Rating value={testimonial.rating} size="sm" />

            {/* Quote */}
            <div className="relative mt-4 flex-1">
                <Quote className="absolute -top-1 -left-1 size-6 text-primary/20" aria-hidden="true" />
                <p className="text-sm text-muted-foreground leading-relaxed pl-5 line-clamp-5">
                    {testimonial.quote}
                </p>
            </div>

            {/* Divider */}
            <div className="border-t border-border my-4" />

            {/* Author */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar */}
                    {testimonial.avatar ? (
                        <Image
                            src={testimonial.avatar}
                            alt={testimonial.name}
                            width={44}
                            height={44}
                            className="size-11 rounded-full object-cover shrink-0"
                        />
                    ) : (
                        <div className={cn('flex size-11 items-center justify-center rounded-full shrink-0', getAvatarColor(testimonial.name))}>
                            <span className="text-sm font-bold text-white">{getInitials(testimonial.name)}</span>
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{testimonial.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                            {testimonial.role}{testimonial.company ? `, ${testimonial.company}` : ''}
                        </p>
                    </div>
                </div>

                {/* Industry badge */}
                {testimonial.industry && (
                    <span className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0',
                        INDUSTRY_STYLES[testimonial.industry] ?? 'bg-muted text-muted-foreground',
                    )}>
                        {testimonial.industry}
                    </span>
                )}
            </div>
        </article>
    );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TestimonialSkeleton() {
    return (
        <div className="rounded-xl border border-border bg-card p-6 animate-pulse">
            <div className="flex gap-1 mb-4">
                {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="size-4 rounded" />)}
            </div>
            <div className="space-y-2 mb-6">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="border-t border-border pt-4 flex items-center gap-3">
                <Skeleton className="size-11 rounded-full" />
                <div className="space-y-1.5">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-32" />
                </div>
            </div>
        </div>
    );
}

// ─── API response ─────────────────────────────────────────────────────────────

interface TestimonialsResponse {
    data: { testimonials: Testimonial[] };
}

// ─── Section ──────────────────────────────────────────────────────────────────

export function TestimonialsSection({ title }: TestimonialsSectionProps) {
    const t = useTranslations('public.home');

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

    const { data, isLoading } = usePublicQuery<TestimonialsResponse>(
        ['public', 'testimonials'],
        '/config/testimonials',
        { staleTime: 1000 * 60 * 30 },
    );

    const testimonials = (data as any)?.data?.testimonials ?? [];

    // Don't render if loading shows no skeleton needed or fewer than 3
    if (!isLoading && testimonials.length < 3) return null;

    return (
        <section
            aria-labelledby="testimonials-heading"
            className="py-12 md:py-16 lg:py-20"
        >
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex items-end justify-between mb-10">
                    <div>
                        <span className="text-primary text-xs font-semibold uppercase tracking-widest">
                            {t('testimonials.label')}
                        </span>
                        <h2
                            id="testimonials-heading"
                            className="text-2xl font-bold text-foreground sm:text-3xl mt-1"
                        >
                            {title ?? t('testimonials.title')}
                        </h2>
                    </div>

                    {/* Navigation arrows */}
                    {!isLoading && testimonials.length > 0 && (
                        <div className="hidden sm:flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => api?.scrollPrev()}
                                disabled={!canScrollPrev}
                                aria-label={t('testimonials.prevAriaLabel')}
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
                                aria-label={t('testimonials.nextAriaLabel')}
                                className={cn(
                                    'flex items-center justify-center size-9 rounded-full border border-border bg-background shadow-sm transition-colors',
                                    'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                    'disabled:opacity-40 disabled:pointer-events-none',
                                )}
                            >
                                <ChevronRight className="size-5 text-foreground" aria-hidden="true" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Loading */}
                {isLoading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.from({ length: 3 }, (_, i) => <TestimonialSkeleton key={i} />)}
                    </div>
                )}

                {/* Carousel */}
                {!isLoading && testimonials.length >= 3 && (
                    <Carousel
                        setApi={setApi}
                        opts={{ align: 'start', loop: true }}
                        plugins={[autoplayPlugin.current]}
                        className="w-full"
                    >
                        <CarouselContent className="-ml-4">
                            {testimonials.map((testimonial: Testimonial) => (
                                <CarouselItem
                                    key={testimonial._id}
                                    className="pl-4 basis-[90%] sm:basis-1/2 lg:basis-1/3"
                                >
                                    <TestimonialCard testimonial={testimonial} />
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                    </Carousel>
                )}
            </div>
        </section>
    );
}

export default TestimonialsSection;
