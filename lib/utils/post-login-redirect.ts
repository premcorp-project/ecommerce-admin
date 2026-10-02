/**
 * Post-Login Redirect Utility
 *
 * Resolves the correct redirect path after login based on:
 * - User role (admin, staff, customer, or unrecognized)
 * - Optional return URL parameter
 * - Staff permissions (for validating return URL access)
 */

export interface AdminPermissions {
    catalog: { read: boolean; write: boolean };
    orders: { read: boolean; write: boolean };
    users: { read: boolean; write: boolean };
    support: { read: boolean; write: boolean };
    notifications: { read: boolean; write: boolean };
    config: { read: boolean; write: boolean };
}

export type PermissionModule =
    | 'catalog'
    | 'orders'
    | 'users'
    | 'support'
    | 'notifications'
    | 'config';

/**
 * Maps admin routes to their required permission module.
 * Routes not in this map (e.g., /admin/dashboard) are always accessible.
 */
const routePermissionMap: Record<string, PermissionModule> = {
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

/**
 * Checks if a user has access to a given admin route based on their role and permissions.
 */
function hasAccessToRoute(
    route: string,
    role: string,
    permissions?: AdminPermissions | null,
): boolean {
    // Admin always has full access
    if (role === 'admin') {
        return true;
    }

    // Staff needs permission check
    if (role === 'staff') {
        // Find the matching route prefix from the permission map
        const matchedRoute = Object.keys(routePermissionMap)
            .sort((a, b) => b.length - a.length)
            .find(
                (prefix) => route === prefix || route.startsWith(`${prefix}/`),
            );

        // Routes not in the map (e.g., /admin/dashboard) are always accessible
        if (!matchedRoute) {
            return true;
        }

        const requiredModule = routePermissionMap[matchedRoute];

        // If permissions are missing or malformed, deny access
        if (!permissions || !permissions[requiredModule]) {
            return false;
        }

        return permissions[requiredModule].read === true;
    }

    // Other roles don't have access to admin routes
    return false;
}

export interface ResolveRedirectParams {
    role: string;
    permissions?: AdminPermissions | null;
    returnUrl?: string | null;
}

/**
 * Resolves the post-login redirect path based on role, permissions, and optional return URL.
 *
 * Logic:
 * - admin or staff role with no return URL → /admin/dashboard
 * - customer role → /
 * - Unrecognized role → / (default fallback)
 * - If return URL is present and points to an /admin/* route the user has access to → use that return URL
 * - If return URL points to a route the user doesn't have access to → fall back to default role-based destination
 */
export function resolvePostLoginRedirect({
    role,
    permissions,
    returnUrl,
}: ResolveRedirectParams): string {
    // Determine the default destination based on role
    const defaultPath = getDefaultPathForRole(role);

    // If no return URL, use the default
    if (!returnUrl || returnUrl.trim() === '') {
        return defaultPath;
    }

    // Normalize the return URL (strip query params and hash for route matching)
    const normalizedReturnUrl = returnUrl.split('?')[0].split('#')[0];

    // If the return URL points to an /admin/* route, check access
    if (normalizedReturnUrl.startsWith('/admin/') || normalizedReturnUrl === '/admin') {
        if (hasAccessToRoute(normalizedReturnUrl, role, permissions)) {
            return returnUrl; // Return the original URL (with query params if any)
        }
        // User doesn't have access to this admin route, fall back to default
        return defaultPath;
    }

    // Non-admin return URLs: only use if the role would normally go there
    // For admin/staff, they should go to admin dashboard, not a non-admin URL
    // For customer, any non-admin URL is fine
    if (role === 'customer') {
        return returnUrl;
    }

    // For admin/staff, ignore non-admin return URLs and use default
    return defaultPath;
}

/**
 * Returns the default redirect path for a given role.
 */
function getDefaultPathForRole(role: string): string {
    switch (role) {
        case 'admin':
        case 'staff':
            return '/admin/dashboard';
        case 'customer':
        default:
            return '/';
    }
}
