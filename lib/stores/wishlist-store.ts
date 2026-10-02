'use client';

/**
 * Wishlist Store — global state for wishlisted product IDs.
 *
 * Uses the efficient /wishlist/ids endpoint (one call) instead of
 * per-product /wishlist/check/:id calls.
 *
 * Flow:
 * 1. On auth → fetch GET /wishlist/ids → populate the Set
 * 2. isWishlisted(productId) → local Set lookup (zero API calls)
 * 3. toggle(productId) → optimistic update + API call
 * 4. On logout → clear the Set
 */

import publicApi from '@/lib/api/public-api';
import { create } from 'zustand';

interface WishlistStore {
    /** Set of wishlisted product IDs */
    ids: Set<string>;
    /** Map of productId → wishlist item _id (for DELETE) */
    itemIds: Map<string, string>;
    /** Whether the initial fetch has completed */
    loaded: boolean;
    /** Fetch all wishlist IDs from backend */
    fetchIds: () => Promise<void>;
    /** Check if a product is wishlisted (local lookup) */
    isWishlisted: (productId: string) => boolean;
    /** Add a product to wishlist */
    add: (productId: string) => Promise<void>;
    /** Remove a product from wishlist */
    remove: (productId: string) => Promise<void>;
    /** Toggle wishlist status */
    toggle: (productId: string) => Promise<void>;
    /** Clear all state (on logout) */
    clear: () => void;
    /** Count of wishlisted items */
    count: () => number;
}

export const useWishlistStore = create<WishlistStore>((set, get) => ({
    ids: new Set(),
    itemIds: new Map(),
    loaded: false,

    fetchIds: async () => {
        try {
            const res = await publicApi.get('/wishlist/ids');
            const productIds: string[] = res.data?.data?.productIds ?? res.data?.productIds ?? [];
            set({ ids: new Set(productIds), loaded: true });
        } catch {
            set({ loaded: true });
        }
    },

    isWishlisted: (productId: string) => {
        return get().ids.has(productId);
    },

    add: async (productId: string) => {
        // Optimistic add
        set((state) => {
            const newIds = new Set(state.ids);
            newIds.add(productId);
            return { ids: newIds };
        });

        try {
            const res = await publicApi.post('/wishlist', { productId });
            const itemId = res.data?.data?.item?._id ?? res.data?.data?._id;
            if (itemId) {
                set((state) => {
                    const newMap = new Map(state.itemIds);
                    newMap.set(productId, itemId);
                    return { itemIds: newMap };
                });
            }
        } catch (err: unknown) {
            const status = (err as any)?.response?.status;
            if (status !== 409) {
                // Revert on error (409 = already wishlisted, keep it)
                set((state) => {
                    const newIds = new Set(state.ids);
                    newIds.delete(productId);
                    return { ids: newIds };
                });
                throw err;
            }
        }
    },

    remove: async (productId: string) => {
        // Need the itemId for DELETE — fetch it if not cached
        let itemId = get().itemIds.get(productId);
        if (!itemId) {
            try {
                const res = await publicApi.get(`/wishlist/check/${productId}`);
                itemId = res.data?.data?.itemId ?? res.data?.itemId;
            } catch {
                // Can't get itemId — abort
                return;
            }
        }
        if (!itemId) return;

        // Optimistic remove
        set((state) => {
            const newIds = new Set(state.ids);
            newIds.delete(productId);
            const newMap = new Map(state.itemIds);
            newMap.delete(productId);
            return { ids: newIds, itemIds: newMap };
        });

        try {
            await publicApi.delete(`/wishlist/${itemId}`);
        } catch {
            // Revert on error
            set((state) => {
                const newIds = new Set(state.ids);
                newIds.add(productId);
                return { ids: newIds };
            });
        }
    },

    toggle: async (productId: string) => {
        if (get().ids.has(productId)) {
            await get().remove(productId);
        } else {
            await get().add(productId);
        }
    },

    clear: () => {
        set({ ids: new Set(), itemIds: new Map(), loaded: false });
    },

    count: () => get().ids.size,
}));
