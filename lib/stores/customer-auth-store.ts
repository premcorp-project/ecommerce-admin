/**
 * Customer Auth Store — Zustand store for the public customer storefront.
 *
 * Persists to sessionStorage (NOT localStorage) using CryptoJS AES encryption.
 * Completely separate from the admin auth store — never import this in admin code.
 */

import CryptoJS from 'crypto-js';
import { create } from 'zustand';

const SECRET_KEY = process.env.NEXT_PUBLIC_AUTH_SECRET_KEY as string;
const STORAGE_KEY = 'chemibuild_customer_auth';

// --- Types ---

export interface CustomerUser {
    _id: string;
    name: string;
    email: string;
    role: string;
    hasBulkAccess: boolean;  // controls bulk pricing visibility
    hasCODAccess: boolean;   // controls COD payment method availability
}

export interface CustomerAuthState {
    user: CustomerUser | null;
    token: string | null;
    setAuth: (user: CustomerUser, token: string) => void;
    clearAuth: () => void;
}

// --- Storage helpers ---

interface StoredAuthData {
    user: CustomerUser;
    token: string;
}

function persistToSessionStorage(data: StoredAuthData): void {
    try {
        if (typeof window === 'undefined') return;
        const encrypted = CryptoJS.AES.encrypt(
            JSON.stringify(data),
            SECRET_KEY,
        ).toString();
        sessionStorage.setItem(STORAGE_KEY, encrypted);
    } catch (error) {
        console.error('[CustomerAuthStore] Error persisting to sessionStorage:', error);
    }
}

function hydrateFromSessionStorage(): StoredAuthData | null {
    try {
        if (typeof window === 'undefined') return null;
        const encrypted = sessionStorage.getItem(STORAGE_KEY);
        if (!encrypted) return null;

        const bytes = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        if (!decrypted) return null;

        return JSON.parse(decrypted) as StoredAuthData;
    } catch (error) {
        // Silently clear corrupted storage on decryption failure
        // This happens when the SECRET_KEY changes (expected behavior for security)
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem(STORAGE_KEY);
        }
        return null;
    }
}

function clearSessionStorage(): void {
    try {
        if (typeof window === 'undefined') return;
        sessionStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.error('[CustomerAuthStore] Error clearing sessionStorage:', error);
    }
}

// --- Store ---

const hydrated = hydrateFromSessionStorage();

export const useCustomerAuthStore = create<CustomerAuthState>(() => ({
    user: hydrated?.user ?? null,
    token: hydrated?.token ?? null,

    setAuth: (user: CustomerUser, token: string) => {
        persistToSessionStorage({ user, token });
        useCustomerAuthStore.setState({ user, token });
    },

    clearAuth: () => {
        clearSessionStorage();
        useCustomerAuthStore.setState({ user: null, token: null });
    },
}));
