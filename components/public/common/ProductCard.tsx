'use client';

/**
 * ProductCard — modern e-commerce product card.
 *
 * Layout: image area (aspect-square, object-contain) → body (name → price → rating row).
 *
 * Surfaces:
 *   - Wishlist heart: top-right of image (always visible, semantic destructive when active)
 *   - Discount badge: top-left of image when minOriginalPrice > minPrice
 *   - "New" badge: replaces discount badge when product is recently added (createdAt < 14 days)
 *   - Stock badge: above the name when low/out of stock (skipped when in stock to keep cards calm)
 *   - "View" affordance: on hover, a subtle CTA pill slides up from the bottom of the image
 *
 * The previous "add to cart" placeholder button was non-functional (no variantId on listing
 * responses) and has been removed in favour of a clearer hover affordance that links to the
 * product detail page where the variant selector lives.
 */

import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay';
import { cn } from '@/lib/utils';
import type { Product } from '@/types/public';
import { ArrowRight, Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Rating } from './Rating';
import { useWishlistToggle } from './useWishlistToggle';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProductCardProps {
    product: Product;
    className?: string;
    /** Set true for above-the-fold cards to prioritise image loading */
    priority?: boolean;
    /**
     * Show a "New" badge on the card when the product was created recently.
     * Off by default — opt in only on contexts where "newness" is meaningful
     * (e.g. the New Arrivals carousel). Avoid using everywhere or every product
     * looks identical on a freshly-seeded catalogue.
     */
    showNewBadge?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDiscountPercent(price: number, original: number): number {
    if (!original || original <= price) return 0;
    return Math.round(((original - price) / original) * 100);
}

function isNewArrival(createdAt: string | undefined): boolean {
    if (!createdAt) return false;
    const created = new Date(createdAt).getTime();
    if (Number.isNaN(created)) return false;
    const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;
    return Date.now() - created < FOURTEEN_DAYS;
}

// ─── Price sub-component ──────────────────────────────────────────────────────

function ProductCardPrice({
    minPrice,
    minOriginalPrice,
    t,
}: {
    minPrice: number | null;
    minOriginalPrice: number | null;
    t: ReturnType<typeof useTranslations<'public.products'>>;
}) {
    if (minPrice === null || minPrice === undefined || !isFinite(minPrice)) {
        return (
            <span className="text-sm font-medium text-primary">
                {t('viewForPrice')}
            </span>
        );
    }

    const hasDiscount = minOriginalPrice != null && minOriginalPrice > minPrice;

    return (
        <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-lg font-bold text-foreground tabular-nums">
                <CurrencyDisplay amount={minPrice} />
            </span>
            {hasDiscount ? (
                <span className="text-sm text-muted-foreground line-through tabular-nums">
                    <CurrencyDisplay amount={minOriginalPrice} />
                </span>
            ) : (
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {t('fromLabel')}
                </span>
            )}
        </div>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProductCard({ product, className, priority = false, showNewBadge = false }: ProductCardProps) {
    const t = useTranslations('public.products');
    const { isWishlisted, toggle: toggleWishlist, isAuthenticated } = useWishlistToggle(product._id);
    const [imgError, setImgError] = useState(false);

    const primaryImage = product.images[0]?.url ?? null;
    const secondaryImage = product.images[1]?.url ?? null;

    // Only treat as out-of-stock when the API explicitly says so. If the field
    // is missing (some listing responses, or older cached items in localStorage)
    // we keep the card neutral rather than wrongly flagging it as out of stock.
    const isExplicitlyOutOfStock =
        product.available === false || product.inventory === 0;
    const isExplicitlyLowStock =
        !isExplicitlyOutOfStock &&
        typeof product.inventory === 'number' &&
        product.inventory > 0 &&
        product.inventory <= 10;

    const discountPercent =
        product.minPrice != null && product.minOriginalPrice != null
            ? getDiscountPercent(product.minPrice, product.minOriginalPrice)
            : 0;
    const renderNewBadge =
        showNewBadge && !discountPercent && isNewArrival((product as any).createdAt);
    const handleWishlistClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isAuthenticated) {
            toast(t('loginToWishlist'));
            return;
        }
        toggleWishlist();
    };

    return (
        <div className={cn('relative group h-full', className)}>
            {/* ── Wishlist heart — always visible for discoverability ───── */}
            <button
                type="button"
                onClick={handleWishlistClick}
                aria-label={isWishlisted ? t('removeFromWishlist') : t('addToWishlist')}
                aria-pressed={isWishlisted}
                className={cn(
                    'absolute top-3 right-3 z-20 flex items-center justify-center size-9 rounded-full transition-all duration-200',
                    'border border-border bg-background/90 backdrop-blur-sm shadow-sm',
                    'hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isWishlisted
                        ? 'text-destructive border-destructive/30'
                        : 'text-muted-foreground hover:text-destructive',
                )}
            >
                <Heart
                    className="size-4 transition-transform"
                    fill={isWishlisted ? 'currentColor' : 'none'}
                    aria-hidden="true"
                />
            </button>

            {/* ── Card body wrapped in link ─────────────────────────────── */}
            <Link
                href={`/products/${product.slug}`}
                className={cn(
                    'flex flex-col h-full bg-card border border-border rounded-xl overflow-hidden',
                    'transition-all duration-200',
                    'group-hover:border-primary group-hover:shadow-lg group-hover:shadow-primary/10 group-hover:-translate-y-1',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                )}
                aria-label={product.name}
            >
                {/* ── Image area ─────────────────────────────────────── */}
                <div className="relative aspect-square bg-card overflow-hidden">
                    {primaryImage && !imgError ? (
                        <>
                            <Image
                                src={primaryImage}
                                alt={product.name}
                                fill
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                className={cn(
                                    'object-contain p-3 transition-opacity duration-300',
                                    secondaryImage && 'group-hover:opacity-0',
                                )}
                                priority={priority}
                                onError={() => setImgError(true)}
                            />
                            {secondaryImage && (
                                <Image
                                    src={secondaryImage}
                                    alt={product.name}
                                    fill
                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                    className="object-contain p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                                    aria-hidden="true"
                                    onError={() => {}}
                                />
                            )}
                        </>
                    ) : (
                        <div className="flex items-center justify-center size-full text-muted-foreground bg-muted/40">
                            <span className="text-xs">{t('noImage')}</span>
                        </div>
                    )}

                    {/* Top-left badge — discount or new */}
                    {discountPercent > 0 && (
                        <span
                            className="absolute top-3 left-3 z-10 inline-flex items-center rounded-md bg-destructive px-2 py-0.5 text-[11px] font-bold text-destructive-foreground shadow-sm tabular-nums"
                            aria-label={`${discountPercent}% off`}
                        >
                            -{discountPercent}%
                        </span>
                    )}
                    {renderNewBadge && (
                        <span className="absolute top-3 left-3 z-10 inline-flex items-center rounded-md bg-primary px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary-foreground shadow-sm">
                            {t('newBadge')}
                        </span>
                    )}

                    {/* Hover affordance — subtle "View" pill slides up from the bottom */}
                    <div
                        aria-hidden="true"
                        className={cn(
                            'pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-3',
                            'translate-y-3 opacity-0 transition-all duration-300',
                            'group-hover:translate-y-0 group-hover:opacity-100',
                        )}
                    >
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-md">
                            {t('viewProduct')}
                            <ArrowRight className="size-3.5" aria-hidden="true" />
                        </span>
                    </div>
                </div>

                {/* ── Body ───────────────────────────────────────────── */}
                <div className="flex flex-col gap-2 p-4 flex-1">
                    {/* Stock indicator — only when notable (low or out) */}
                    {isExplicitlyOutOfStock && (
                        <span className="inline-flex w-fit items-center rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-800 dark:bg-red-900/30 dark:text-red-400">
                            {t('outOfStock')}
                        </span>
                    )}
                    {isExplicitlyLowStock && (
                        <span className="inline-flex w-fit items-center rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-semibold text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                            {t('lowStock')}
                        </span>
                    )}

                    {/* Category — small subtle label for context */}
                    {product.category?.name && (
                        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider truncate">
                            {product.category.name}
                        </span>
                    )}

                    {/* Product name */}
                    <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug min-h-[2.5rem] group-hover:text-primary transition-colors">
                        {product.name}
                    </h3>

                    {/* Rating — always rendered to keep card heights consistent.
                        Falls back to a "no reviews yet" treatment when there are none. */}
                    {product.reviewCount > 0 ? (
                        <Rating
                            value={product.averageRating}
                            count={product.reviewCount}
                            size="sm"
                        />
                    ) : (
                        <Rating
                            value={0}
                            size="sm"
                            ariaLabel={t('noReviewsYet')}
                            className="opacity-60"
                        />
                    )}

                    {/* Price — pinned to bottom */}
                    <div className="mt-auto pt-1">
                        <ProductCardPrice
                            minPrice={product.minPrice}
                            minOriginalPrice={product.minOriginalPrice}
                            t={t}
                        />
                    </div>
                </div>
            </Link>
        </div>
    );
}

export default ProductCard;
