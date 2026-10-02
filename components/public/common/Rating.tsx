'use client';

/**
 * Rating — read-only star display component.
 *
 * Renders 5 stars with proper visual half-star rendering (not just rounding).
 * Uses the documented status-palette amber treatment (yellow-500 + dark:yellow-400)
 * which is one of the agreed exceptions for fixed semantic colours.
 *
 * Requirements: 13.4
 */

import { cn } from '@/lib/utils';
import { Star, StarHalf } from 'lucide-react';
import { useTranslations } from 'next-intl';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RatingProps {
    /** Rating value between 0 and 5 (supports decimals for half stars) */
    value: number;
    /** Optional review count displayed next to the stars */
    count?: number;
    /** Size variant — controls star dimensions */
    size?: 'sm' | 'md' | 'lg';
    /** Optional CSS class name for the wrapper */
    className?: string;
    /** Accessible label override — defaults to "{value} out of 5 stars" */
    ariaLabel?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_STARS = 5;

const SIZE_MAP = {
    sm: 'size-3.5',
    md: 'size-4',
    lg: 'size-5',
} as const;

const TEXT_SIZE_MAP = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
} as const;

// Amber treatment for stars — same convention as documented status-palette colours
// (acceptable exception for fixed semantic indicators per project rules).
const STAR_FILLED = 'fill-yellow-500 text-yellow-500 dark:fill-yellow-400 dark:text-yellow-400';
const STAR_EMPTY = 'fill-muted text-muted-foreground/40';

// ─── Component ────────────────────────────────────────────────────────────────

export function Rating({
    value,
    count,
    size = 'md',
    className,
    ariaLabel,
}: RatingProps) {
    const t = useTranslations('public.product');

    // Clamp value to [0, 5] and round to nearest 0.5
    const clamped = Math.min(5, Math.max(0, value));
    const rounded = Math.round(clamped * 2) / 2;

    const label =
        ariaLabel ??
        (count !== undefined
            ? `${clamped.toFixed(1)} ${t('reviewsCount', { count })}`
            : `${clamped.toFixed(1)} / 5`);

    return (
        <span
            className={cn('inline-flex items-center gap-1.5', className)}
            role="img"
            aria-label={label}
        >
            {/* Stars */}
            <span className="inline-flex items-center gap-0.5">
                {Array.from({ length: TOTAL_STARS }, (_, i) => {
                    const starIndex = i + 1;
                    const isFull = starIndex <= Math.floor(rounded);
                    const isHalf = !isFull && starIndex - 0.5 === rounded;

                    if (isHalf) {
                        return (
                            <span
                                key={i}
                                className={cn('relative inline-flex', SIZE_MAP[size])}
                                aria-hidden="true"
                            >
                                <Star
                                    className={cn('absolute inset-0', SIZE_MAP[size], STAR_EMPTY)}
                                />
                                <StarHalf
                                    className={cn('absolute inset-0', SIZE_MAP[size], STAR_FILLED)}
                                />
                            </span>
                        );
                    }

                    return (
                        <Star
                            key={i}
                            className={cn(
                                SIZE_MAP[size],
                                'shrink-0',
                                isFull ? STAR_FILLED : STAR_EMPTY,
                            )}
                            aria-hidden="true"
                        />
                    );
                })}
            </span>

            {/* Numeric rating + review count */}
            {count !== undefined && (
                <span
                    className={cn(
                        TEXT_SIZE_MAP[size],
                        'text-muted-foreground tabular-nums',
                    )}
                    aria-hidden="true"
                >
                    {clamped.toFixed(1)} ({count})
                </span>
            )}
        </span>
    );
}

export default Rating;
