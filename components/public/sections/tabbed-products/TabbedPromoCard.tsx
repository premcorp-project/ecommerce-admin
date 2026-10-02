'use client';

/**
 * TabbedPromoCard
 *
 * Promotional card rendered in the 4th column of TabbedProductsSection.
 * Requirements: 8.4, 13.1, 13.3
 */

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { TabbedPromoCardProps } from './TabbedProductsSection.types';

export function TabbedPromoCard(_props: TabbedPromoCardProps) {
    const t = useTranslations('public.home.tabs');

    return (
        <div className="flex flex-col items-start justify-center gap-4 rounded-xl bg-primary p-6 h-full min-h-[300px]">
            <h3 className="text-xl font-bold text-primary-foreground">
                {t('promoTitle')}
            </h3>

            <p className="text-sm text-primary-foreground/80">
                {t('promoBody')}
            </p>

            <Link
                href="/products"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-primary-foreground text-primary text-sm font-semibold hover:bg-primary-foreground/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[44px]"
            >
                {t('promoCta')}
            </Link>
        </div>
    );
}
