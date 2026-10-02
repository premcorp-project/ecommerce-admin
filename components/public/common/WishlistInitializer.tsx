'use client';

/**
 * WishlistInitializer — fetches wishlist IDs when user is authenticated.
 * Place in the public layout. Renders nothing.
 */

import { useCustomerAuthStore } from '@/lib/stores/customer-auth-store';
import { useWishlistStore } from '@/lib/stores/wishlist-store';
import { useEffect } from 'react';

export function WishlistInitializer() {
    const user = useCustomerAuthStore((s) => s.user);
    const { fetchIds, clear, loaded } = useWishlistStore();

    useEffect(() => {
        if (user) {
            if (!loaded) fetchIds();
        } else {
            clear();
        }
    }, [user, loaded, fetchIds, clear]);

    return null;
}
