'use client';

import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface StockBadgeProps {
    available: boolean;
    inventory: number;
    className?: string;
}

/**
 * StockBadge — displays stock status for a product or variant.
 *
 * Logic:
 *   - available === false OR inventory === 0  → Out of Stock (red)
 *   - available === true AND inventory > 0 AND inventory <= 10 → Low Stock (yellow)
 *   - available === true AND inventory > 10   → In Stock (green)
 *
 * Requirements: 13.6
 */
export function StockBadge({ available, inventory, className }: StockBadgeProps) {
    const t = useTranslations('public.common');

    const getStatus = (): 'inStock' | 'lowStock' | 'outOfStock' => {
        if (!available || inventory <= 0) return 'outOfStock';
        if (inventory <= 10) return 'lowStock';
        return 'inStock';
    };

    const status = getStatus();

    const statusConfig = {
        inStock: {
            label: t('inStock'),
            className:
                'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        },
        lowStock: {
            label: t('lowStock'),
            className:
                'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        },
        outOfStock: {
            label: t('outOfStock'),
            className:
                'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        },
    } as const;

    const { label, className: statusClassName } = statusConfig[status];

    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                statusClassName,
                className,
            )}
        >
            {label}
        </span>
    );
}

export default StockBadge;
