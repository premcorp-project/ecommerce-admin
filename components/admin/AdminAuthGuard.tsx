'use client';

import MainLoader from '@/components/shared/MainLoader';
import { adminOnlyRoutes, routePermissionMap } from '@/config/admin-route-permissions';
import { adminSidebarConfig } from '@/config/admin-sidebar';
import { PermissionModule, useAdminAuthStore } from '@/lib/stores/admin-auth-store';
import { validateToken } from '@/lib/utils/token-validation';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface AdminAuthGuardProps {
    children: React.ReactNode;
}

/**
 * Returns the first sidebar route that a staff member has access to.
 */
function getFirstPermittedStaffRoute(hasReadAccess: (module: PermissionModule) => boolean): string {
    const firstItem = adminSidebarConfig.find((item) => {
        if (item.adminOnly) return false;
        if (!item.permissionModule) return true;
        return hasReadAccess(item.permissionModule);
    });
    return firstItem?.path ?? '/admin/orders';
}

/**
 * AdminAuthGuard protects all `/admin/*` routes by:
 * 1. Validating the JWT token (presence, parsability, expiration, required claims)
 * 2. Redirecting unauthenticated users to `/login`
 * 3. Redirecting customers to `/`
 * 4. Blocking staff from admin-only routes
 * 5. Checking route-level permissions for staff users
 */
export default function AdminAuthGuard({ children }: AdminAuthGuardProps) {
    const router = useRouter();
    const pathname = usePathname();

    const [isMounted, setIsMounted] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(false);

    const token = useAdminAuthStore((state) => state.token);
    const clearAuth = useAdminAuthStore((state) => state.clearAuth);
    const hasReadAccess = useAdminAuthStore((state) => state.hasReadAccess);
    const permissionsLoaded = useAdminAuthStore((state) => state.permissionsLoaded);
    const fetchPermissions = useAdminAuthStore((state) => state.fetchPermissions);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Validate token and fetch permissions on mount or when token changes
    useEffect(() => {
        if (!isMounted) return;

        const validationResult = validateToken(token);

        // Invalid token — redirect to login immediately
        if (!validationResult.valid) {
            clearAuth();
            router.replace('/login');
            return;
        }

        // Valid token — fetch permissions if not already loaded
        if (!permissionsLoaded) {
            fetchPermissions();
        }
    }, [isMounted, token, permissionsLoaded, fetchPermissions, clearAuth, router]);

    useEffect(() => {
        if (!isMounted || !permissionsLoaded) return;

        const validationResult = validateToken(token);

        if (!validationResult.valid) {
            clearAuth();
            router.replace('/login');
            return;
        }

        const tokenRole = validationResult.payload?.role;

        if (tokenRole === 'customer') {
            clearAuth();
            router.replace('/login');
            return;
        }

        if (tokenRole !== 'admin' && tokenRole !== 'staff') {
            clearAuth();
            router.replace('/login');
            return;
        }

        // For staff users: block admin-only routes and check permissions
        if (tokenRole === 'staff') {
            // Block admin-only routes
            if (adminOnlyRoutes.includes(pathname)) {
                router.replace(getFirstPermittedStaffRoute(hasReadAccess));
                return;
            }

            // Check route-level permissions
            const requiredModule = routePermissionMap[pathname];
            if (requiredModule && !hasReadAccess(requiredModule)) {
                router.replace(getFirstPermittedStaffRoute(hasReadAccess));
                return;
            }
        }

        // Valid authenticated admin/staff user on an allowed route
        setIsAuthorized(true);
    }, [isMounted, token, pathname, hasReadAccess, clearAuth, router, permissionsLoaded]);

    // Show loader while checking auth or loading permissions
    if (!isMounted || !isAuthorized) {
        return <MainLoader />;
    }

    return <>{children}</>;
}

/**
 * LoginAuthGuard redirects already-authenticated users away from `/login`:
 * - Admin/Staff with valid token → redirect to `/admin/dashboard`
 * - Customer with valid token → redirect to `/`
 */
export function LoginAuthGuard({ children }: AdminAuthGuardProps) {
    const router = useRouter();

    const [isMounted, setIsMounted] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);

    const token = useAdminAuthStore((state) => state.token);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!isMounted) return;

        const validationResult = validateToken(token);

        if (!validationResult.valid) {
            // Not authenticated — allow login page to render
            setShouldRender(true);
            return;
        }

        const tokenRole = validationResult.payload?.role;

        if (tokenRole === 'admin' || tokenRole === 'staff') {
            router.replace(tokenRole === 'admin' ? '/admin/dashboard' : '/admin/orders');
            return;
        }

        if (tokenRole === 'customer') {
            setShouldRender(true);
            return;
        }

        router.replace('/admin/dashboard');
    }, [isMounted, token, router]);

    if (!isMounted || !shouldRender) {
        return <MainLoader />;
    }

    return <>{children}</>;
}
