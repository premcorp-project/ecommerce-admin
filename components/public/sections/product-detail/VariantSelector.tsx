'use client';

/**
 * VariantSelector
 *
 * Renders one button group per `variantAttribute` key (e.g. "Volume", "Concentration").
 *
 * Availability logic:
 *   A value is "unavailable" if no variant exists that:
 *     - matches ALL currently selected values for OTHER keys, AND
 *     - has this value for THIS key, AND
 *     - is `available: true`
 *
 * Resolution logic:
 *   `selectedVariant` is resolved only when ALL attribute keys have a selection.
 *   `onVariantChange(null)` is called whenever the selection is incomplete.
 *
 * Requirements: 5.3, 5.4
 */

import { cn } from '@/lib/utils';
import type { Variant, VariantAttribute } from '@/types/public';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';
import type { VariantSelectorProps } from './types';

export function VariantSelector({
    product,
    onVariantChange,
    selectedVariant: controlledVariant,
}: VariantSelectorProps) {
    const t = useTranslations('public.product');

    // Track selected value per attribute key
    const [selections, setSelections] = useState<Record<string, string>>(() => {
        // If a controlled variant is provided, pre-populate selections from it
        if (controlledVariant) {
            return Object.fromEntries(
                controlledVariant.attributes.map(
                    (a: { key: string; value: string }) => [a.key, a.value]
                )
            );
        }
        return {};
    });

    const variants: Variant[] = product.variants ?? [];
    const attributeKeys: string[] = (product.variantAttributes ?? []).map(
        (a: VariantAttribute) => a.key
    );

    /**
     * Determine whether a given (key, value) pair is available given the
     * current partial selections.
     *
     * A value is available if at least one variant:
     *   1. Has this value for this key
     *   2. Matches ALL other currently-selected keys
     *   3. Is `available: true`
     */
    const isValueAvailable = useCallback(
        (key: string, value: string): boolean => {
            // Build a test selection that includes this candidate value
            const testSelections: Record<string, string> = { ...selections, [key]: value };

            return variants.some((variant: Variant) => {
                if (!variant.available) return false;

                // Check every key that has a selection in testSelections
                return Object.entries(testSelections).every(
                    ([k, v]: [string, string]) =>
                        variant.attributes.some(
                            (a: { key: string; value: string }) =>
                                a.key === k && a.value === v
                        )
                );
            });
        },
        [selections, variants]
    );

    /**
     * Resolve the matching variant when all keys are selected.
     * Returns null if any key is missing or no exact match exists.
     */
    const resolveVariant = useCallback(
        (currentSelections: Record<string, string>): Variant | null => {
            // All keys must be selected
            if (attributeKeys.some((k: string) => !currentSelections[k])) return null;

            return (
                variants.find((v: Variant) =>
                    v.attributes.every(
                        (a: { key: string; value: string }) =>
                            currentSelections[a.key] === a.value
                    )
                ) ?? null
            );
        },
        [attributeKeys, variants]
    );

    const handleSelect = useCallback(
        (key: string, value: string) => {
            // Toggle off if already selected
            const isSameValue = selections[key] === value;
            const next: Record<string, string> = isSameValue
                ? (() => {
                      const copy = { ...selections };
                      delete copy[key];
                      return copy;
                  })()
                : { ...selections, [key]: value };

            setSelections(next);
            onVariantChange(resolveVariant(next));
        },
        [selections, resolveVariant, onVariantChange]
    );

    // Derive the currently resolved variant for display purposes
    const resolvedVariant = useMemo(
        () => resolveVariant(selections),
        [resolveVariant, selections]
    );

    if (attributeKeys.length === 0) return null;

    return (
        <div className="flex flex-col gap-5">
            {product.variantAttributes.map((attr: VariantAttribute) => {
                const selectedValue = selections[attr.key];

                return (
                    <div key={attr.key}>
                        {/* Attribute label */}
                        <p className="mb-2 text-sm font-medium text-foreground">
                            {attr.key}
                            {selectedValue ? (
                                <span className="ml-1 font-normal text-muted-foreground">
                                    : {selectedValue}
                                </span>
                            ) : (
                                <span className="ml-1 font-normal text-muted-foreground">
                                    {' '}
                                    —{' '}
                                    {t('selectVariantHint', { attribute: attr.key })}
                                </span>
                            )}
                        </p>

                        {/* Button group */}
                        <div
                            className="flex flex-wrap gap-2"
                            role="group"
                            aria-label={attr.key}
                        >
                            {attr.values.map((val: string) => {
                                const available = isValueAvailable(attr.key, val);
                                const isSelected = selectedValue === val;

                                return (
                                    <button
                                        key={val}
                                        type="button"
                                        disabled={!available}
                                        onClick={() => handleSelect(attr.key, val)}
                                        aria-pressed={isSelected}
                                        aria-label={
                                            available
                                                ? `${attr.key}: ${val}`
                                                : `${t('variantUnavailable')} — ${attr.key}: ${val}`
                                        }
                                        className={cn(
                                            // Base — touch target min 44×44px
                                            'relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center',
                                            'rounded-md border px-4 py-2 text-sm font-medium',
                                            'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                            // Selected state
                                            isSelected && [
                                                'border-primary bg-primary text-primary-foreground',
                                                'hover:bg-primary/90',
                                            ],
                                            // Available, not selected
                                            !isSelected &&
                                                available && [
                                                    'border-border bg-background text-foreground',
                                                    'hover:border-primary hover:bg-muted',
                                                ],
                                            // Unavailable
                                            !available && [
                                                'cursor-not-allowed border-border/50 bg-muted/50',
                                                'text-muted-foreground line-through opacity-50',
                                            ]
                                        )}
                                    >
                                        {val}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })}

            {/* SKU display when a variant is resolved */}
            {resolvedVariant && (
                <p className="text-xs text-muted-foreground">
                    {t('sku', { sku: resolvedVariant.sku })}
                </p>
            )}
        </div>
    );
}

export default VariantSelector;
