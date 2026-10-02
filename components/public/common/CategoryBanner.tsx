'use client';

/**
 * CategoryBanner — shows a promotional banner at the top of product listing
 * pages when filtered by a specific category.
 *
 * Fetches GET /banners?placement=category&categorySlug={slug}&active=true
 * Shows the first matching banner. Hidden if none found.
 */

import { usePublicQuery } from '@/lib/api/public-hooks';
import Image from 'next/image';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CategoryBannerData {
    _id: string;
    title: string;
    subtitle?: string;
    image?: { url: string; publicId: string };
    link: string;
    ctaText?: string;
}

interface BannersResponse {
    data: { banners: CategoryBannerData[] };
}

interface CategoryBannerProps {
    categorySlug: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CategoryBanner({ categorySlug }: CategoryBannerProps) {
    const { data, isLoading } = usePublicQuery<BannersResponse>(
        ['public', 'category-banner', categorySlug],
        '/banners',
        { staleTime: 1000 * 60 * 10, enabled: !!categorySlug },
        { params: { placement: 'category', categorySlug, active: true } },
    );

    const banners: CategoryBannerData[] = (data as any)?.data?.banners ?? [];
    const banner = banners[0]; // Show first matching banner

    if (isLoading || !banner) return null;

    return (
        <div className="relative overflow-hidden rounded-xl min-h-[140px] sm:min-h-[180px] mb-6">
            {/* Background image */}
            {banner.image?.url && (
                <Image
                    src={banner.image.url}
                    alt={banner.title}
                    fill
                    sizes="100vw"
                    className="object-cover"
                    priority
                />
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />

            {/* Content */}
            <div className="relative flex flex-col justify-center h-full min-h-[140px] sm:min-h-[180px] px-6 sm:px-8 py-5">
                <h2 className="text-lg font-bold text-white sm:text-xl lg:text-2xl max-w-md">
                    {banner.title}
                </h2>
                {banner.subtitle && (
                    <p className="text-sm text-white/80 mt-1 max-w-sm">
                        {banner.subtitle}
                    </p>
                )}
                {banner.link && banner.ctaText && (
                    <Link
                        href={banner.link}
                        className="inline-flex items-center self-start mt-3 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors min-h-[36px]"
                    >
                        {banner.ctaText}
                    </Link>
                )}
            </div>
        </div>
    );
}

export default CategoryBanner;
