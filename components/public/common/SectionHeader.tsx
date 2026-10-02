'use client';

/**
 * SectionHeader — shared homepage section heading.
 *
 * Provides a consistent type ramp and a unified "carousel header" pattern:
 *   - Optional eyebrow (small uppercase label, primary tint)
 *   - h2 + optional subtitle
 *   - Optional right-side controls (prev/next arrows + view-all link)
 *
 * Use the slots:
 *   - `controls` for the prev/next arrow group
 *   - `viewAllHref` + `viewAllLabel` to render the standard "View all" link
 *
 * This component intentionally does NOT manage carousel state — sections still own
 * their `useEmblaCarousel` API and pass the rendered controls in.
 */

import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

export interface SectionHeaderProps {
    /** Optional eyebrow label (rendered above the heading). */
    eyebrow?: string;
    /** Optional eyebrow icon (small lucide / animated icon). */
    eyebrowIcon?: ReactNode;
    /** Visible h2 text. */
    title: string;
    /** Heading id for aria-labelledby on the parent <section>. */
    titleId?: string;
    /** Optional subtitle rendered under the heading. */
    subtitle?: string;
    /** Right-side controls (arrows). Hidden on small screens. */
    controls?: ReactNode;
    /** Render a standard "View All" link on the right. */
    viewAllHref?: string;
    /** Label for the View All link. */
    viewAllLabel?: string;
    /** Center the header (used by section-explainer headers like WhyChemibuild). */
    align?: 'left' | 'center';
    /** Extra classes on the wrapper. */
    className?: string;
}

export function SectionHeader({
    eyebrow,
    eyebrowIcon,
    title,
    titleId,
    subtitle,
    controls,
    viewAllHref,
    viewAllLabel,
    align = 'left',
    className,
}: SectionHeaderProps) {
    const isCentered = align === 'center';

    const heading = (
        <div className={cn('flex flex-col gap-2', isCentered && 'items-center text-center')}>
            {eyebrow && (
                <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                    {eyebrowIcon}
                    {eyebrow}
                </span>
            )}
            <h2
                id={titleId}
                className="text-2xl font-bold text-foreground tracking-tight sm:text-3xl"
            >
                {title}
            </h2>
            {subtitle && (
                <p
                    className={cn(
                        'text-sm text-muted-foreground leading-relaxed',
                        isCentered && 'max-w-xl',
                    )}
                >
                    {subtitle}
                </p>
            )}
        </div>
    );

    if (isCentered) {
        return (
            <div className={cn('mb-10 md:mb-14 flex flex-col items-center', className)}>
                {heading}
            </div>
        );
    }

    return (
        <div
            className={cn(
                'mb-8 md:mb-10 flex flex-wrap items-end justify-between gap-4',
                className,
            )}
        >
            {heading}

            {(controls || viewAllHref) && (
                <div className="flex items-center gap-3 ms-auto">
                    {controls && <div className="hidden sm:flex items-center gap-2">{controls}</div>}
                    {viewAllHref && viewAllLabel && (
                        <Link
                            href={viewAllHref}
                            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline shrink-0"
                        >
                            {viewAllLabel}
                            <ArrowRight className="size-4" aria-hidden="true" />
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
}

export default SectionHeader;
