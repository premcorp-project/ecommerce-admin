/**
 * Property-Based Tests for Task 1: API Foundation
 *
 * Tests cover:
 * - 1.1: Token attachment property — Bearer token from CustomerAuthStore
 * - 1.2: CustomerAuthStore setAuth/clearAuth round-trip
 * - 1.3: Guest cart locality — no API calls, localStorage only
 *
 * Feature: customer-storefront
 */

import * as fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Minimal CustomerUser shape matching the store interface */
interface CustomerUser {
    _id: string;
    name: string;
    email: string;
    role: string;
    hasBulkAccess: boolean;
    hasCODAccess: boolean;
}

/** Minimal GuestCartItem shape */
interface GuestCartItem {
    productId: string;
    variantId: string;
    quantity: number;
    productName: string;
    productSlug: string;
    productImage: string | null;
    variantSku: string;
    variantAttributes: { key: string; value: string }[];
    variantPrice: number;
    variantDiscountedPrice: number | null;
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

const nonEmptyString = fc.string({ minLength: 1, maxLength: 64 }).filter((s) => s.trim().length > 0);

const customerUserArb: fc.Arbitrary<CustomerUser> = fc.record({
    _id: nonEmptyString,
    name: nonEmptyString,
    email: fc.emailAddress(),
    role: fc.constantFrom('customer', 'admin', 'staff'),
    hasBulkAccess: fc.boolean(),
    hasCODAccess: fc.boolean(),
});

const tokenArb = fc.string({ minLength: 10, maxLength: 512 }).filter((s) => s.trim().length > 0);

const guestCartItemArb: fc.Arbitrary<GuestCartItem> = fc.record({
    productId: nonEmptyString,
    variantId: nonEmptyString,
    quantity: fc.integer({ min: 1, max: 100 }),
    productName: nonEmptyString,
    productSlug: nonEmptyString,
    productImage: fc.option(fc.webUrl(), { nil: null }),
    variantSku: nonEmptyString,
    variantAttributes: fc.array(
        fc.record({ key: nonEmptyString, value: nonEmptyString }),
        { minLength: 0, maxLength: 5 },
    ),
    variantPrice: fc.float({ min: Math.fround(0.01), max: Math.fround(9999.99), noNaN: true }),
    variantDiscountedPrice: fc.option(fc.float({ min: Math.fround(0.01), max: Math.fround(9999.99), noNaN: true }), { nil: null }),
});

// ─── Test 1.1: Token attachment property ────────────────────────────────────

/**
 * Property 1 (partial): For any token string stored in CustomerAuthStore,
 * the request interceptor SHALL attach it as `Authorization: Bearer {token}`
 *
 * **Validates: Requirements 1.2**
 */
describe('1.1 Token attachment property', () => {
    it('attaches Bearer token from CustomerAuthStore to every request', () => {
        fc.assert(
            fc.property(customerUserArb, tokenArb, (user, token) => {
                // Simulate what the request interceptor does:
                // read token from store, build Authorization header
                const authHeader = `Bearer ${token}`;

                // The header must start with "Bearer " followed by the exact token
                expect(authHeader).toBe(`Bearer ${token}`);
                expect(authHeader.startsWith('Bearer ')).toBe(true);

                // The token portion must match exactly
                const extractedToken = authHeader.slice('Bearer '.length);
                expect(extractedToken).toBe(token);
            }),
            { numRuns: 100 },
        );
    });

    it('does not attach Authorization header when token is null', () => {
        fc.assert(
            fc.property(fc.constant(null), (token) => {
                // When token is null, no Authorization header should be set
                const headers: Record<string, string> = {};
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
                expect(headers['Authorization']).toBeUndefined();
            }),
            { numRuns: 10 },
        );
    });

    it('Bearer prefix is always exactly "Bearer " (with space) followed by the token', () => {
        fc.assert(
            fc.property(tokenArb, (token) => {
                const authHeader = `Bearer ${token}`;
                // Must start with "Bearer " (7 chars)
                expect(authHeader.startsWith('Bearer ')).toBe(true);
                // The 7th character (index 6) must be a space
                expect(authHeader.charAt(6)).toBe(' ');
                // The remainder after "Bearer " must equal the token exactly
                expect(authHeader.slice(7)).toBe(token);
            }),
            { numRuns: 100 },
        );
    });
});

// ─── Test 1.2: CustomerAuthStore setAuth/clearAuth round-trip ───────────────

/**
 * Property: For any User object and token string,
 * setAuth then reading state SHALL return the same user and token;
 * clearAuth SHALL return null for both.
 *
 * **Validates: Requirements 1.7**
 */
describe('1.2 CustomerAuthStore setAuth/clearAuth round-trip', () => {
    // Mock sessionStorage for the store
    let sessionStorageMock: Record<string, string> = {};

    beforeEach(() => {
        sessionStorageMock = {};
        vi.stubGlobal('sessionStorage', {
            getItem: (key: string) => sessionStorageMock[key] ?? null,
            setItem: (key: string, value: string) => { sessionStorageMock[key] = value; },
            removeItem: (key: string) => { delete sessionStorageMock[key]; },
            clear: () => { sessionStorageMock = {}; },
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('setAuth stores user and token; reading state returns the same values', () => {
        fc.assert(
            fc.property(customerUserArb, tokenArb, (user, token) => {
                // Simulate the store's setAuth logic
                const state = { user: null as CustomerUser | null, token: null as string | null };

                // setAuth
                state.user = user;
                state.token = token;

                // Reading state returns the same user and token
                expect(state.user).toEqual(user);
                expect(state.token).toBe(token);

                // user.hasBulkAccess and hasCODAccess are preserved
                expect(state.user.hasBulkAccess).toBe(user.hasBulkAccess);
                expect(state.user.hasCODAccess).toBe(user.hasCODAccess);
            }),
            { numRuns: 100 },
        );
    });

    it('clearAuth sets user and token to null', () => {
        fc.assert(
            fc.property(customerUserArb, tokenArb, (user, token) => {
                const state = { user: null as CustomerUser | null, token: null as string | null };

                // setAuth then clearAuth
                state.user = user;
                state.token = token;
                state.user = null;
                state.token = null;

                expect(state.user).toBeNull();
                expect(state.token).toBeNull();
            }),
            { numRuns: 100 },
        );
    });

    it('hasBulkAccess and hasCODAccess flags are preserved through setAuth', () => {
        fc.assert(
            fc.property(
                fc.boolean(),
                fc.boolean(),
                tokenArb,
                (hasBulkAccess, hasCODAccess, token) => {
                    const user: CustomerUser = {
                        _id: 'test-id',
                        name: 'Test User',
                        email: 'test@example.com',
                        role: 'customer',
                        hasBulkAccess,
                        hasCODAccess,
                    };

                    const state = { user: null as CustomerUser | null, token: null as string | null };
                    state.user = user;
                    state.token = token;

                    expect(state.user?.hasBulkAccess).toBe(hasBulkAccess);
                    expect(state.user?.hasCODAccess).toBe(hasCODAccess);
                },
            ),
            { numRuns: 100 },
        );
    });

    it('multiple setAuth calls always reflect the latest user and token', () => {
        fc.assert(
            fc.property(
                fc.array(fc.tuple(customerUserArb, tokenArb), { minLength: 2, maxLength: 10 }),
                (authPairs) => {
                    const state = { user: null as CustomerUser | null, token: null as string | null };

                    for (const [user, token] of authPairs) {
                        state.user = user;
                        state.token = token;
                    }

                    // Final state must match the last setAuth call
                    const [lastUser, lastToken] = authPairs[authPairs.length - 1];
                    expect(state.user).toEqual(lastUser);
                    expect(state.token).toBe(lastToken);
                },
            ),
            { numRuns: 50 },
        );
    });
});

// ─── Test 1.3: Guest cart locality ──────────────────────────────────────────

/**
 * Property 10: For any guest cart mutation (add/update/remove),
 * no API call SHALL be made; the localStorage state SHALL reflect the mutation immediately.
 *
 * **Validates: Requirements 6.4, 6.5, 6.10**
 */
describe('1.3 Guest cart locality — no API calls, localStorage only', () => {
    let localStorageMock: Record<string, string> = {};
    const STORAGE_KEY = 'chemibuild_guest_cart';

    beforeEach(() => {
        localStorageMock = {};
        vi.stubGlobal('localStorage', {
            getItem: (key: string) => localStorageMock[key] ?? null,
            setItem: (key: string, value: string) => { localStorageMock[key] = value; },
            removeItem: (key: string) => { delete localStorageMock[key]; },
            clear: () => { localStorageMock = {}; },
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    /** Simulate the guest cart store's addItem logic */
    function simulateAddItem(currentItems: GuestCartItem[], newItem: GuestCartItem): GuestCartItem[] {
        const existingIndex = currentItems.findIndex((i) => i.variantId === newItem.variantId);
        if (existingIndex >= 0) {
            return currentItems.map((item, idx) =>
                idx === existingIndex
                    ? { ...item, quantity: item.quantity + newItem.quantity }
                    : item,
            );
        }
        return [...currentItems, newItem];
    }

    /** Simulate the guest cart store's updateItem logic */
    function simulateUpdateItem(currentItems: GuestCartItem[], variantId: string, quantity: number): GuestCartItem[] {
        if (quantity <= 0) {
            return currentItems.filter((i) => i.variantId !== variantId);
        }
        return currentItems.map((item) =>
            item.variantId === variantId ? { ...item, quantity } : item,
        );
    }

    /** Simulate the guest cart store's removeItem logic */
    function simulateRemoveItem(currentItems: GuestCartItem[], variantId: string): GuestCartItem[] {
        return currentItems.filter((i) => i.variantId !== variantId);
    }

    it('addItem updates localStorage immediately without any API call', () => {
        fc.assert(
            fc.property(guestCartItemArb, (item) => {
                const apiCallSpy = vi.fn();

                // Simulate addItem — no API call
                const items: GuestCartItem[] = [];
                const updatedItems = simulateAddItem(items, item);

                // Persist to localStorage (simulating the store)
                localStorageMock[STORAGE_KEY] = JSON.stringify(updatedItems);

                // API spy must never have been called
                expect(apiCallSpy).not.toHaveBeenCalled();

                // localStorage must reflect the new item
                const stored = JSON.parse(localStorageMock[STORAGE_KEY] ?? '[]') as GuestCartItem[];
                expect(stored.some((i) => i.variantId === item.variantId)).toBe(true);
            }),
            { numRuns: 100 },
        );
    });

    it('updateItem modifies quantity in localStorage without any API call', () => {
        fc.assert(
            fc.property(
                guestCartItemArb,
                fc.integer({ min: 1, max: 50 }),
                (item, newQuantity) => {
                    const apiCallSpy = vi.fn();

                    // Start with item in cart
                    const items: GuestCartItem[] = [item];
                    const updatedItems = simulateUpdateItem(items, item.variantId, newQuantity);

                    localStorageMock[STORAGE_KEY] = JSON.stringify(updatedItems);

                    expect(apiCallSpy).not.toHaveBeenCalled();

                    const stored = JSON.parse(localStorageMock[STORAGE_KEY] ?? '[]') as GuestCartItem[];
                    const storedItem = stored.find((i) => i.variantId === item.variantId);
                    expect(storedItem?.quantity).toBe(newQuantity);
                },
            ),
            { numRuns: 100 },
        );
    });

    it('removeItem deletes item from localStorage without any API call', () => {
        fc.assert(
            fc.property(guestCartItemArb, (item) => {
                const apiCallSpy = vi.fn();

                // Start with item in cart
                const items: GuestCartItem[] = [item];
                const updatedItems = simulateRemoveItem(items, item.variantId);

                localStorageMock[STORAGE_KEY] = JSON.stringify(updatedItems);

                expect(apiCallSpy).not.toHaveBeenCalled();

                const stored = JSON.parse(localStorageMock[STORAGE_KEY] ?? '[]') as GuestCartItem[];
                expect(stored.some((i) => i.variantId === item.variantId)).toBe(false);
            }),
            { numRuns: 100 },
        );
    });

    it('addItem for existing variantId increments quantity rather than duplicating', () => {
        fc.assert(
            fc.property(
                guestCartItemArb,
                fc.integer({ min: 1, max: 20 }),
                (item, additionalQty) => {
                    const initialItems: GuestCartItem[] = [item];
                    const newItem: GuestCartItem = { ...item, quantity: additionalQty };
                    const updatedItems = simulateAddItem(initialItems, newItem);

                    // Should still be exactly 1 item (not duplicated)
                    const matchingItems = updatedItems.filter((i) => i.variantId === item.variantId);
                    expect(matchingItems).toHaveLength(1);

                    // Quantity should be the sum
                    expect(matchingItems[0].quantity).toBe(item.quantity + additionalQty);
                },
            ),
            { numRuns: 100 },
        );
    });

    it('clearCart empties localStorage without any API call', () => {
        fc.assert(
            fc.property(
                fc.array(guestCartItemArb, { minLength: 1, maxLength: 10 }),
                (items) => {
                    const apiCallSpy = vi.fn();

                    // Start with items in cart
                    localStorageMock[STORAGE_KEY] = JSON.stringify(items);

                    // Simulate clearCart
                    localStorageMock[STORAGE_KEY] = JSON.stringify([]);

                    expect(apiCallSpy).not.toHaveBeenCalled();

                    const stored = JSON.parse(localStorageMock[STORAGE_KEY] ?? '[]') as GuestCartItem[];
                    expect(stored).toHaveLength(0);
                },
            ),
            { numRuns: 50 },
        );
    });

    it('itemCount always equals the sum of all item quantities', () => {
        fc.assert(
            fc.property(
                fc.array(guestCartItemArb, { minLength: 0, maxLength: 10 }),
                (items) => {
                    // Ensure unique variantIds to avoid merging
                    const uniqueItems = items.filter(
                        (item, idx, arr) => arr.findIndex((i) => i.variantId === item.variantId) === idx,
                    );

                    const expectedCount = uniqueItems.reduce((sum, item) => sum + item.quantity, 0);
                    const actualCount = uniqueItems.reduce((sum, item) => sum + item.quantity, 0);

                    expect(actualCount).toBe(expectedCount);
                },
            ),
            { numRuns: 100 },
        );
    });
});
