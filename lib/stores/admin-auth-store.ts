import { getUser, removeUser, storeUser } from '@/lib/user';
import axios from 'axios';
import { create } from 'zustand';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

// --- Types ---

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

export interface AdminUser {
    _id: string;
    email: string;
    name: string;
    role: 'admin' | 'staff';
    isEmailVerified: boolean;
    isActive: boolean;
    isBulkBuyer?: boolean;
    isCodEnabled?: boolean;
    addresses?: unknown[];
    createdAt?: string;
    updatedAt?: string;
}

export interface AdminAuthStore {
    // State
    user: AdminUser | null;
    token: string | null;
    role: 'admin' | 'staff' | null;
    permissions: AdminPermissions | null;
    permissionsLoaded: boolean;
    sidebarCollapsed: boolean;

    // Actions
    setAuth: (user: AdminUser, token: string) => void;
    setPermissions: (permissions: AdminPermissions | null) => void;
    fetchPermissions: () => Promise<void>;
    clearAuth: () => void;
    toggleSidebar: () => void;

    // Selectors
    hasReadAccess: (module: PermissionModule) => boolean;
    hasWriteAccess: (module: PermissionModule) => boolean;
}

// --- Helpers ---

/**
 * Decode a JWT payload without verifying the signature.
 * Returns null if the token is malformed.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const payload = parts[1];
        const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(decoded) as Record<string, unknown>;
    } catch {
        return null;
    }
}

/**
 * Extract role from JWT payload.
 */
function extractRole(payload: Record<string, unknown>): 'admin' | 'staff' | null {
    const role = payload.role;
    if (role === 'admin' || role === 'staff') return role;
    return null;
}

/**
 * Parse permissions from an API response object.
 * Returns null if permissions are missing or malformed.
 */
function parsePermissions(permissions: unknown): AdminPermissions | null {
    if (!permissions || typeof permissions !== 'object') return null;

    const modules: PermissionModule[] = [
        'catalog',
        'orders',
        'users',
        'support',
        'notifications',
        'config',
    ];

    const result = {} as AdminPermissions;
    const permsObj = permissions as Record<string, unknown>;

    for (const mod of modules) {
        const modPerms = permsObj[mod];
        if (
            modPerms &&
            typeof modPerms === 'object' &&
            'read' in (modPerms as object) &&
            'write' in (modPerms as object)
        ) {
            const { read, write } = modPerms as { read: unknown; write: unknown };
            result[mod] = {
                read: Boolean(read),
                write: Boolean(write),
            };
        } else {
            result[mod] = { read: false, write: false };
        }
    }

    return result;
}

/**
 * Hydrate auth state from localStorage on store creation.
 * Permissions are NOT hydrated — they must be fetched from the API.
 */
function hydrateFromStorage(): Pick<
    AdminAuthStore,
    'user' | 'token' | 'role' | 'permissions' | 'permissionsLoaded'
> {
    const storedUser = getUser();
    if (!storedUser || !storedUser.token) {
        return { user: null, token: null, role: null, permissions: null, permissionsLoaded: false };
    }

    const token = storedUser.token;

    // Try to get role from JWT first
    const payload = decodeJwtPayload(token);
    let role = payload ? extractRole(payload) : null;

    // Fallback: get role from stored user object
    if (!role && storedUser.role) {
        const roleName = typeof storedUser.role === 'string'
            ? storedUser.role
            : (storedUser.role as { name?: string })?.name;
        if (roleName === 'admin' || roleName === 'staff') {
            role = roleName;
        }
    }

    if (!role) {
        return { user: null, token: null, role: null, permissions: null, permissionsLoaded: false };
    }

    // Map the stored user to AdminUser shape
    const adminUser: AdminUser = {
        _id: storedUser.id,
        email: storedUser.email,
        name: storedUser.name,
        role,
        isEmailVerified: storedUser.email_is_verified,
        isActive: storedUser.active_status,
    };

    // Permissions will be fetched from API — not from JWT
    return { user: adminUser, token, role, permissions: null, permissionsLoaded: false };
}

// --- Store ---

export const useAdminAuthStore = create<AdminAuthStore>((set, get) => {
    const hydrated = hydrateFromStorage();

    return {
        // Hydrated state
        user: hydrated.user,
        token: hydrated.token,
        role: hydrated.role,
        permissions: hydrated.permissions,
        permissionsLoaded: hydrated.permissionsLoaded,
        sidebarCollapsed: false,

        // Actions
        setAuth: (user: AdminUser, token: string) => {
            // Store user data in localStorage using existing encrypted storage
            storeUser({
                id: user._id,
                email: user.email,
                name: user.name,
                phone: '',
                email_is_verified: user.isEmailVerified,
                phone_is_verified: false,
                fcm_token: null,
                profile: '',
                active_status: user.isActive,
                block_status: false,
                google_id: null,
                current_location: { type: 'Point', coordinates: [0, 0] },
                last_login: new Date().toISOString(),
                tokenVersion: 0,
                role_id: null,
                two_factor_enabled: false,
                createdAt: user.createdAt ?? new Date().toISOString(),
                updatedAt: user.updatedAt ?? new Date().toISOString(),
                token,
                must_change_pass: false,
            });

            // Use role directly from the user object (not from JWT)
            const role = user.role;

            set({
                user,
                token,
                role,
                permissions: null,
                permissionsLoaded: false,
            });
        },

        setPermissions: (permissions: AdminPermissions | null) => {
            set({ permissions, permissionsLoaded: true });
        },

        fetchPermissions: async () => {
            const { role, token } = get();

            // Admin has full access — no need to fetch permissions
            if (role === 'admin') {
                set({ permissionsLoaded: true });
                return;
            }

            // Staff needs permissions from the profile API
            if (role === 'staff' && token) {
                try {
                    const res = await axios.get(`${API_BASE_URL}/users/profile`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    const userData = res.data?.data?.user || res.data?.user;
                    const permissions = parsePermissions(userData?.permissions);
                    set({ permissions, permissionsLoaded: true });
                } catch (error: unknown) {
                    // If 401/403, the user is deactivated or token is revoked — clear auth
                    const status = (error as { response?: { status?: number } })?.response?.status;
                    if (status === 401 || status === 403) {
                        get().clearAuth();
                        return;
                    }
                    // For other errors, set empty permissions (deny all)
                    set({ permissions: null, permissionsLoaded: true });
                }
                return;
            }

            set({ permissionsLoaded: true });
        },

        clearAuth: () => {
            removeUser();
            set({
                user: null,
                token: null,
                role: null,
                permissions: null,
                permissionsLoaded: false,
            });
        },

        toggleSidebar: () => {
            set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
        },

        // Selectors
        hasReadAccess: (module: PermissionModule): boolean => {
            const { role, permissions } = get();

            // Admin always has full access
            if (role === 'admin') return true;

            // Staff checks permission object
            if (role === 'staff') {
                if (!permissions) return false;
                return permissions[module]?.read === true;
            }

            return false;
        },

        hasWriteAccess: (module: PermissionModule): boolean => {
            const { role, permissions } = get();

            // Admin always has full access
            if (role === 'admin') return true;

            // Staff checks permission object
            if (role === 'staff') {
                if (!permissions) return false;
                return permissions[module]?.write === true;
            }

            return false;
        },
    };
});
