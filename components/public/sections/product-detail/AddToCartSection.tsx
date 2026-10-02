'use client';

/**
 * AddToCartSection — QuantityInput + "Add to Cart" button + Wishlist heart.
 *
 * Bulk buyer experience:
 * - Bulk buyers (hasBulkAccess) get a free-type number input (no max=10 limit)
 * - Shows bulk price tag when variant has bulkPricing
 * - Shows min order hint when quantity < minQuantity
 * - Shows effective price based on quantity
 *
 * Normal users:
 * - +/- stepper (1-10 range or up to inventory)
 * - No bulk pricing info shown
 *
 * Requirements: 5.8, 15.1
 */

import { CurrencyDisplay } from '@/components/public/common/CurrencyDisplay';
import { QuantityInput } from '@/components/public/common/QuantityInput';
import { useWishlistToggle } from '@/components/public/common/useWishlistToggle';
import { HeartIcon } from '@/components/ui/animated-icons/heart-icon';
import { ShoppingCartIcon } from '@/components/ui/animated-icons/shopping-cart-icon';
import { usePublicMutation } from '@/lib/api/public-hooks';
import { publicQueryKeys } from '@/lib/api/public-query-keys';
import { useHydrated } from '@/lib/hooks/useHydrated';
import { useCartDrawerStore } from '@/lib/stores/cart-drawer-store';
import { useCustomerAuthStore } from '@/lib/stores/customer-auth-store';
import { useGuestCartStore } from '@/lib/stores/guest-cart-store';
import type { Variant } from '@/types/public';
import { useQueryClient } from '@tanstack/react-query';
import { Truck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AddToCartSectionProps {
    productId: string;
    productName: string;
    productSlug: string;
    productImage: string | null;
    selectedVariant: Variant | null;
    /** Controlled quantity — lifted to parent so PriceDisplay can apply bulk pricing */
    quantity: number;
    onQuantityChange: (qty: number) => void;
}

interface AddToCartPayload {
    productId: string;
    variantId: string;
    quantity: number;
}

interface CartResponse {
    items: unknown[];
    itemCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findMatchingTier<T extends { minQty: number; maxQty: number | null }>(
    tiers: T[] | undefined,
    quantity: number,
): T | null {
    if (!tiers?.length) return null;
    return tiers.find(
        (t) => quantity >= t.minQty && (t.maxQty === null || quantity <= t.maxQty),
    ) ?? null;
}

function getDisplayPrice(
    variant: Variant,
    quantity: number,
    isBulkBuyer: boolean,
): { price: number; isBulk: boolean; tierLabel?: string } {
    const retailPrice = variant.effectivePrice;

    if (isBulkBuyer) {
        const tier = findMatchingTier(variant.bulkPricingTiers, quantity);
        if (tier) {
            const unitPrice = tier.type === 'fixed'
                ? tier.value
                : Math.round(retailPrice * (1 - tier.value / 100) * 100) / 100;
            return { price: unitPrice, isBulk: true, tierLabel: tier.type === 'percentage' ? `${tier.value}% off` : undefined };
        }
    } else {
        const tier = findMatchingTier(variant.retailDiscountTiers, quantity);
        if (tier) {
            const unitPrice = tier.type === 'fixed'
                ? tier.value
                : Math.round(retailPrice * (1 - tier.value / 100) * 100) / 100;
            return { price: unitPrice, isBulk: false, tierLabel: tier.type === 'percentage' ? `${tier.value}% off` : undefined };
        }
    }

    return { price: retailPrice, isBulk: false };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AddToCartSection({
    productId,
    productName,
    productSlug,
    productImage,
    selectedVariant,
    quantity,
    onQuantityChange,
}: AddToCartSectionProps) {
    const t = useTranslations('public.product');
    const queryClient = useQueryClient();

    const user = useCustomerAuthStore((s) => s.user);
    const isAuthenticated = !!user;
    const hydrated = useHydrated();
    // Only resolve bulk buyer status after hydration to prevent SSR mismatch
    const isBulkBuyer = hydrated ? (user?.hasBulkAccess ?? false) : false;

    const guestAddItem = useGuestCartStore((s) => s.addItem);
    const [isAddingToCart, setIsAddingToCart] = useState(false);

    // Wishlist toggle
    const { isWishlisted, toggle: toggleWishlist, isAuthenticated: wishlistAuth } =
        useWishlistToggle(productId);

    // Cart mutation
    const addToCartMutation = usePublicMutation<CartResponse, AddToCartPayload>(
        'post',
        '/orders/cart',
        {
            onMutate: async () => {
                await queryClient.cancelQueries({ queryKey: publicQueryKeys.cart });
                const previousCart = queryClient.getQueryData<CartResponse>(publicQueryKeys.cart);
                queryClient.setQueryData<CartResponse>(publicQueryKeys.cart, (old) => {
                    if (!old) return old;
                    return { ...old, itemCount: (old.itemCount ?? 0) + quantity };
                });
                return { previousCart };
            },
            onError: (err, _vars, context) => {
                const ctx = context as { previousCart?: CartResponse } | undefined;
                if (ctx?.previousCart !== undefined) {
                    queryClient.setQueryData(publicQueryKeys.cart, ctx.previousCart);
                }
                const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
                toast.error(message || t('addToCartError'));
            },
            onSettled: () => {
                queryClient.invalidateQueries({ queryKey: publicQueryKeys.cart });
            },
        },
    );

    // ─── Handlers ─────────────────────────────────────────────────────────────

    const handleAddToCart = async () => {
        if (!selectedVariant || !selectedVariant.available) return;

        setIsAddingToCart(true);
        try {
            if (isAuthenticated) {
                await addToCartMutation.mutateAsync({
                    productId,
                    variantId: selectedVariant._id,
                    quantity,
                });
                toast.success(t('addedToCart'));
                onQuantityChange(1);
            } else {
                guestAddItem({
                    productId,
                    variantId: selectedVariant._id,
                    quantity,
                    productName,
                    productSlug,
                    productImage,
                    variantSku: selectedVariant.sku,
                    variantAttributes: selectedVariant.attributes,
                    variantPrice: selectedVariant.price,
                    variantDiscountedPrice: selectedVariant.discountedPrice,
                });
                toast.success(t('addedToCart'));
                onQuantityChange(1);
            }
            // Open cart drawer after successful add
            useCartDrawerStore.getState().open();
        } catch {
            // onError already showed the toast
        } finally {
            setIsAddingToCart(false);
        }
    };

    const handleWishlistToggle = async () => {
        if (!wishlistAuth) {
            toast.error(t('wishlistLoginRequired'));
            return;
        }
        try { await toggleWishlist(); } catch { /* handled */ }
    };

    // ─── Derived state ────────────────────────────────────────────────────────

    const isButtonDisabled =
        isAddingToCart || selectedVariant === null || !selectedVariant.available || selectedVariant.inventory <= 0;

    // Determine effective max quantity based on user type and variant limits
    const effectiveMaxQty = (() => {
        if (!selectedVariant) return 99;
        if (!selectedVariant.available || selectedVariant.inventory <= 0) return 0;
        const stock = selectedVariant.inventory;
        const orderLimit = isBulkBuyer
            ? (selectedVariant.maxOrderQtyBulk ?? selectedVariant.maxOrderQty ?? null)
            : (selectedVariant.maxOrderQty ?? null);
        if (orderLimit) return Math.min(orderLimit, stock);
        return stock;
    })();

    const maxQuantity = effectiveMaxQty > 0 ? effectiveMaxQty : 1;

    // Whether a per-order limit is explicitly set (not just inventory)
    const hasOrderLimit = isBulkBuyer
        ? !!(selectedVariant?.maxOrderQtyBulk ?? selectedVariant?.maxOrderQty)
        : !!selectedVariant?.maxOrderQty;

    // Effective price display
    const priceInfo = selectedVariant
        ? getDisplayPrice(selectedVariant, quantity, isBulkBuyer)
        : null;

    // ─── Render ───────────────────────────────────────────────────────────────

    // Out of stock — show message prominently, hide quantity/cart controls
    const isOutOfStock = selectedVariant !== null && (!selectedVariant.available || selectedVariant.inventory <= 0);

    if (isOutOfStock) {
        return (
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
                    <span className="text-sm font-medium text-destructive">{t('outOfStock')}</span>
                </div>

                {/* Wishlist button — still available when out of stock */}
                <button
                    type="button"
                    onClick={handleWishlistToggle}
                    disabled={!hydrated || !wishlistAuth}
                    suppressHydrationWarning
                    className="inline-flex items-center justify-center gap-2 min-h-[44px] rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <HeartIcon
                        size={20}
                        filled={isWishlisted}
                        className={isWishlisted ? 'text-destructive' : 'text-muted-foreground'}
                    />
                    {isWishlisted ? t('removeFromWishlist') : t('addToWishlist')}
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {/* Quantity row */}
            <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground min-w-20">
                    {t('quantity')}
                </span>

                {/* Bulk buyers: free-type number input */}
                {isBulkBuyer ? (
                    <input
                        type="number"
                        min={1}
                        max={maxQuantity > 0 ? maxQuantity : undefined}
                        value={quantity}
                        onChange={(e) => {
                            const val = Math.max(1, Math.min(Number(e.target.value) || 1, maxQuantity));
                            onQuantityChange(val);
                        }}
                        disabled={isButtonDisabled}
                        className="w-28 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground text-center tabular-nums focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                        aria-label={t('quantity')}
                    />
                ) : (
                    /* Normal users: +/- stepper */
                    <QuantityInput
                        value={quantity}
                        min={1}
                        max={maxQuantity > 0 ? maxQuantity : 1}
                        onChange={onQuantityChange}
                        disabled={isButtonDisabled}
                    />
                )}
            </div>

            {/* Max order quantity hint */}
            {hasOrderLimit && (
                <p className="text-xs text-muted-foreground">
                    {t('maxOrderQty', { count: maxQuantity })}
                </p>
            )}

            {/* Minimum order hint removed — tiers handle this via the table */}

            {/* Total price line */}
            {priceInfo && selectedVariant && quantity > 0 && (
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2.5">
                    <span className="text-sm text-muted-foreground">
                        {t('total')} ({quantity} × <CurrencyDisplay amount={priceInfo.price} />)
                    </span>
                    <div className="flex items-baseline gap-2">
                        <CurrencyDisplay
                            amount={Math.round(priceInfo.price * quantity * 100) / 100}
                            className="text-lg font-bold text-foreground"
                        />
                        {priceInfo.price < selectedVariant.effectivePrice && (
                            <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                                {t('youSave')} <CurrencyDisplay amount={Math.round((selectedVariant.effectivePrice - priceInfo.price) * quantity * 100) / 100} />
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Free delivery badge — not shown for bulk buyers (flag is ignored for them) */}
            {selectedVariant?.freeDelivery && !isBulkBuyer && (
                <div className="flex items-center gap-2 rounded-lg bg-green-100 dark:bg-green-900/30 px-3 py-2">
                    <Truck className="size-4 text-green-700 dark:text-green-400 shrink-0" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">
                        {t('freeDelivery')}
                    </span>
                </div>
            )}

            {/* Add to Cart + Wishlist row */}
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={isButtonDisabled}
                    aria-label={t('addToCart')}
                    className={[
                        'flex flex-1 items-center justify-center gap-2',
                        'min-h-[44px] rounded-md px-6 py-3',
                        'bg-primary text-primary-foreground font-semibold text-sm',
                        'transition-all duration-150',
                        'hover:opacity-90 focus-visible:outline-none focus-visible:ring-2',
                        'focus-visible:ring-ring focus-visible:ring-offset-2',
                        isButtonDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                    ].join(' ')}
                >
                    <ShoppingCartIcon size={16} className="shrink-0 text-current" isAnimated={false} />
                    <span>{isAddingToCart ? t('addingToCart') : t('addToCart')}</span>
                </button>

                <button
                    type="button"
                    onClick={handleWishlistToggle}
                    aria-label={isWishlisted ? t('removeFromWishlist') : t('addToWishlist')}
                    aria-pressed={isWishlisted}
                    suppressHydrationWarning
                    className={[
                        'flex items-center justify-center',
                        'min-h-[44px] min-w-[44px] rounded-md border border-border',
                        'bg-background text-foreground',
                        'transition-all duration-150',
                        'hover:bg-muted focus-visible:outline-none focus-visible:ring-2',
                        'focus-visible:ring-ring focus-visible:ring-offset-2',
                        (!hydrated || wishlistAuth) ? 'cursor-pointer' : 'opacity-50',
                    ].join(' ')}
                >
                    <HeartIcon
                        size={20}
                        filled={isWishlisted}
                        className={isWishlisted ? 'text-destructive' : 'text-muted-foreground'}
                    />
                </button>
            </div>

            {/* Select variant hint */}
            {selectedVariant === null && (
                <p className="text-sm text-muted-foreground">{t('selectVariant')}</p>
            )}
        </div>
    );
}

export default AddToCartSection;
