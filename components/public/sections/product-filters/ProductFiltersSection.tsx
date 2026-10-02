'use client';

/**
 * ProductFiltersSection — default variant
 *
 * - Desktop (md+): persistent sidebar (w-64)
 * - Mobile (<md): collapsible bottom Sheet triggered by a "Filters" button
 *
 * Filter logic lives in FilterContent.tsx (shared between both layouts).
 * Attribute keys are NEVER hardcoded — always iterated from availableFilters.attributes.
 *
 * Requirements: 4.3, 4.4, 4.5, 4.11, 4.12
 */

import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { SlidersHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { FilterContent } from './FilterContent';
import type { ProductFiltersSectionProps } from './ProductFiltersSection.types';

export function ProductFiltersSection({ availableFilters }: ProductFiltersSectionProps) {
    const t = useTranslations('public.products');
    const [sheetOpen, setSheetOpen] = useState(false);

    return (
        <>
            {/* ── Mobile: Sheet trigger (hidden on md+) ── */}
            <div className="md:hidden">
                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                    <SheetTrigger asChild>
                        <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted min-h-[44px]"
                            aria-label={t('filterOpen')}
                        >
                            <SlidersHorizontal className="size-4" aria-hidden="true" />
                            {t('filterTitle')}
                        </button>
                    </SheetTrigger>
                    <SheetContent
                        side="bottom"
                        className="max-h-[85dvh] overflow-y-auto rounded-t-xl"
                    >
                        <SheetHeader className="sr-only">
                            <SheetTitle>{t('filterTitle')}</SheetTitle>
                        </SheetHeader>
                        <div className="px-4 pb-6 pt-2">
                            <FilterContent
                                availableFilters={availableFilters}
                                onClose={() => setSheetOpen(false)}
                            />
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            {/* ── Desktop: persistent sidebar (hidden below md) ── */}
            <aside
                className="hidden md:block w-64 shrink-0"
                aria-label={t('filterTitle')}
            >
                <FilterContent availableFilters={availableFilters} />
            </aside>
        </>
    );
}

export default ProductFiltersSection;
