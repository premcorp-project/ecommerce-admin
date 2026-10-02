'use client';

/**
 * TrustBadgesSection — default variant
 *
 * Static 4-badge strip rendered immediately with no API call, no loading state,
 * and no error state. All text is sourced from the public.home i18n namespace.
 *
 * Uses animated icons where available, lucide-react fallback otherwise.
 * Layout: 2-column on mobile, 4-column on md+
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 12.2, 13.1, 13.4
 */

import { BoxIcon } from '@/components/ui/animated-icons/box-icon';
import { CircleCheckBigIcon } from '@/components/ui/animated-icons/circle-check-big-icon';
import { HeadphonesIcon } from '@/components/ui/animated-icons/headphones-icon';
import { ShieldCheckIcon } from '@/components/ui/animated-icons/shield-check-icon';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import type { TrustBadgesSectionProps } from './TrustBadgesSection.types';

// ─── Static badge data ────────────────────────────────────────────────────────

interface TrustBadge {
    icon: ReactNode;
    titleKey: string;
    subtitleKey: string;
}

const BADGE_ICON_SIZE = 28;

const BADGES: readonly TrustBadge[] = [
    {
        icon: <BoxIcon size={BADGE_ICON_SIZE} className="text-primary" />,
        titleKey: 'trustBadges.freeShipping.title',
        subtitleKey: 'trustBadges.freeShipping.subtitle',
    },
    {
        icon: <HeadphonesIcon size={BADGE_ICON_SIZE} className="text-primary" />,
        titleKey: 'trustBadges.support.title',
        subtitleKey: 'trustBadges.support.subtitle',
    },
    {
        icon: <ShieldCheckIcon size={BADGE_ICON_SIZE} className="text-primary" />,
        titleKey: 'trustBadges.securePayment.title',
        subtitleKey: 'trustBadges.securePayment.subtitle',
    },
    {
        icon: <CircleCheckBigIcon size={BADGE_ICON_SIZE} className="text-primary" />,
        titleKey: 'trustBadges.moneyBack.title',
        subtitleKey: 'trustBadges.moneyBack.subtitle',
    },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function TrustBadgesSection(_props: TrustBadgesSectionProps) {
    const t = useTranslations('public.home');

    return (
        <section aria-label="Trust badges" className="bg-background border-y border-border">
            <div className="container mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 py-10 px-4 sm:px-6 lg:px-8">
                {BADGES.map(({ icon, titleKey, subtitleKey }) => (
                    <div
                        key={titleKey}
                        className="flex flex-col items-center text-center gap-3"
                    >
                        <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center">
                            {icon}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-foreground">
                                {t(titleKey as Parameters<typeof t>[0])}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {t(subtitleKey as Parameters<typeof t>[0])}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

export default TrustBadgesSection;
