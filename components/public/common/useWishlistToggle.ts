'use client';

/**
 * useWishlistToggle — lightweight hook for wishlist heart button.
 *
 * Uses the global WishlistStore (fetches all IDs once via /wishlist/ids).
 * Zero per-product API calls for checking status.
 * Optimistic toggle with automatic revert on error.
 * Invalidates the wishlist query cache so the wishlist page stays fresh.
 */

import { publicQueryKeys } from '@/lib/api/public-query-keys';
import { useCustomerAuthStore } from '@/lib/stores/customer-auth-store';
import { useWishlistStore } from '@/lib/stores/wishlist-store';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export function useWishlistToggle(productId: string) {
    const user = useCustomerAuthStore((s) => s.user);
    const isAuthenticated = !!user;
    const { isWishlisted: checkWishlisted, toggle: storeToggle } = useWishlistStore();
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);

    const isWishlisted = isAuthenticated ? checkWishlisted(productId) : false;

    const toggle = async () => {
        if (!isAuthenticated || !productId || loading) return;
        setLoading(true);
        try {
            await storeToggle(productId);
            // Invalidate wishlist page cache so it refetches
            queryClient.invalidateQueries({ queryKey: publicQueryKeys.wishlist });
        } catch {
            // Store handles revert internally
        } finally {
            setLoading(false);
        }
    };

    return { isWishlisted, toggle, isAuthenticated, loading };
}
