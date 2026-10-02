'use client';

/**
 * SortSelector — dropdown for sorting the product listing.
 *
 * Options: newest, popularity, price_asc, price_desc, name_asc
 * Updates the `sortBy` URL search param on change and resets `page` to 1.
 *
 * Uses shadcn Select component and next/navigation hooks.
 * All strings are localised via t('public.products.*').
 *
 * Requirements: 4.7
 */

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

// ─── Sort option definitions ──────────────────────────────────────────────────

type SortValue = 'newest' | 'popularity' | 'price_asc' | 'price_desc' | 'name_asc';

const SORT_OPTIONS: { value: SortValue; labelKey: string }[] = [
    { value: 'newest', labelKey: 'sortNewest' },
    { value: 'popularity', labelKey: 'sortPopularity' },
    { value: 'price_asc', labelKey: 'sortPriceAsc' },
    { value: 'price_desc', labelKey: 'sortPriceDesc' },
    { value: 'name_asc', labelKey: 'sortNameAsc' },
];

const DEFAULT_SORT: SortValue = 'newest';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SortSelectorProps {
    className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SortSelector({ className }: SortSelectorProps) {
    const t = useTranslations('public.products');
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const currentSort = (searchParams.get('sortBy') as SortValue) ?? DEFAULT_SORT;

    const handleSortChange = useCallback(
        (value: string) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set('sortBy', value);
            // Reset to page 1 whenever sort changes (Requirement 4.7)
            params.set('page', '1');
            router.push(`${pathname}?${params.toString()}`);
        },
        [router, pathname, searchParams],
    );

    return (
        <div className={className}>
            <Select value={currentSort} onValueChange={handleSortChange}>
                <SelectTrigger
                    aria-label={t('sortBy')}
                    className="w-full sm:w-[200px]"
                >
                    <SelectValue placeholder={t('sortBy')} />
                </SelectTrigger>
                <SelectContent align="end">
                    {SORT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {t(option.labelKey as Parameters<typeof t>[0])}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

export default SortSelector;
