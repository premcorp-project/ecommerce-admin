'use client';

/**
 * useCartMerge — merges the GuestCart into the server cart on login.
 *
 * Call this hook after a successful login. It:
 * 1. Reads all items from GuestCartStore
 * 2. Calls POST /orders/cart for each item (sequentially to avoid race conditions)
 * 3. Clears the GuestCart from localStorage
 * 4. Invalidates the ['public', 'cart'] query so the Navbar and CartDrawer refresh
 */

import { useGuestCartStore } from '@/lib/stores/guest-cart-store';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import publicApi from '../api/public-api';
import { publicQueryKeys } from '../api/public-query-keys';

export function useCartMerge() {
    const queryClient = useQueryClient();
    const { items, clearCart } = useGuestCartStore();

    const mergeCart = useCallback(async (): Promise<void> => {
        if (items.length === 0) return;

        let failedCount = 0;

        // POST each guest cart item to the server cart sequentially
        for (const item of items) {
            try {
                await publicApi.post('/orders/cart', {
                    productId: item.productId,
                    variantId: item.variantId,
                    quantity: item.quantity,
                });
            } catch {
                // Skip failed items silently — likely out of stock or exceeds limit
                failedCount++;
            }
        }

        // Clear the guest cart from localStorage
        clearCart();

        // Invalidate the server cart query so UI reflects the merged state
        await queryClient.invalidateQueries({ queryKey: publicQueryKeys.cart });

        return failedCount > 0 ? Promise.reject(failedCount) : Promise.resolve();
    }, [items, clearCart, queryClient]);

    return { mergeCart };
}
