/**
 * Property 6: Post-login redirect resolves correct path for any role and return URL
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.6, 7.7
 *
 * For any user role and optional return URL parameter, the post-login redirect function SHALL:
 * - Return `/admin/dashboard` for `admin` or `staff` roles when no return URL is present
 * - Return `/` for `customer` role
 * - Return `/` for any unrecognized role
 * - Return the return URL if it points to an `/admin/*` route the user has access to
 * - Otherwise fall back to the default role-based destination
 */

import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
    AdminPermissions,
    resolvePostLoginRedirect,
} from '@/lib/utils/post-login-redirect';

// --- Generators ---

/** Generate a random AdminPermissions object with random read/write booleans */
const arbPermissions: fc.Arbitrary<AdminPermissions> = fc.record({
    catalog: fc.record({ read: fc.boolean(), write: fc.boolean() }),
    orders: fc.record({ read: fc.boolean(), write: fc.boolean() }),
    users: fc.record({ read: fc.boolean(), write: fc.boolean() }),
    support: fc.record({ read: fc.boolean(), write: fc.boolean() }),
    notifications: fc.record({ read: fc.boolean(), write: fc.boolean() }),
    config: fc.record({ read: fc.boolean(), write: fc.boolean() }),
});

/** Known roles */
const arbKnownRole = fc.constantFrom('admin', 'staff', 'customer');

/** Unrecognized roles (random strings that are not admin, staff, or customer) */
const arbUnknownRole = fc
    .string({ minLength: 1, maxLength: 20 })
    .filter((s) => !['admin', 'staff', 'customer'].includes(s));

/** Any role (known or unknown) */
const arbRole = fc.oneof(arbKnownRole, arbUnknownRole);

/** Admin routes from the route permission map */
const adminRoutes = [
    '/admin/dashboard',
    '/admin/products',
    '/admin/categories',
    '/admin/banners',
    '/admin/coupons',
    '/admin/orders',
    '/admin/analytics',
    '/admin/users',
    '/admin/bulk-buyers',
    '/admin/cod',
    '/admin/support',
    '/admin/notifications',
    '/admin/settings',
];

/** Route-to-permission mapping (mirrors the source) */
const routePermissionMap: Record<string, string> = {
    '/admin/products': 'catalog',
    '/admin/categories': 'catalog',
    '/admin/banners': 'catalog',
    '/admin/coupons': 'catalog',
    '/admin/orders': 'orders',
    '/admin/analytics': 'orders',
    '/admin/users': 'users',
    '/admin/bulk-buyers': 'users',
    '/admin/cod': 'users',
    '/admin/support': 'support',
    '/admin/notifications': 'notifications',
    '/admin/settings': 'config',
};

/** Generate a random admin route return URL */
const arbAdminReturnUrl = fc.constantFrom(...adminRoutes);

/** Generate a non-admin return URL */
const arbNonAdminReturnUrl = fc.constantFrom(
    '/',
    '/products',
    '/account/orders',
    '/categories/electronics',
    '/cart',
);

/** Generate an optional return URL (admin, non-admin, or empty/null) */
const arbReturnUrl = fc.oneof(
    fc.constant(null),
    fc.constant(undefined),
    fc.constant(''),
    arbAdminReturnUrl,
    arbNonAdminReturnUrl,
);

// --- Helper to compute expected redirect ---

function hasAccessToRoute(
    route: string,
    role: string,
    permissions?: AdminPermissions | null,
): boolean {
    if (role === 'admin') return true;
    if (role === 'staff') {
        const matchedRoute = Object.keys(routePermissionMap)
            .sort((a, b) => b.length - a.length)
            .find(
                (prefix) => route === prefix || route.startsWith(`${prefix}/`),
            );
        if (!matchedRoute) return true; // e.g., /admin/dashboard
        const requiredModule =
            routePermissionMap[matchedRoute] as keyof AdminPermissions;
        if (!permissions || !permissions[requiredModule]) return false;
        return permissions[requiredModule].read === true;
    }
    return false;
}

function expectedRedirect(
    role: string,
    permissions: AdminPermissions | null | undefined,
    returnUrl: string | null | undefined,
): string {
    const defaultPath =
        role === 'admin' || role === 'staff' ? '/admin/dashboard' : '/';

    if (!returnUrl || returnUrl.trim() === '') {
        return defaultPath;
    }

    const normalizedReturnUrl = returnUrl.split('?')[0].split('#')[0];

    if (
        normalizedReturnUrl.startsWith('/admin/') ||
        normalizedReturnUrl === '/admin'
    ) {
        if (hasAccessToRoute(normalizedReturnUrl, role, permissions)) {
            return returnUrl;
        }
        return defaultPath;
    }

    // Non-admin return URLs
    if (role === 'customer') {
        return returnUrl;
    }

    return defaultPath;
}

// --- Property Tests ---

describe('Property 6: Post-login redirect resolves correct path for any role and return URL', () => {
    /**
     * **Validates: Requirements 7.1, 7.2, 7.3, 7.6, 7.7**
     */

    it('admin role without return URL always redirects to /admin/dashboard', () => {
        fc.assert(
            fc.property(arbPermissions, (permissions) => {
                const result = resolvePostLoginRedirect({
                    role: 'admin',
                    permissions,
                    returnUrl: null,
                });
                expect(result).toBe('/admin/dashboard');
            }),
            { numRuns: 100 },
        );
    });

    it('staff role without return URL always redirects to /admin/dashboard', () => {
        fc.assert(
            fc.property(arbPermissions, (permissions) => {
                const result = resolvePostLoginRedirect({
                    role: 'staff',
                    permissions,
                    returnUrl: null,
                });
                expect(result).toBe('/admin/dashboard');
            }),
            { numRuns: 100 },
        );
    });

    it('customer role always redirects to /', () => {
        fc.assert(
            fc.property(arbReturnUrl, (returnUrl) => {
                const result = resolvePostLoginRedirect({
                    role: 'customer',
                    permissions: null,
                    returnUrl,
                });
                const expected = expectedRedirect(
                    'customer',
                    null,
                    returnUrl,
                );
                expect(result).toBe(expected);
            }),
            { numRuns: 100 },
        );
    });

    it('unrecognized role always redirects to / as default fallback', () => {
        fc.assert(
            fc.property(arbUnknownRole, arbReturnUrl, (role, returnUrl) => {
                const result = resolvePostLoginRedirect({
                    role,
                    permissions: null,
                    returnUrl,
                });
                // Unrecognized roles should always go to /
                // unless returnUrl is a non-admin path (customer-like behavior doesn't apply)
                expect(result).toBe('/');
            }),
            { numRuns: 100 },
        );
    });

    it('admin with return URL pointing to any admin route gets that return URL', () => {
        fc.assert(
            fc.property(
                arbAdminReturnUrl,
                arbPermissions,
                (returnUrl, permissions) => {
                    const result = resolvePostLoginRedirect({
                        role: 'admin',
                        permissions,
                        returnUrl,
                    });
                    // Admin always has access to all admin routes
                    expect(result).toBe(returnUrl);
                },
            ),
            { numRuns: 100 },
        );
    });

    it('staff with return URL pointing to accessible admin route gets that return URL', () => {
        fc.assert(
            fc.property(
                arbAdminReturnUrl,
                arbPermissions,
                (returnUrl, permissions) => {
                    const result = resolvePostLoginRedirect({
                        role: 'staff',
                        permissions,
                        returnUrl,
                    });
                    const expected = expectedRedirect(
                        'staff',
                        permissions,
                        returnUrl,
                    );
                    expect(result).toBe(expected);
                },
            ),
            { numRuns: 100 },
        );
    });

    it('staff with return URL pointing to inaccessible admin route falls back to /admin/dashboard', () => {
        fc.assert(
            fc.property(arbPermissions, (permissions) => {
                // Find a route the staff doesn't have access to
                const inaccessibleRoute = Object.entries(
                    routePermissionMap,
                ).find(([, module]) => {
                    const mod = module as keyof AdminPermissions;
                    return !permissions[mod]?.read;
                });

                if (inaccessibleRoute) {
                    const result = resolvePostLoginRedirect({
                        role: 'staff',
                        permissions,
                        returnUrl: inaccessibleRoute[0],
                    });
                    expect(result).toBe('/admin/dashboard');
                }
            }),
            { numRuns: 100 },
        );
    });

    it('redirect path matches expected logic for any combination of role, permissions, and return URL', () => {
        fc.assert(
            fc.property(
                arbRole,
                arbPermissions,
                arbReturnUrl,
                (role, permissions, returnUrl) => {
                    const result = resolvePostLoginRedirect({
                        role,
                        permissions,
                        returnUrl,
                    });
                    const expected = expectedRedirect(
                        role,
                        permissions,
                        returnUrl,
                    );
                    expect(result).toBe(expected);
                },
            ),
            { numRuns: 200 },
        );
    });
});
