'use client';

/**
 * ProductInfo — product name, category breadcrumb, rating, and description.
 *
 * Layout (right column of the product detail page):
 *   - Category breadcrumb → links to /products?category={slug}
 *   - Product name (large, bold)
 *   - Rating + review count
 *   - SKU (when a variant is selected) — monospace, distinct weight
 *   - Description via RichContent (NEVER dangerouslySetInnerHTML directly)
 *
 * Rules:
 *   - Semantic tokens only — no hardcoded colours
 *   - All strings via t('public.product.*')
 *   - RichContent handles DOMPurify sanitisation — no extra sanitisation needed
 *
 * Requirements: 5.1 (description rendering)
 */

import { Rating } from '@/components/public/common/Rating';
import { useTranslations } from 'next-intl';
import type { ProductInfoProps } from './types';

// ─── Component ────────────────────────────────────────────────────────────────

export function ProductInfo({ product, selectedVariant }: ProductInfoProps) {
    const t = useTranslations('public.product');

    const { name, averageRating, reviewCount } = product;

    return (
        <div className="flex flex-col gap-5">
            {/* ── Product name ────────────────────────────────────────────── */}
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl leading-tight">
                {name}
            </h1>

            {/* ── Rating + review count ───────────────────────────────────── */}
            {(averageRating > 0 || reviewCount > 0) && (
                <div className="flex items-center gap-3">
                    <Rating
                        value={averageRating}
                        count={reviewCount}
                        size="md"
                        ariaLabel={`${averageRating.toFixed(1)} out of 5 — ${reviewCount} ${t('reviewsCount', { count: reviewCount })}`}
                    />
                    {reviewCount > 0 && (
                        <a
                            href="#reviews"
                            className="text-sm text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
                        >
                            {t('reviewsCount', { count: reviewCount })}
                        </a>
                    )}
                </div>
            )}

            {/* ── SKU (shown only when a variant is selected) ─────────────── */}
            {selectedVariant && (
                <p className="text-sm text-muted-foreground">
                    <span className="font-mono tracking-wide">
                        {t('sku', { sku: selectedVariant.sku })}
                    </span>
                </p>
            )}

        </div>
    );
}

export default ProductInfo;
