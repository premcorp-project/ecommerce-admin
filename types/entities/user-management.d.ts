/**
 * User management entity types.
 */

export type RegistrationMethod = 'email' | 'phone' | 'google' | 'apple';

export type AccountStatus = 'active' | 'blocked' | 'deactivated';

export interface UserManagementItem extends Record<string, unknown> {
    id: string;
    email: string | null;
    phone: string | null;
    name: string;
    profile: string | null;
    active_status: boolean;
    block_status: boolean;
    registration_method: RegistrationMethod;
    createdAt: string;
    updatedAt: string;
}

export interface UMUserDetails extends UserManagementItem {
    email_is_verified: boolean;
    phone_is_verified: boolean;
    two_factor_enabled: boolean;
    google_id: string | null;
    role_id: string | null;
    last_login: string | null;
}
