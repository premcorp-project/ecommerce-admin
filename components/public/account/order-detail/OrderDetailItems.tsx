'use client';

/**
 * OrderDetailItems — renders the list of items in an order.
 *
 * Uses the populated variant data from the API response:
 * - item.product.images[0]?.url for the product image
 * - item.variant.sku for the SKU
 * - item.variant.attributes or item.variantAttributes for variant details
 * - item.price × item.quantity for line total
 * - item.isBulkPriceApplied for bulk pricing indicator
 *
 * Shows "Write Review" button for delivered/picked_up orders.
 */

import { CurrencyDisplay } from '@/components/public/common/CurrencyDisplay';
import { Package, Tag } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

// ─── Types (matching the actual API response) ─────────────────────────────────

interface OrderItemProduct {
    _id: string;
    name: string;
    slug?: string;
    images?: { url: string; publicId: string }[];
}

interface OrderItemVariant {
    _id: string;
    sku: string;
    attributes?: { key: string; value: string }[];
    price?: number;
    discountedPrice?: number | null;
    inventory?: number;
    image?: string | null;
}

interface OrderItemData {
    product: OrderItemProduct | string;
    variant: OrderItemVariant | string;
    variantAttributes?: { key: string; value: string }[];
    variantSku?: string;
    name: string;
    price: number;
    quantity: number;
    isBulkPriceApplied?: boolean;
}

// ─── Single item row ──────────────────────────────────────────────────────────

function OrderItemRow({ item }: { item: OrderItemData }) {
    const t = useTranslations('public.orders');

    // Resolve product data (can be populated object or just a string ID)
    const product = typeof item.product === 'object' ? item.product : null;
    const productName = product?.name ?? item.name;
    const productImage = product?.images?.[0]?.url ?? null;

    // Resolve variant data (can be populated object or just a string ID)
    const variant = typeof item.variant === 'object' ? item.variant : null;
    const sku = variant?.sku ?? item.variantSku ?? null;

    // Resolve attributes — prefer item.variantAttributes, fallback to variant.attributes
    const attrs = item.variantAttributes ?? variant?.attributes ?? [];
    const attributeLabel = Array.isArray(attrs)
        ? attrs.map((a) => `${a.key}: ${a.value}`).join(' · ')
        : '';

    // Line total
    const lineTotal = item.price * item.quantity;

    return (
        <div className="flex items-start gap-4 py-4 border-b border-border last:border-0">
            {/* Product image */}
            <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                {productImage ? (
                    <Image
                        src={productImage}
                        alt={productName}
                        fill
                        sizes="64px"
                        className="object-cover"
                    />
                ) : (
                    <Package
                        className="absolute inset-0 m-auto size-6 text-muted-foreground"
                        aria-hidden="true"
                    />
                )}
            </div>

            {/* Product info */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                    {productName}
                </p>

                {/* Variant attributes */}
                {attributeLabel && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Tag className="size-3 shrink-0" aria-hidden="true" />
                        {attributeLabel}
                    </p>
                )}

                {/* SKU */}
                {sku && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {t('lookup.sku', { sku })}
                    </p>
                )}

                {/* Quantity */}
                <p className="text-xs text-muted-foreground mt-0.5">
                    {t('lookup.qty', { qty: item.quantity })}
                </p>

                {/* Pricing type badge */}
                {item.isBulkPriceApplied && (
                    <span className="inline-flex items-center mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        Bulk Discount
                    </span>
                )}
                {!item.isBulkPriceApplied && (item as any).pricingType === 'retail_discount' && (
                    <span className="inline-flex items-center mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                        Quantity Discount
                    </span>
                )}
                {(item as any).pricingType === 'coupon_override' && (
                    <span className="inline-flex items-center mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                        Coupon Applied
                    </span>
                )}
            </div>

            {/* Pricing */}
            <div className="text-right shrink-0">
                <CurrencyDisplay
                    amount={lineTotal}
                    className="text-sm font-semibold text-foreground tabular-nums"
                />
                <p className="text-xs text-muted-foreground mt-0.5">
                    <CurrencyDisplay amount={item.price} className="tabular-nums" />
                    {' × '}{item.quantity}
                </p>
            </div>
        </div>
    );
}

// ─── Items section ────────────────────────────────────────────────────────────

interface OrderDetailItemsProps {
    items: any[];
    /** Order status — "Write Review" button shown only for delivered orders */
    orderStatus?: string;
}

export function OrderDetailItems({ items, orderStatus }: OrderDetailItemsProps) {
    const t = useTranslations('public.orders');

    return (
        <section aria-label={t('items')} className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-1">
                {t('items')} ({items.length})
            </h3>
            <div>
                {items.map((item, idx) => {
                    const key = typeof item.variant === 'object'
                        ? item.variant._id
                        : `${item.name}-${idx}`;

                    return (
                        <div key={key}>
                            <OrderItemRow item={item} />
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
