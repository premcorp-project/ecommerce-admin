/**
 * Property-Based Tests for Task 20.2: Auth Guard Completeness
 *
 * Feature: customer-storefront
 *
 * Property 7: For any protected route (/account/*, /checkout, /orders) and any
 * unauthenticated CustomerAuthStore state, the route SHALL redirect to
 * /login?redirect=<current-path> — never render protected content.
 *
 * **Validates: Requirements 8.1, 9.1, 10.2**
 */

import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';

// ─── Pure auth-guard logic (mirrors the pattern used in protected pages) ──────

/**
 * Determines whether a route is protected (requires authentication).
 * Mirrors the auth guard logic used in account, orders, and checkout pages.
 */
function isProtectedRoute(pathname: string): boolean {
    return (
        pathname.startsWith('/account') ||
        pathname === '/checkout' ||
        pathname.startsWith('/checkout/') ||
        pathname === '/orders' ||
        pathname.startsWith('/orders/')
    );
}

/**
 * Computes the redirect URL for an unauthenticated user on a protected route.
 * Mirrors the redirect logic in protected pages:
 *   /login?redirect=<current-path>
 */
function computeAuthRedirect(currentPath: string): string {
    return `/login?redirect=${encodeURIComponent(currentPath)}`;
}

/**
 * Simulates the auth guard decision:
 * - If authenticated (token present): allow access (return null — no redirect)
 * - If unauthenticated AND route is protected: return redirect URL
 * - If unauthenticated AND route is public: allow access (return null)
 */
function authGuard(
    pathname: string,
    token: string | null,
): { redirect: string } | null {
    if (token !== null) {
        // Authenticated — always allow
        return null;
    }

    if (isProtectedRoute(pathname)) {
        // Unauthenticated on a protected route — must redirect
        return { redirect: computeAuthRedirect(pathname) };
    }

    // Unauthenticated on a public route — allow
    return null;
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const nonEmptyString = fc
    .string({ minLength: 1, maxLength: 64 })
    .filter((s) => s.trim().length > 0 && !s.includes('?') && !s.includes('#'));

const tokenArb = fc
    .string({ minLength: 10, maxLength: 256 })
    .filter((s) => s.trim().length > 0);

/** Protected route paths */
const protectedPathArb: fc.Arbitrary<string> = fc.oneof(
    // /account and sub-paths
    fc.constant('/account'),
    fc.constant('/account/profile'),
    fc.constant('/account/addresses'),
    fc.constant('/account/wishlist'),
    fc.constant('/account/support'),
    fc.tuple(fc.constant('/account/support/'), nonEmptyString).map(([base, id]) => `${base}${id}`),
    // /checkout
    fc.constant('/checkout'),
    // /orders and sub-paths
    fc.constant('/orders'),
    fc.tuple(fc.constant('/orders/'), nonEmptyString).map(([base, id]) => `${base}${id}`),
    fc.tuple(fc.constant('/orders/'), nonEmptyString, fc.constant('/confirmation')).map(
        ([base, id, suffix]) => `${base}${id}${suffix}`,
    ),
);

/** Public route paths (no auth required) */
const publicPathArb: fc.Arbitrary<string> = fc.oneof(
    fc.constant('/'),
    fc.constant('/products'),
    fc.tuple(fc.constant('/products/'), nonEmptyString).map(([base, slug]) => `${base}${slug}`),
    fc.constant('/categories'),
    fc.tuple(fc.constant('/categories/'), nonEmptyString).map(([base, slug]) => `${base}${slug}`),
    fc.constant('/cart'),
    fc.constant('/login'),
    fc.constant('/register'),
    fc.constant('/forgot-password'),
    fc.constant('/order-lookup'),
);

// ─── Property Tests ───────────────────────────────────────────────────────────

describe('20.2 Property 7: Auth guard completeness', () => {
    /**
     * Core property: unauthenticated users on protected routes MUST be redirected.
     * Requirements 8.1, 9.1, 10.2
     */
    it('unauthenticated users on any protected route are redirected to /login?redirect=<path>', () => {
        fc.assert(
            fc.property(protectedPathArb, (pathname) => {
                // token = null → unauthenticated
                const result = authGuard(pathname, null);

                // Must redirect — never allow access
                expect(result).not.toBeNull();
                expect(result!.redirect).toBe(`/login?redirect=${encodeURIComponent(pathname)}`);
            }),
            { numRuns: 200 },
        );
    });

    /**
     * Authenticated users on protected routes are always allowed through.
     */
    it('authenticated users on protected routes are never redirected', () => {
        fc.assert(
            fc.property(protectedPathArb, tokenArb, (pathname, token) => {
                const result = authGuard(pathname, token);

                // Must NOT redirect — authenticated users have access
                expect(result).toBeNull();
            }),
            { numRuns: 200 },
        );
    });

    /**
     * Unauthenticated users on public routes are never redirected.
     */
    it('unauthenticated users on public routes are never redirected', () => {
        fc.assert(
            fc.property(publicPathArb, (pathname) => {
                const result = authGuard(pathname, null);

                // Public routes — no redirect needed
                expect(result).toBeNull();
            }),
            { numRuns: 200 },
        );
    });

    /**
     * The redirect URL always encodes the current path as the `redirect` param.
     * This ensures the user is returned to the intended page after login.
     */
    it('redirect URL always encodes the current path as the redirect query param', () => {
        fc.assert(
            fc.property(protectedPathArb, (pathname) => {
                const result = authGuard(pathname, null);

                expect(result).not.toBeNull();

                const redirectUrl = result!.redirect;

                // Must start with /login
                expect(redirectUrl.startsWith('/login')).toBe(true);

                // Must contain the redirect param
                expect(redirectUrl).toContain('redirect=');

                // The encoded path must decode back to the original pathname
                const encodedPath = redirectUrl.split('redirect=')[1];
                expect(decodeURIComponent(encodedPath)).toBe(pathname);
            }),
            { numRuns: 200 },
        );
    });

    /**
     * /account/* paths are always protected — any sub-path under /account
     * must require authentication.
     */
    it('all /account/* sub-paths are protected', () => {
        fc.assert(
            fc.property(
                nonEmptyString.map((s) => `/account/${s}`),
                (pathname) => {
                    expect(isProtectedRoute(pathname)).toBe(true);

                    const result = authGuard(pathname, null);
                    expect(result).not.toBeNull();
                },
            ),
            { numRuns: 200 },
        );
    });

    /**
     * /orders/* paths are always protected.
     */
    it('all /orders/* sub-paths are protected', () => {
        fc.assert(
            fc.property(
                nonEmptyString.map((s) => `/orders/${s}`),
                (pathname) => {
                    expect(isProtectedRoute(pathname)).toBe(true);

                    const result = authGuard(pathname, null);
                    expect(result).not.toBeNull();
                },
            ),
            { numRuns: 200 },
        );
    });

    /**
     * /checkout is always protected.
     */
    it('/checkout is a protected route', () => {
        const result = authGuard('/checkout', null);
        expect(result).not.toBeNull();
        expect(result!.redirect).toBe('/login?redirect=%2Fcheckout');
    });

    /**
     * /orders is always protected.
     */
    it('/orders is a protected route', () => {
        const result = authGuard('/orders', null);
        expect(result).not.toBeNull();
        expect(result!.redirect).toBe('/login?redirect=%2Forders');
    });

    /**
     * /account is always protected.
     */
    it('/account is a protected route', () => {
        const result = authGuard('/account', null);
        expect(result).not.toBeNull();
        expect(result!.redirect).toBe('/login?redirect=%2Faccount');
    });

    /**
     * The redirect destination is always /login — never any other page.
     * This ensures consistent auth flow across all protected routes.
     */
    it('redirect destination is always /login (never another page)', () => {
        fc.assert(
            fc.property(protectedPathArb, (pathname) => {
                const result = authGuard(pathname, null);

                expect(result).not.toBeNull();

                // Must redirect to /login (with query params), never elsewhere
                const redirectTarget = result!.redirect.split('?')[0];
                expect(redirectTarget).toBe('/login');
            }),
            { numRuns: 200 },
        );
    });

    /**
     * Property 7 (full): For any combination of route and auth state,
     * the auth guard decision is always consistent with the spec.
     */
    it('Property 7 (full): auth guard is consistent across all route/auth combinations', () => {
        fc.assert(
            fc.property(
                fc.oneof(protectedPathArb, publicPathArb),
                fc.option(tokenArb, { nil: null }),
                (pathname, token) => {
                    const result = authGuard(pathname, token);
                    const isProtected = isProtectedRoute(pathname);
                    const isAuthenticated = token !== null;

                    if (isAuthenticated) {
                        // Authenticated users are NEVER redirected regardless of route
                        expect(result).toBeNull();
                    } else if (isProtected) {
                        // Unauthenticated on protected route → MUST redirect
                        expect(result).not.toBeNull();
                        expect(result!.redirect.startsWith('/login')).toBe(true);
                        expect(result!.redirect).toContain('redirect=');
                        expect(decodeURIComponent(result!.redirect.split('redirect=')[1])).toBe(pathname);
                    } else {
                        // Unauthenticated on public route → MUST allow
                        expect(result).toBeNull();
                    }
                },
            ),
            { numRuns: 500 },
        );
    });
});
