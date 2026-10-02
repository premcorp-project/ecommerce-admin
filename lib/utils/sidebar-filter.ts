import { AdminSidebarItem, adminSidebarConfig } from '@/config/admin-sidebar';
import { AdminPermissions } from '@/lib/stores/admin-auth-store';

/**
 * Filters sidebar items based on user role and permissions.
 *
 * - Admin role → returns all items
 * - Staff role → returns only items where adminOnly is false/undefined AND the permissionModule has read: true
 * - If permissions is null/malformed for staff → returns empty (no items visible)
 * - Admin-only items: Dashboard, Analytics, Bulk Buyers, COD Management
 */
export function filterSidebarItems(
    role: 'admin' | 'staff' | null,
    permissions: AdminPermissions | null,
): AdminSidebarItem[] {
    // Admin always sees all items
    if (role === 'admin') {
        return adminSidebarConfig;
    }

    // Staff sees only non-adminOnly items matching read permissions
    if (role === 'staff') {
        return adminSidebarConfig.filter((item) => {
            // Admin-only items are never shown to staff
            if (item.adminOnly) return false;

            // Items without a permissionModule are always visible
            if (!item.permissionModule) return true;

            // If permissions is null/malformed, deny all module items
            if (!permissions) return false;

            return permissions[item.permissionModule]?.read === true;
        });
    }

    // Unknown/null role → return empty (should not happen in practice)
    return [];
}
