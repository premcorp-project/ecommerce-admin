import { PermissionModule } from '@/lib/stores/admin-auth-store';

/**
 * Maps admin routes to their required permission module.
 * Routes not listed here are always accessible to any authenticated admin/staff.
 */
export const routePermissionMap: Record<string, PermissionModule> = {
    '/admin/products': 'catalog',
    '/admin/categories': 'catalog',
    '/admin/banners': 'catalog',
    '/admin/coupons': 'catalog',
    '/admin/orders': 'orders',
    '/admin/users': 'users',
    '/admin/bulk-buyers': 'users',
    '/admin/cod': 'users',
    '/admin/support': 'support',
    '/admin/notifications': 'notifications',
    '/admin/staff': 'users',
    '/admin/settings': 'config',
};

/**
 * Routes that are only accessible to admin role (not staff).
 */
export const adminOnlyRoutes: string[] = [
    '/admin/dashboard',
    '/admin/analytics',
    '/admin/bulk-buyers',
    '/admin/cod',
];
