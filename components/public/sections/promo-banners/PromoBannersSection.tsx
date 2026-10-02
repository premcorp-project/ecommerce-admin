'use client';

/**
 * PromoBannersSection — dynamic promotional banner cards.
 *
 * Fetches promo banners from GET /banners?placement=promo&active=true.
 * Renders as a responsive grid:
 *   - 0 banners → section hidden
 *   - 1 banner → full-width card
 *   - 2+ banners → 2-column grid
 *
 * Each card shows: background image, title, subtitle, CTA button.
 * Falls back gracefully when no image is set (gradient background).
 */

import { Skeleton } from '@/components/ui/skeleton';
import { usePublicQuery } from '@/lib/api/public-hooks';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import type { PromoBannersSectionProps } from './PromoBannersSection.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PromoBanner {
    _id: string;
    title: string;
    subtitle?: string;
    image?: { url: string; publicId: string };
    link: string;
    ctaText?: string;
    placement: string;
    position: number;
    isActive: boolean;
}

interface BannersResponse {
    data: { banners: PromoBanner[] };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PromoBannersSection(_props: PromoBannersSectionProps) {
    const t = useTranslations('public.home');

    const { data, isLoading } = usePublicQuery<BannersResponse>(
        ['public', 'promo-banners'],
        '/banners',
        { staleTime: 1000 * 60 * 5 },
        { params: { placement: 'promo', active: true } },
    );

    const banners = (data as any)?.data?.banners ?? [];

    // Don't render if no promo banners
    if (!isLoading && banners.length === 0) return null;

    // Loading skeleton
    if (isLoading) {
        return (
            <section aria-label="Promotional banners" className="py-12 md:py-16 lg:py-20">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Skeleton className="h-[280px] rounded-xl" />
                    <Skeleton className="h-[280px] rounded-xl" />
                </div>
            </section>
        );
    }

    return (
        <section aria-label="Promotional banners" className="py-12 md:py-16 lg:py-20">
            <div className={cn(
                'container mx-auto px-4 sm:px-6 lg:px-8 grid gap-6',
                banners.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2',
            )}>
                {banners.map((banner: PromoBanner) => (
                    <PromoBannerCard key={banner._id} banner={banner} isFullWidth={banners.length === 1} t={t} />
                ))}
            </div>
        </section>
    );
}

// ─── Banner Card ──────────────────────────────────────────────────────────────

function PromoBannerCard({ banner, isFullWidth, t }: { banner: PromoBanner; isFullWidth: boolean; t: any }) {
    const hasImage = !!banner.image?.url;
    const ctaLabel = banner.ctaText || t('promoCta');

    return (
        <div className={cn('relative overflow-hidden rounded-xl bg-muted', !isFullWidth && 'min-h-[280px]')}>
            {/* Image */}
            {hasImage && isFullWidth ? (
                // Full-width: show complete image, no cropping
                <Image
                    src={banner.image!.url}
                    alt={banner.title}
                    width={1440}
                    height={500}
                    sizes="100vw"
                    className="w-full h-auto"
                />
            ) : hasImage ? (
                // 2-column: cover mode to fill the fixed height
                <Image
                    src={banner.image!.url}
                    alt={banner.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                />
            ) : (
                <div className="aspect-[3/1]" />
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 flex flex-col gap-1.5 sm:gap-2.5">
                {/* Title */}
                <h3 className="text-sm font-bold text-white sm:text-xl md:text-2xl">
                    {banner.title}
                </h3>

                {/* Subtitle */}
                {banner.subtitle && (
                    <p className="text-xs text-white/80 sm:text-sm">
                        {banner.subtitle}
                    </p>
                )}

                {/* CTA */}
                {banner.link && (
                    <Link
                        href={banner.link}
                        className="inline-flex items-center self-start gap-1.5 px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-md bg-primary text-primary-foreground text-xs sm:text-sm font-semibold hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[32px] sm:min-h-[44px] mt-1"
                    >
                        {ctaLabel}
                    </Link>
                )}
            </div>
        </div>
    );
}

export default PromoBannersSection;
