/**
 * Guest Cart Store — Zustand store backed by localStorage['chemibuild_guest_cart'].
 *
 * Rules:
 * - All operations are synchronous — no API calls, no loading states.
 * - Used only for unauthenticated (guest) users.
 * - On login, useCartMerge reads this store, syncs to server, then clears it.
 */

import { create } from 'zustand';

const STORAGE_KEY = 'chemibuild_guest_cart';

// --- Types ---

export interface GuestCartItem {
    productId: string;
    variantId: string;
    quantity: number;
    // Denormalised display data stored at add-to-cart time for rendering
    productName: string;
    productSlug: string;
    productImage: string | null;
    variantSku: string;
    variantAttributes: { key: string; value: string }[];
    variantPrice: number;
    variantDiscountedPrice: number | null;
}

export interface GuestCartState {
    items: GuestCartItem[];
    itemCount: number;
    addItem: (item: GuestCartItem) => void;
    updateItem: (variantId: string, quantity: number) => void;
    removeItem: (variantId: string) => void;
    clearCart: () => void;
}

// --- localStorage helpers ---

function loadFromStorage(): GuestCartItem[] {
    try {
        if (typeof window === 'undefined') return [];
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        return JSON.parse(raw) as GuestCartItem[];
    } catch {
        return [];
    }
}

function saveToStorage(items: GuestCartItem[]): void {
    try {
        if (typeof window === 'undefined') return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
        console.error('[GuestCartStore] Error saving to localStorage:', error);
    }
}

function computeItemCount(items: GuestCartItem[]): number {
    return items.reduce((sum, item) => sum + item.quantity, 0);
}

// --- Store ---

const initialItems = loadFromStorage();

export const useGuestCartStore = create<GuestCartState>(() => ({
    items: initialItems,
    itemCount: computeItemCount(initialItems),

    addItem: (newItem: GuestCartItem) => {
        const { items } = useGuestCartStore.getState();
        const existingIndex = items.findIndex((i) => i.variantId === newItem.variantId);

        let updatedItems: GuestCartItem[];
        if (existingIndex >= 0) {
            // Increment quantity if variant already in cart
            updatedItems = items.map((item, idx) =>
                idx === existingIndex
                    ? { ...item, quantity: item.quantity + newItem.quantity }
                    : item,
            );
        } else {
            updatedItems = [...items, newItem];
        }

        saveToStorage(updatedItems);
        useGuestCartStore.setState({
            items: updatedItems,
            itemCount: computeItemCount(updatedItems),
        });
    },

    updateItem: (variantId: string, quantity: number) => {
        const { items } = useGuestCartStore.getState();

        let updatedItems: GuestCartItem[];
        if (quantity <= 0) {
            updatedItems = items.filter((i) => i.variantId !== variantId);
        } else {
            updatedItems = items.map((item) =>
                item.variantId === variantId ? { ...item, quantity } : item,
            );
        }

        saveToStorage(updatedItems);
        useGuestCartStore.setState({
            items: updatedItems,
            itemCount: computeItemCount(updatedItems),
        });
    },

    removeItem: (variantId: string) => {
        const { items } = useGuestCartStore.getState();
        const updatedItems = items.filter((i) => i.variantId !== variantId);

        saveToStorage(updatedItems);
        useGuestCartStore.setState({
            items: updatedItems,
            itemCount: computeItemCount(updatedItems),
        });
    },

    clearCart: () => {
        saveToStorage([]);
        useGuestCartStore.setState({ items: [], itemCount: 0 });
    },
}));
