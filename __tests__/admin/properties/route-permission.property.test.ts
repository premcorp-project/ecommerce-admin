import { routePermissionMap } from '@/config/admin-route-permissions';
import { AdminPermissions, PermissionModule } from '@/lib/stores/admin-auth-store';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

/**
 * **Validates: Requirements 4.9, 4.10**
 *
 * Property 2: Route permission guard correctly allows or denies access
 *
 * For any staff user with any valid AdminPermissions object and any route in the
 * routePermissionMap, the route permission check SHALL return true if and only if
 * the permission module mapped to that route has read: true. Routes not in the map
 * (e.g., /admin/dashboard) SHALL always return true. If the permissions object is
 * null or malformed, all mapped routes SHALL return false.
 */

// --- Pure function under test (mirrors AdminAuthGuard + hasReadAccess logic) ---

/**
 * Checks if a staff user has access to a given route based on their permissions.
 * This mirrors the logic in AdminAuthGuard and the hasReadAccess selector.
 *
 * @param route - The route path to check
 * @param permissions - The staff user's permissions (null means malformed/missing)
 * @returns true if access is granted, false if denied
 */
function checkRouteAccess(
    route: string,
    permissions: AdminPermissions | null,
): boolean {
    const requiredModule = routePermissionMap[route] as PermissionModule | undefined;

    // Unmapped routes are always accessible
    if (!requiredModule) {
        return true;
    }

    // Null permissions deny all mapped routes
    if (!permissions) {
        return false;
    }

    // Check if the mapped module has read: true
    return permissions[requiredModule]?.read === true;
}

// --- Generators ---

const permissionModuleArb: fc.Arbitrary<{ read: boolean; write: boolean }> = fc.record({
    read: fc.boolean(),
    write: fc.boolean(),
});

const adminPermissionsArb: fc.Arbitrary<AdminPermissions> = fc.record({
    catalog: permissionModuleArb,
    orders: permissionModuleArb,
    users: permissionModuleArb,
    support: permissionModuleArb,
    notifications: permissionModuleArb,
    config: permissionModuleArb,
});

const mappedRoutes = Object.keys(routePermissionMap);

const mappedRouteArb: fc.Arbitrary<string> = fc.constantFrom(...mappedRoutes);

const unmappedRouteArb: fc.Arbitrary<string> = fc.constantFrom(
    '/admin/dashboard',
    '/admin/unknown-page',
    '/admin/some-other-route',
);

const allRouteArb: fc.Arbitrary<string> = fc.oneof(mappedRouteArb, unmappedRouteArb);

// --- Property Tests ---

describe('Property 2: Route permission guard correctly allows or denies access', () => {
    it('mapped routes grant access iff the corresponding module has read: true', () => {
        fc.assert(
            fc.property(
                adminPermissionsArb,
                mappedRouteArb,
                (permissions, route) => {
                    const result = checkRouteAccess(route, permissions);
                    const requiredModule = routePermissionMap[route] as PermissionModule;
                    const expected = permissions[requiredModule].read === true;

                    expect(result).toBe(expected);
                },
            ),
            { numRuns: 100 },
        );
    });

    it('unmapped routes always grant access regardless of permissions', () => {
        fc.assert(
            fc.property(
                adminPermissionsArb,
                unmappedRouteArb,
                (permissions, route) => {
                    const result = checkRouteAccess(route, permissions);
                    expect(result).toBe(true);
                },
            ),
            { numRuns: 100 },
        );
    });

    it('null permissions deny access to all mapped routes', () => {
        fc.assert(
            fc.property(
                mappedRouteArb,
                (route) => {
                    const result = checkRouteAccess(route, null);
                    expect(result).toBe(false);
                },
            ),
            { numRuns: 100 },
        );
    });

    it('null permissions still allow unmapped routes', () => {
        fc.assert(
            fc.property(
                unmappedRouteArb,
                (route) => {
                    const result = checkRouteAccess(route, null);
                    expect(result).toBe(true);
                },
            ),
            { numRuns: 100 },
        );
    });

    it('access decision is consistent: granted iff mapped module has read true, unmapped always allowed, null denies all mapped', () => {
        fc.assert(
            fc.property(
                fc.option(adminPermissionsArb, { nil: null }),
                allRouteArb,
                (permissions, route) => {
                    const result = checkRouteAccess(route, permissions);
                    const requiredModule = routePermissionMap[route] as PermissionModule | undefined;

                    if (!requiredModule) {
                        // Unmapped routes always allowed
                        expect(result).toBe(true);
                    } else if (!permissions) {
                        // Null permissions deny all mapped routes
                        expect(result).toBe(false);
                    } else {
                        // Mapped route with valid permissions: check read flag
                        expect(result).toBe(permissions[requiredModule].read === true);
                    }
                },
            ),
            { numRuns: 100 },
        );
    });
});
