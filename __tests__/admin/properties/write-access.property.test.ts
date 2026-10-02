import {
    useAdminAuthStore,
    type AdminPermissions,
    type AdminUser,
    type PermissionModule,
} from '@/lib/stores/admin-auth-store';
import fc from 'fast-check';
import { beforeEach, describe, expect, it } from 'vitest';

/**
 * Property 3: Write access control returns correct boolean for any role and permission
 *
 * *For any* user with role `admin` and any permission module, `hasWriteAccess(module)`
 * SHALL return `true`. *For any* user with role `staff` and any valid `AdminPermissions`
 * object and any permission module, `hasWriteAccess(module)` SHALL return `true` if and
 * only if that module's `write` field is `true`.
 *
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
 */

// --- Generators ---

const permissionModuleArb: fc.Arbitrary<PermissionModule> = fc.constantFrom(
    'catalog',
    'orders',
    'users',
    'support',
    'notifications',
    'config'
);

const adminPermissionsArb: fc.Arbitrary<AdminPermissions> = fc.record({
    catalog: fc.record({ read: fc.boolean(), write: fc.boolean() }),
    orders: fc.record({ read: fc.boolean(), write: fc.boolean() }),
    users: fc.record({ read: fc.boolean(), write: fc.boolean() }),
    support: fc.record({ read: fc.boolean(), write: fc.boolean() }),
    notifications: fc.record({ read: fc.boolean(), write: fc.boolean() }),
    config: fc.record({ read: fc.boolean(), write: fc.boolean() }),
});

const roleArb: fc.Arbitrary<'admin' | 'staff'> = fc.constantFrom('admin', 'staff');

// Helper to create a mock admin user
function createMockUser(role: 'admin' | 'staff'): AdminUser {
    return {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        name: 'Test User',
        role,
        isEmailVerified: true,
        isActive: true,
    };
}

// Helper to create a mock JWT token with given role and permissions
function createMockToken(role: 'admin' | 'staff', permissions?: AdminPermissions): string {
    const payload: Record<string, unknown> = {
        userId: '507f1f77bcf86cd799439011',
        role,
        isEmailVerified: true,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 604800, // 7 days
    };

    if (role === 'staff' && permissions) {
        payload.permissions = permissions;
    }

    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = btoa(JSON.stringify(payload));
    const signature = 'mock-signature';

    return `${header}.${body}.${signature}`;
}

describe('Property 3: Write access control returns correct boolean for any role and permission', () => {
    beforeEach(() => {
        // Reset the store state before each test
        useAdminAuthStore.setState({
            user: null,
            token: null,
            role: null,
            permissions: null,
            sidebarCollapsed: false,
        });
    });

    it('admin always has write access for any permission module', () => {
        fc.assert(
            fc.property(
                permissionModuleArb,
                adminPermissionsArb,
                (module, permissions) => {
                    // Set up store with admin role (permissions are irrelevant for admin)
                    useAdminAuthStore.setState({
                        user: createMockUser('admin'),
                        token: createMockToken('admin'),
                        role: 'admin',
                        permissions, // Even with arbitrary permissions, admin should always have access
                    });

                    const result = useAdminAuthStore.getState().hasWriteAccess(module);
                    expect(result).toBe(true);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('staff has write access iff module write permission is true', () => {
        fc.assert(
            fc.property(
                permissionModuleArb,
                adminPermissionsArb,
                (module, permissions) => {
                    // Set up store with staff role and given permissions
                    useAdminAuthStore.setState({
                        user: createMockUser('staff'),
                        token: createMockToken('staff', permissions),
                        role: 'staff',
                        permissions,
                    });

                    const result = useAdminAuthStore.getState().hasWriteAccess(module);
                    const expected = permissions[module].write === true;
                    expect(result).toBe(expected);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('staff with null permissions has no write access for any module', () => {
        fc.assert(
            fc.property(
                permissionModuleArb,
                (module) => {
                    // Set up store with staff role but null permissions
                    useAdminAuthStore.setState({
                        user: createMockUser('staff'),
                        token: createMockToken('staff'),
                        role: 'staff',
                        permissions: null,
                    });

                    const result = useAdminAuthStore.getState().hasWriteAccess(module);
                    expect(result).toBe(false);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('write access is correct for any combination of role, permissions, and module', () => {
        fc.assert(
            fc.property(
                roleArb,
                adminPermissionsArb,
                permissionModuleArb,
                (role, permissions, module) => {
                    // Set up store with the generated role and permissions
                    useAdminAuthStore.setState({
                        user: createMockUser(role),
                        token: createMockToken(role, role === 'staff' ? permissions : undefined),
                        role,
                        permissions: role === 'staff' ? permissions : null,
                    });

                    const result = useAdminAuthStore.getState().hasWriteAccess(module);

                    if (role === 'admin') {
                        // Admin always has write access
                        expect(result).toBe(true);
                    } else {
                        // Staff: write access iff module's write is true
                        expect(result).toBe(permissions[module].write === true);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });
});
