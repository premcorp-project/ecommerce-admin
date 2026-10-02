import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { adminSidebarConfig } from '@/config/admin-sidebar';
import { AdminPermissions, PermissionModule } from '@/lib/stores/admin-auth-store';
import { filterSidebarItems } from '@/lib/utils/sidebar-filter';

/**
 * Property 1: Sidebar filtering returns correct items for any role and permission combination
 *
 * Validates: Requirements 2.2, 2.3, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.10
 */

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

const roleArb: fc.Arbitrary<'admin' | 'staff'> = fc.constantFrom('admin', 'staff');

// --- Tests ---

describe('Property 1: Sidebar filtering returns correct items for any role and permission combination', () => {
    it('admin always gets all 14 items regardless of permissions', () => {
        fc.assert(
            fc.property(adminPermissionsArb, (permissions) => {
                const result = filterSidebarItems('admin', permissions);
                expect(result).toHaveLength(14);
                expect(result).toEqual(adminSidebarConfig);
            }),
            { numRuns: 100 },
        );
    });

    it('admin gets all 14 items even with null permissions', () => {
        const result = filterSidebarItems('admin', null);
        expect(result).toHaveLength(14);
        expect(result).toEqual(adminSidebarConfig);
    });

    it('staff never sees admin-only items (Dashboard, Analytics, Bulk Buyers, COD Management)', () => {
        fc.assert(
            fc.property(adminPermissionsArb, (permissions) => {
                const result = filterSidebarItems('staff', permissions);
                const labels = result.map((item) => item.label);

                expect(labels).not.toContain('Dashboard');
                expect(labels).not.toContain('Analytics');
                expect(labels).not.toContain('Bulk Buyers');
                expect(labels).not.toContain('COD Management');
            }),
            { numRuns: 100 },
        );
    });

    it('staff with null permissions gets no items', () => {
        const result = filterSidebarItems('staff', null);
        expect(result).toHaveLength(0);
    });

    it('staff gets Dashboard + items matching read: true permissions for any permission combination', () => {
        fc.assert(
            fc.property(adminPermissionsArb, (permissions) => {
                const result = filterSidebarItems('staff', permissions);

                // Compute expected items (excluding adminOnly items)
                const expectedItems = adminSidebarConfig.filter((item) => {
                    if (item.adminOnly) return false; // Admin-only items never shown to staff
                    if (!item.permissionModule) return true; // Dashboard always included
                    return permissions[item.permissionModule]?.read === true;
                });

                expect(result).toHaveLength(expectedItems.length);

                // Verify each returned item matches expected
                result.forEach((item, index) => {
                    expect(item.label).toBe(expectedItems[index].label);
                    expect(item.path).toBe(expectedItems[index].path);
                });
            }),
            { numRuns: 100 },
        );
    });

    it('staff with catalog.read: true gets Products, Categories, Banners, and Coupons', () => {
        fc.assert(
            fc.property(adminPermissionsArb, (permissions) => {
                // Force catalog.read to true
                const permsWithCatalog: AdminPermissions = {
                    ...permissions,
                    catalog: { ...permissions.catalog, read: true },
                };

                const result = filterSidebarItems('staff', permsWithCatalog);
                const labels = result.map((item) => item.label);

                expect(labels).toContain('Products');
                expect(labels).toContain('Categories');
                expect(labels).toContain('Banners');
                expect(labels).toContain('Coupons');
            }),
            { numRuns: 100 },
        );
    });

    it('staff with orders.read: true gets Orders (but not Analytics which is admin-only)', () => {
        fc.assert(
            fc.property(adminPermissionsArb, (permissions) => {
                const permsWithOrders: AdminPermissions = {
                    ...permissions,
                    orders: { ...permissions.orders, read: true },
                };

                const result = filterSidebarItems('staff', permsWithOrders);
                const labels = result.map((item) => item.label);

                expect(labels).toContain('Orders');
                expect(labels).not.toContain('Analytics');
            }),
            { numRuns: 100 },
        );
    });

    it('staff with users.read: true gets Users and Staff (but not admin-only items)', () => {
        fc.assert(
            fc.property(adminPermissionsArb, (permissions) => {
                const permsWithUsers: AdminPermissions = {
                    ...permissions,
                    users: { ...permissions.users, read: true },
                };

                const result = filterSidebarItems('staff', permsWithUsers);
                const labels = result.map((item) => item.label);

                // Staff-visible items with permissionModule: 'users' should be present
                const usersModuleItems = adminSidebarConfig
                    .filter((item) => item.permissionModule === 'users' && !item.adminOnly)
                    .map((item) => item.label);

                for (const label of usersModuleItems) {
                    expect(labels).toContain(label);
                }

                // Admin-only items should NOT be present for staff
                expect(labels).not.toContain('Bulk Buyers');
                expect(labels).not.toContain('COD Management');
            }),
            { numRuns: 100 },
        );
    });

    it('staff with support.read: true gets Support Tickets', () => {
        fc.assert(
            fc.property(adminPermissionsArb, (permissions) => {
                const permsWithSupport: AdminPermissions = {
                    ...permissions,
                    support: { ...permissions.support, read: true },
                };

                const result = filterSidebarItems('staff', permsWithSupport);
                const labels = result.map((item) => item.label);

                expect(labels).toContain('Support Tickets');
            }),
            { numRuns: 100 },
        );
    });

    it('staff with notifications.read: true gets Notifications', () => {
        fc.assert(
            fc.property(adminPermissionsArb, (permissions) => {
                const permsWithNotifications: AdminPermissions = {
                    ...permissions,
                    notifications: { ...permissions.notifications, read: true },
                };

                const result = filterSidebarItems('staff', permsWithNotifications);
                const labels = result.map((item) => item.label);

                expect(labels).toContain('Notifications');
            }),
            { numRuns: 100 },
        );
    });

    it('staff with config.read: true gets Settings', () => {
        fc.assert(
            fc.property(adminPermissionsArb, (permissions) => {
                const permsWithConfig: AdminPermissions = {
                    ...permissions,
                    config: { ...permissions.config, read: true },
                };

                const result = filterSidebarItems('staff', permsWithConfig);
                const labels = result.map((item) => item.label);

                expect(labels).toContain('Settings');
            }),
            { numRuns: 100 },
        );
    });

    it('staff without a module read permission does NOT get that module items', () => {
        const moduleToItems: Record<PermissionModule, string[]> = {
            catalog: ['Products', 'Categories', 'Banners', 'Coupons'],
            orders: ['Orders', 'Analytics'],
            users: ['Users', 'Staff', 'Bulk Buyers', 'COD Management'],
            support: ['Support Tickets'],
            notifications: ['Notifications'],
            config: ['Settings'],
        };

        fc.assert(
            fc.property(
                adminPermissionsArb,
                fc.constantFrom<PermissionModule>(
                    'catalog',
                    'orders',
                    'users',
                    'support',
                    'notifications',
                    'config',
                ),
                (permissions, module) => {
                    // Force the specific module's read to false
                    const permsWithModuleFalse: AdminPermissions = {
                        ...permissions,
                        [module]: { ...permissions[module], read: false },
                    };

                    const result = filterSidebarItems('staff', permsWithModuleFalse);
                    const labels = result.map((item) => item.label);

                    // None of the items for this module should be present
                    for (const itemLabel of moduleToItems[module]) {
                        expect(labels).not.toContain(itemLabel);
                    }
                },
            ),
            { numRuns: 100 },
        );
    });

    it('for any role and permissions, result is always a subset of adminSidebarConfig in order', () => {
        fc.assert(
            fc.property(roleArb, adminPermissionsArb, (role, permissions) => {
                const result = filterSidebarItems(role, permissions);

                // All returned items must be from the config
                const configLabels = adminSidebarConfig.map((item) => item.label);
                result.forEach((item) => {
                    expect(configLabels).toContain(item.label);
                });

                // Order must be preserved (indices in config must be increasing)
                const indices = result.map((item) =>
                    adminSidebarConfig.findIndex((c) => c.label === item.label),
                );
                for (let i = 1; i < indices.length; i++) {
                    expect(indices[i]).toBeGreaterThan(indices[i - 1]);
                }
            }),
            { numRuns: 100 },
        );
    });
});
