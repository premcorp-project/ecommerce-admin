'use client';

/**
 * FilterContent — shared filter UI used inside both the desktop sidebar
 * and the mobile Sheet drawer.
 *
 * Renders: category list (radio-style), price range slider (debounced),
 * in-stock toggle, dynamic attribute checkboxes.
 *
 * Category logic:
 * - Shows all top-level categories as a radio list
 * - If no category is selected → shows all products, hides attribute filters
 * - If a category is selected → shows attribute filters for that category
 *
 * Attribute keys are NEVER hardcoded — always iterated from availableFilters.attributes.
 * When attributes array is empty, the attribute section is hidden entirely.
 *
 * Requirements: 4.3, 4.4, 4.5, 4.11, 4.12
 */

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { usePublicQuery } from '@/lib/api/public-hooks';
import { publicQueryKeys } from '@/lib/api/public-query-keys';
import type { AvailableFilters, Category, Tag } from '@/types/public';
import { useTranslations } from 'next-intl';
import { usePathname, useSearchParams } from 'next/navigation';
import { useRouter } from 'nextjs-toploader/app';
import { useCallback, useEffect, useState } from 'react';

export interface FilterContentProps {
    availableFilters: AvailableFilters;
    /** Called after "Clear All" to allow the parent to close a Sheet */
    onClose?: () => void;
}

export function FilterContent({ availableFilters, onClose }: FilterContentProps) {
    const t = useTranslations('public.products');
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Hydration guard — categories load client-side, causing mismatch
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    // ── Fetch categories for the sidebar list ────────────────────────────────

    interface CategoriesResponse {
        data: { categories: Category[] } | Category[];
    }

    const { data: catData } = usePublicQuery<CategoriesResponse>(
        [...publicQueryKeys.categories, 'tree'],
        '/catalog/categories/tree',
        { staleTime: 1000 * 60 * 10 },
    );

    const rawCatData = (catData as any)?.data;
    const topLevelCategories: Category[] = Array.isArray(rawCatData)
        ? rawCatData
        : Array.isArray((rawCatData as any)?.categories)
          ? (rawCatData as any).categories
          : Array.isArray((rawCatData as any)?.data?.categories)
            ? (rawCatData as any).data.categories
            : [];

    // Currently selected category from URL
    const selectedCategory = searchParams.get('category') ?? null;

    // ── URL helpers ──────────────────────────────────────────────────────────

    const updateParam = useCallback(
        (key: string, value: string | null) => {
            const params = new URLSearchParams(searchParams.toString());
            if (value === null) {
                params.delete(key);
            } else {
                params.set(key, value);
            }
            params.set('page', '1');
            router.push(`${pathname}?${params.toString()}`);
        },
        [router, pathname, searchParams],
    );

    const updateMultipleParams = useCallback(
        (updates: Record<string, string | null>) => {
            const params = new URLSearchParams(searchParams.toString());
            Object.entries(updates).forEach(([key, value]) => {
                if (value === null) params.delete(key);
                else params.set(key, value);
            });
            params.set('page', '1');
            router.push(`${pathname}?${params.toString()}`);
        },
        [router, pathname, searchParams],
    );

    const toggleAttributeValue = useCallback(
        (attrKey: string, attrValue: string) => {
            const paramKey = `attributes[${attrKey}]`;
            const current = searchParams.get(paramKey);
            const currentValues = current ? current.split(',').filter(Boolean) : [];
            const newValues = currentValues.includes(attrValue)
                ? currentValues.filter((v) => v !== attrValue)
                : [...currentValues, attrValue];
            updateParam(paramKey, newValues.length > 0 ? newValues.join(',') : null);
        },
        [searchParams, updateParam],
    );

    // ── Derived state from URL ───────────────────────────────────────────────

    const { priceRange } = availableFilters;
    const urlMin = searchParams.get('minPrice');
    const urlMax = searchParams.get('maxPrice');
    const isInStock = searchParams.get('inStock') === 'true';

    // ── Local price state (for smooth dragging) ────────────────────────────────

    // Use a wider max than the API's priceRange so users aren't constrained
    const sliderMin = 0;
    const sliderMax = Math.max(priceRange.max * 2, 1000);
    const step = sliderMax > 500 ? 5 : 1;

    const [localRange, setLocalRange] = useState<[number, number]>([
        urlMin ? Number(urlMin) : sliderMin,
        urlMax ? Number(urlMax) : sliderMax,
    ]);

    // Sync local state when URL changes externally (e.g. clear all)
    useEffect(() => {
        setLocalRange([
            urlMin ? Number(urlMin) : sliderMin,
            urlMax ? Number(urlMax) : sliderMax,
        ]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [urlMin, urlMax]);

    // Debounced URL update when slider values change (500ms)
    const debouncedPriceUpdate = useDebouncedCallback(
        (min: number, max: number) => {
            const updates: Record<string, string | null> = {};
            updates.minPrice = min > sliderMin ? String(min) : null;
            updates.maxPrice = max < sliderMax ? String(max) : null;
            updateMultipleParams(updates);
        },
        500,
    );

    const handleSliderChange = (values: number[]) => {
        const [min, max] = values as [number, number];
        setLocalRange([min, max]);
        debouncedPriceUpdate(min, max);
    };

    // ── Clear all filters ────────────────────────────────────────────────────

    const clearAll = useCallback(() => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('minPrice');
        params.delete('maxPrice');
        params.delete('inStock');
        params.delete('category');
        params.delete('tags');
        // Clear ALL attribute params from URL
        const keysToDelete: string[] = [];
        params.forEach((_, key) => {
            if (key.startsWith('attributes[')) {
                keysToDelete.push(key);
            }
        });
        keysToDelete.forEach((key) => params.delete(key));
        params.set('page', '1');
        router.push(`${pathname}?${params.toString()}`);
        onClose?.();
    }, [router, pathname, searchParams, onClose]);

    // ── Category selection handler ───────────────────────────────────────────

    const handleCategorySelect = useCallback(
        (slug: string | null) => {
            const params = new URLSearchParams(searchParams.toString());
            if (slug === null) {
                params.delete('category');
            } else {
                params.set('category', slug);
            }
            // Clear ALL attribute params when switching/clearing categories
            const keysToDelete: string[] = [];
            params.forEach((_, key) => {
                if (key.startsWith('attributes[')) {
                    keysToDelete.push(key);
                }
            });
            keysToDelete.forEach((key) => params.delete(key));
            params.set('page', '1');
            router.push(`${pathname}?${params.toString()}`);
        },
        [router, pathname, searchParams],
    );

    return (
        <div className="flex flex-col gap-6">
            {/* Header row */}
            <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground">{t('filterTitle')}</h2>
                <button
                    type="button"
                    onClick={clearAll}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
                    aria-label={t('filterClear')}
                >
                    {t('filterClear')}
                </button>
            </div>

            {/* All Categories — radio-style list with subcategories */}
            {mounted && topLevelCategories.length > 0 && (
                <div className="flex flex-col gap-3">
                    <p className="text-sm font-semibold text-foreground">{t('allCategories')}</p>
                    <div className="flex flex-col gap-1">
                        {topLevelCategories.map((cat) => {
                            const isSelected = selectedCategory === cat.slug;
                            const hasChildren = (cat.children?.length ?? 0) > 0;
                            const isChildSelected = hasChildren && cat.children!.some(
                                (child) => selectedCategory === child.slug,
                            );
                            const isExpanded = isSelected || isChildSelected;

                            return (
                                <div key={cat._id}>
                                    <button
                                        type="button"
                                        onClick={() => handleCategorySelect(isSelected ? null : cat.slug)}
                                        className="flex items-center gap-2.5 py-1.5 px-1 rounded-md text-left transition-colors hover:bg-muted/60 w-full"
                                        aria-pressed={isSelected}
                                    >
                                        <span
                                            className={`shrink-0 size-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                                                isSelected || isChildSelected
                                                    ? 'border-primary'
                                                    : 'border-muted-foreground/40'
                                            }`}
                                        >
                                            {(isSelected || isChildSelected) && (
                                                <span className="size-2 rounded-full bg-primary" />
                                            )}
                                        </span>
                                        <span className={`text-sm flex-1 ${isSelected || isChildSelected ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                                            {cat.name}
                                        </span>
                                    </button>

                                    {/* Subcategories */}
                                    {hasChildren && isExpanded && (
                                        <div className="ml-6 mt-1 mb-1 flex flex-col gap-0.5 border-l-2 border-border pl-3">
                                            {cat.children!.map((child) => {
                                                const isChildSel = selectedCategory === child.slug;
                                                return (
                                                    <button
                                                        key={child._id}
                                                        type="button"
                                                        onClick={() => handleCategorySelect(isChildSel ? cat.slug : child.slug)}
                                                        className="flex items-center gap-2 py-1 px-1 rounded text-left transition-colors hover:bg-muted/60 w-full"
                                                        aria-pressed={isChildSel}
                                                    >
                                                        <span
                                                            className={`shrink-0 size-3 rounded-full border-2 flex items-center justify-center transition-colors ${
                                                                isChildSel
                                                                    ? 'border-primary'
                                                                    : 'border-muted-foreground/30'
                                                            }`}
                                                        >
                                                            {isChildSel && (
                                                                <span className="size-1.5 rounded-full bg-primary" />
                                                            )}
                                                        </span>
                                                        <span className={`text-xs ${isChildSel ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                                                            {child.name}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Price range — dual-thumb slider */}
            <div className="flex flex-col gap-3">
                <p className="text-sm font-medium text-foreground">{t('priceRange')}</p>

                <Slider
                    min={sliderMin}
                    max={sliderMax}
                    step={step}
                    value={localRange}
                    onValueChange={handleSliderChange}
                    className="w-full"
                    aria-label={t('priceRange')}
                />

                {/* Current values display */}
                <div className="flex items-center justify-between text-xs font-medium text-foreground">
                    <span>{localRange[0]}</span>
                    <span>{localRange[1]}</span>
                </div>
            </div>

            {/* In-stock toggle */}
            <div className="flex items-center justify-between gap-3">
                <Label
                    htmlFor="filter-in-stock"
                    className="text-sm font-medium text-foreground cursor-pointer"
                >
                    {t('inStock')}
                </Label>
                <Switch
                    id="filter-in-stock"
                    checked={isInStock}
                    onCheckedChange={(checked) =>
                        updateParam('inStock', checked ? 'true' : null)
                    }
                    aria-label={t('inStock')}
                />
            </div>

            {/* Tags — checkbox filter */}
            <TagsFilter
                searchParams={searchParams}
                updateParam={updateParam}
            />

            {/* Dynamic attribute groups — only shown when a category is selected (Req 4.11) */}
            {selectedCategory && availableFilters.attributes.length > 0 && (
                <div className="flex flex-col gap-5">
                    {availableFilters.attributes.map((attr) => {
                        const paramKey = `attributes[${attr.key}]`;
                        const selectedValues = (searchParams.get(paramKey) ?? '')
                            .split(',')
                            .filter(Boolean);

                        return (
                            <div key={attr.key} className="flex flex-col gap-2">
                                <p className="text-sm font-medium text-foreground">{attr.key}</p>
                                <div className="flex flex-col gap-1.5">
                                    {attr.values.map((val) => {
                                        const checkId = `filter-${attr.key}-${val}`;
                                        return (
                                            <div key={val} className="flex items-center gap-2">
                                                <Checkbox
                                                    id={checkId}
                                                    checked={selectedValues.includes(val)}
                                                    onCheckedChange={() =>
                                                        toggleAttributeValue(attr.key, val)
                                                    }
                                                    aria-label={`${attr.key}: ${val}`}
                                                />
                                                <Label
                                                    htmlFor={checkId}
                                                    className="text-sm text-foreground cursor-pointer"
                                                >
                                                    {val}
                                                </Label>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Tags Filter (internal sub-component) ─────────────────────────────────────

interface TagsFilterProps {
    searchParams: ReturnType<typeof useSearchParams>;
    updateParam: (key: string, value: string | null) => void;
}

function TagsFilter({ searchParams, updateParam }: TagsFilterProps) {
    const t = useTranslations('public.products');

    const { data } = usePublicQuery<any>(
        publicQueryKeys.tags,
        '/catalog/tags',
        { staleTime: 1000 * 60 * 10 },
    );

    const tags: Tag[] = (data as any)?.data?.tags ?? (data as any)?.tags ?? [];
    const selectedTags = (searchParams.get('tags') ?? '').split(',').filter(Boolean);

    const toggleTag = (slug: string) => {
        const updated = selectedTags.includes(slug)
            ? selectedTags.filter((s) => s !== slug)
            : [...selectedTags, slug];
        updateParam('tags', updated.length > 0 ? updated.join(',') : null);
    };

    if (tags.length === 0) return null;

    return (
        <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-foreground">{t('tagsLabel')}</p>
            <div className="flex flex-col gap-1.5">
                {tags.map((tag) => {
                    const checkId = `filter-tag-${tag.slug}`;
                    const isChecked = selectedTags.includes(tag.slug);
                    return (
                        <div key={tag._id} className="flex items-center gap-2">
                            <Checkbox
                                id={checkId}
                                checked={isChecked}
                                onCheckedChange={() => toggleTag(tag.slug)}
                                aria-label={tag.name}
                            />
                            <Label
                                htmlFor={checkId}
                                className="text-sm text-foreground cursor-pointer"
                            >
                                {tag.name}
                            </Label>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
