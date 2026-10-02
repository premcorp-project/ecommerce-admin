/**
 * Cart Drawer Store — controls the open/close state of the CartDrawer globally.
 *
 * Used by:
 * - Navbar: reads `isOpen` to render the drawer, calls `close()` on dismiss
 * - AddToCartSection: calls `open()` after successful add-to-cart
 * - CartDrawer: calls `close()` on "Proceed to Checkout" navigation
 *
 * Note: Cart icon is hidden on /checkout to prevent stale pricing issues.
 */

import { create } from 'zustand';

interface CartDrawerState {
    isOpen: boolean;
    open: () => void;
    close: () => void;
}

export const useCartDrawerStore = create<CartDrawerState>((set) => ({
    isOpen: false,
    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),
}));
