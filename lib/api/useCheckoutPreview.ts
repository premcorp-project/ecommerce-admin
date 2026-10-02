'use client';

/**
 * useCheckoutPreview — calls POST /orders/checkout-preview to get
 * server-calculated pricing for the current cart.
 *
 * Works for all user types:
 * - Auth (normal): sends {} or { addressId, couponCode }
 * - Auth (bulk): sends {} or { addressId }
 * - Guest: sends { items, city? }
 *
 * Returns the full breakdown: per-item pricing, subtotal, delivery, tax, total.
 *
 * Cart editing is blocked during checkout (cart drawer disabled), so the preview
 * only needs to reload on address/coupon/delivery-method changes — not cart changes.
 */

import { usePublicMutation } from '@/lib/api/public-hooks';
import { useCustomerAuthStore } from '@/lib/stores/customer-auth-store';
import { useGuestCartStore } from '@/lib/stores/guest-cart-store';
import { useCallback, useEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PreviewTierApplied {
    type: 'percentage' | 'fixed';
    value: number;
}

export interface PreviewItem {
    product: { _id: string; name: string; image?: string };
    variant: {
        _id: string;
        sku: string;
        attributes: { key: string; value: string }[];
        weight?: number;
        freeDelivery?: boolean;
    };
    quantity: number;
    basePrice: number;
    unitPrice: number;
    pricingType: 'bulk_tier' | 'retail_discount' | 'coupon_override' | 'retail';
    tierApplied: PreviewTierApplied | null;
    lineTotal: number;
    savings: number;
}

export interface CheckoutPreviewData {
    items: PreviewItem[];
    subtotalBeforeDiscount: number;
    subtotal: number;
    totalSavings: number;
    discount: number;
    couponCode: string | null;
    deliveryFee: number | null;
    deliveryWeight: number | null;
    totalWeight: number | null;
    taxRate: number;
    taxAmount: number;
    total: number;
    currency: string;
    isBulkBuyer: boolean;
}

interface PreviewRequest {
    addressId?: string;
    couponCode?: string;
    city?: string;
    deliveryMethod?: string;
    items?: { productId: string; variantId: string; quantity: number }[];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCheckoutPreview() {
    const { user } = useCustomerAuthStore();
    const isAuthenticated = !!user;
    const { items: guestItems } = useGuestCartStore();

    const [preview, setPreview] = useState<CheckoutPreviewData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Store last-used params so subsequent calls preserve context
    const lastParamsRef = useRef<{
        addressId?: string;
        couponCode?: string;
        city?: string;
        deliveryMethod?: string;
    } | undefined>(undefined);

    const { mutateAsync: fetchPreview } = usePublicMutation<
        { data: CheckoutPreviewData },
        PreviewRequest
    >('post', '/orders/checkout-preview');

    const loadPreview = useCallback(
        async (params?: { addressId?: string; couponCode?: string; city?: string; deliveryMethod?: string }) => {
            if (params) lastParamsRef.current = params;
            const effectiveParams = params ?? lastParamsRef.current;

            setIsLoading(true);
            setError(null);
            try {
                const payload: PreviewRequest = {};

                if (effectiveParams?.addressId) payload.addressId = effectiveParams.addressId;
                if (effectiveParams?.couponCode) payload.couponCode = effectiveParams.couponCode;
                if (effectiveParams?.deliveryMethod) payload.deliveryMethod = effectiveParams.deliveryMethod;

                if (!isAuthenticated) {
                    payload.items = guestItems.map((item) => ({
                        productId: item.productId,
                        variantId: item.variantId,
                        quantity: item.quantity,
                    }));
                    if (effectiveParams?.city) payload.city = effectiveParams.city;
                }

                const response = await fetchPreview(payload);
                const data = (response as any)?.data?.data ?? (response as any)?.data ?? response;
                setPreview(data as CheckoutPreviewData);
                return data as CheckoutPreviewData;
            } catch (err: unknown) {
                const axiosErr = err as { response?: { status?: number; data?: { message?: string } } };
                const message = axiosErr?.response?.data?.message ?? 'Failed to load preview';
                setError(message);
                return null;
            } finally {
                setIsLoading(false);
            }
        },
        [isAuthenticated, guestItems, fetchPreview],
    );

    // Stable serialization of guest items for dependency tracking
    const guestItemsKey = guestItems.map((i) => `${i.variantId}:${i.quantity}`).join(',');

    // Debounce timer ref
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Auto-load on mount and whenever guest cart items change
    useEffect(() => {
        if (!isAuthenticated && guestItems.length === 0) return;

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            loadPreview();
        }, 300);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, guestItemsKey]);

    return {
        preview,
        isLoading,
        error,
        loadPreview,
    };
}
