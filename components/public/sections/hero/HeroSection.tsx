'use client';

/**
 * HeroSection — Embla-based banner carousel.
 *
 * - 2 banners visible on desktop (lg+), 1 on mobile
 * - Auto-advances every 5s, pauses on hover
 * - Supports images and GIFs
 * - Prev/next arrows + dot indicators
 * - Fallback hero when no banners exist
 *
 * Requirements: 1.1–1.9
 */

import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from '@/components/ui/carousel';
import { Skeleton } from '@/components/ui/skeleton';
import { usePublicQuery } from '@/lib/api/public-hooks';
import { publicQueryKeys } from '@/lib/api/public-query-keys';
import type { Banner } from '@/types/public';
import Autoplay from 'embla-carousel-autoplay';
import { AlertCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import type { HeroSectionProps } from './HeroSection.types';

// ─── API response ─────────────────────────────────────────────────────────────

interface BannersApiResponse {
    data?: Banner[] | { banners?: Banner[] };
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function HeroSkeleton() {
    return (
        <section className="w-full py-4" aria-busy="true" aria-label="Loading banners">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 gap-4">
                    <Skeleton className="w-full h-[280px] sm:h-[320px] lg:h-[360px] rounded-xl" />
                    <Skeleton className="w-full h-[280px] sm:h-[320px] lg:h-[360px] rounded-xl" />
                </div>
            </div>
        </section>
    );
}

// ─── Error state ──────────────────────────────────────────────────────────────

function HeroError({ onRetry }: { onRetry: () => void }) {
    const t = useTranslations('public.home');
    return (
        <section className="w-full py-4">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-center h-[280px] rounded-xl bg-muted">
                    <div className="flex flex-col items-center gap-3 text-center px-4">
                        <AlertCircle className="size-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">{t('heroLoadError')}</p>
                        <button
                            type="button"
                            onClick={onRetry}
                            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                        >
                            <RefreshCw className="size-3.5" /> {t('heroRetry')}
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}

// ─── Fallback hero ────────────────────────────────────────────────────────────

function HeroFallback({ title, subtitle }: { title?: string; subtitle?: string }) {
    const t = useTranslations('public.home');
    return (
        <section className="w-full py-4">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col items-center justify-center h-[280px] sm:h-[320px] lg:h-[360px] rounded-xl bg-gradient-to-br from-primary/10 via-background to-muted text-center px-6">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-3">
                        {title ?? t('heroTitle')}
                    </h1>
                    <p className="text-base sm:text-lg text-muted-foreground max-w-xl mb-6">
                        {subtitle ?? t('heroSubtitle')}
                    </p>
                    <Link
                        href="/products"
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        {t('heroCta')} <ArrowRight className="size-4" />
                    </Link>
                </div>
            </div>
        </section>
    );
}

// ─── Banner slide ─────────────────────────────────────────────────────────────

function BannerSlide({ banner, isPriority }: { banner: Banner; isPriority: boolean }) {
    const content = (
        <div className="relative w-full h-[180px] sm:h-[280px] md:h-[320px] lg:h-[380px] rounded-lg overflow-hidden">
            <Image
                src={banner.image.url}
                alt={banner.title || 'Banner'}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-contain sm:object-cover"
                priority={isPriority}
                unoptimized={banner.image.url.endsWith('.gif')}
            />
            {/* No overlay text — clean banner image only */}
        </div>
    );

    if (banner.link) {
        return (
            <Link href={banner.link} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg overflow-hidden">
                {content}
            </Link>
        );
    }

    return content;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function HeroSection({ title, subtitle }: HeroSectionProps) {
    const t = useTranslations('public.home');

    const { data: rawData, isLoading, isError, refetch } = usePublicQuery<BannersApiResponse>(
        publicQueryKeys.banners,
        '/banners',
        { staleTime: 1000 * 60 * 5 },
        { params: { active: true, placement: 'hero' } },
    );

    // Unwrap envelope
    const rawInner = (rawData as any)?.data;
    const banners: Banner[] = (
        Array.isArray(rawInner?.banners)
            ? rawInner.banners
            : Array.isArray(rawInner)
              ? rawInner
              : []
    )
        .filter((b: Banner) => b.image?.url && b.isActive !== false)
        .sort((a: Banner, b: Banner) => (a.position ?? 0) - (b.position ?? 0));

    if (isLoading) return <HeroSkeleton />;
    if (isError) return <HeroError onRetry={refetch} />;
    if (banners.length === 0) return <HeroFallback title={title} subtitle={subtitle} />;

    return (
        <section className="w-full py-4" aria-label={t('heroCarouselLabel')}>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <Carousel
                    opts={{
                        align: 'start',
                        loop: true,
                    }}
                    plugins={[
                        Autoplay({ delay: 5000, stopOnInteraction: true }),
                    ]}
                    className="w-full"
                >
                    <CarouselContent className="-ml-4">
                        {banners.map((banner, index) => (
                            <CarouselItem
                                key={banner._id}
                                className="pl-4 basis-full"
                            >
                                <BannerSlide
                                    banner={banner}
                                    isPriority={index === 0}
                                />
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    <CarouselPrevious className="left-2 lg:-left-4" />
                    <CarouselNext className="right-2 lg:-right-4" />
                </Carousel>
            </div>
        </section>
    );
}

export default HeroSection;
