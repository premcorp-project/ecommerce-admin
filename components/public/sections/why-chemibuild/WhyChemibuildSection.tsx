'use client';

/**
 * WhyChemibuildSection — 3-column value proposition grid.
 *
 * Communicates the core differentiators for a chemical/cleaning products platform:
 * - Safety & Compliance (COSHH, SDS sheets)
 * - Bulk Pricing (volume discounts, trade accounts)
 * - Expert Support (technical guidance, fast delivery)
 *
 * Design: Large icon blocks with bold headings, short descriptions.
 * Follows the "block-based" style recommendation from the design system.
 * Static section — no API call needed.
 */

import { FileCheck, Package, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import type { WhyChemibuildSectionProps } from './WhyChemibuildSection.types';

// ─── Value proposition items ──────────────────────────────────────────────────

interface ValueProp {
    icon: ReactNode;
    titleKey: string;
    descriptionKey: string;
}

const VALUE_PROPS: readonly ValueProp[] = [
    {
        icon: <ShieldCheck className="size-7" aria-hidden="true" />,
        titleKey: 'whyChemibuild.safety.title',
        descriptionKey: 'whyChemibuild.safety.description',
    },
    {
        icon: <Package className="size-7" aria-hidden="true" />,
        titleKey: 'whyChemibuild.bulk.title',
        descriptionKey: 'whyChemibuild.bulk.description',
    },
    {
        icon: <FileCheck className="size-7" aria-hidden="true" />,
        titleKey: 'whyChemibuild.support.title',
        descriptionKey: 'whyChemibuild.support.description',
    },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function WhyChemibuildSection({ title }: WhyChemibuildSectionProps) {
    const t = useTranslations('public.home');

    return (
        <section
            aria-labelledby="why-chemibuild-heading"
            className="py-12 md:py-16 lg:py-20"
        >
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section header */}
                <div className="text-center mb-10 md:mb-14">
                    <h2
                        id="why-chemibuild-heading"
                        className="text-2xl font-bold text-foreground sm:text-3xl"
                    >
                        {title ?? t('whyChemibuild.title')}
                    </h2>
                    <p className="mt-3 text-sm text-muted-foreground max-w-lg mx-auto">
                        {t('whyChemibuild.subtitle')}
                    </p>
                </div>

                {/* 3-column grid */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
                    {VALUE_PROPS.map(({ icon, titleKey, descriptionKey }) => (
                        <div
                            key={titleKey}
                            className="group flex flex-col items-center text-center rounded-xl border border-border bg-card p-8 transition-all duration-200 hover:border-primary/40 hover:shadow-lg"
                        >
                            {/* Icon block */}
                            <div className="flex size-14 items-center justify-center rounded-lg bg-primary/10 text-primary mb-5 transition-transform duration-200 group-hover:scale-110">
                                {icon}
                            </div>

                            {/* Title */}
                            <h3 className="text-base font-bold text-foreground mb-2">
                                {t(titleKey as Parameters<typeof t>[0])}
                            </h3>

                            {/* Description */}
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {t(descriptionKey as Parameters<typeof t>[0])}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

export default WhyChemibuildSection;
