'use client';

/**
 * TabbedProductRow — compact product row for the tabbed product list.
 *
 * Renders a single product as a flex row with image, name, price, and rating.
 * The entire row is a link to the product detail page.
 * Handles null minPrice gracefully by showing a "Price on request" fallback.
 *
 * Requirements: 8.2, 13.2, 13.3
 */

import CurrencyDisplay from '@/components/public/common/CurrencyDisplay';
import Rating from '@/components/public/common/Rating';
import type { TabbedProductRowProps } from '@/components/public/sections/tabbed-products/TabbedProductsSection.types';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';

// ─── Component ────────────────────────────────────────────────────────────────

export function TabbedProductRow({ product }: TabbedProductRowProps) {
    const t = useTranslations('public.home.tabs');

    const imageUrl = product.images?.[0]?.url ?? null;

    return (
        <Link
            href={`/products/${product.slug}`}
            data-testid="tabbed-product-row"
            className="flex items-center gap-3 py-3 border-b border-border last:border-0 hover:bg-muted/40 transition-colors rounded-sm -mx-1 px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
            {/* Product image */}
            <div className="shrink-0">
                {imageUrl ? (
                    <Image
                        src={imageUrl}
                        alt={product.name}
                        width={64}
                        height={64}
                        className="rounded-md object-cover shrink-0 bg-muted size-16"
                        style={{ width: 64, height: 64 }}
                    />
                ) : (
                    <div
                        className="size-16 rounded-md bg-muted shrink-0 flex items-center justify-center"
                        aria-hidden="true"
                    />
                )}
            </div>

            {/* Product info */}
            <div className="flex flex-col gap-1 flex-1 min-w-0">
                {/* Name */}
                <p className="text-sm font-medium text-foreground line-clamp-2">
                    {product.name}
                </p>

                {/* Price */}
                <p className="text-xs text-muted-foreground">
                    {product.minPrice !== null ? (
                        <>
                            {t('fromLabel')}{' '}
                            <CurrencyDisplay amount={product.minPrice} />
                        </>
                    ) : (
                        t('priceOnRequest')
                    )}
                </p>

                {/* Rating */}
                <Rating value={product.averageRating} size="sm" />
            </div>
        </Link>
    );
}

export default TabbedProductRow;
