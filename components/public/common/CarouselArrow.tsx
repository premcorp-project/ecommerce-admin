'use client';

/**
 * CarouselArrow — shared prev/next button for carousel section headers.
 *
 * Single source of truth for size, border, hover, and disabled treatments so all
 * homepage carousels look identical.
 */

import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface CarouselArrowProps {
    direction: 'prev' | 'next';
    onClick: () => void;
    disabled?: boolean;
    label: string;
    className?: string;
}

export function CarouselArrow({
    direction,
    onClick,
    disabled,
    label,
    className,
}: CarouselArrowProps) {
    const Icon = direction === 'prev' ? ChevronLeft : ChevronRight;

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            className={cn(
                'flex items-center justify-center size-9 rounded-full',
                'border border-border bg-background shadow-sm',
                'transition-all duration-150',
                'hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-md',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'disabled:opacity-40 disabled:pointer-events-none disabled:hover:bg-background disabled:hover:text-foreground disabled:hover:border-border',
                className,
            )}
        >
            <Icon className="size-5" aria-hidden="true" />
        </button>
    );
}

export default CarouselArrow;
