import { AdminProfile } from "../entities/auth";
import { ItemDetailResponse, MessageResponse, PaginatedResponse } from "./common";

// Role type
export interface RolePermission {
    id: string;
    name: string;
    main_module: string;
    module: string;
}

export interface AssignedUser {
    id: string;
    email: string | null;
    phone: string;
    name: string;
    profile: string;
}

export interface Role extends Record<string, unknown> {
    id: string;
    name: string;
    description: string;
    active_status: boolean;
    permissions: RolePermission[];
    users: AssignedUser[];
}

export interface User {
    id: string;
    email: string;
    phone: string;
    password?: string;
    name: string;
    email_is_verified: boolean;
    phone_is_verified: boolean;
    fcm_token: string | null;
    profile: string;
    active_status: boolean;
    block_status: boolean;
    google_id: string | null;
    current_location: {
        type: 'Point';
        coordinates: [number, number];
    };
    last_login: string;
    tokenVersion: number;
    role_id: string | null;
    two_factor_enabled: boolean;
    createdAt: string;
    updatedAt: string;
    token?: string;
    must_change_pass: boolean;
    role?: Role | null;
}

export type GetUsersResponse = PaginatedResponse<User>;
export type GetUserDetailsResponse = ItemDetailResponse<User>;

export interface UpdatePasswordRequiredPayload {
    userId: string;
    previous_password?: string;
    new_password: string;
}

export type UpdatePasswordRequiredResponse = MessageResponse;

export interface PostLoginPayload {
    email: string;
    password: string;
}

export interface PostLoginResponse {
    message: string;
    user: User;
    adminProfiles: AdminProfile[];
    accessToken: string;
}

export interface PostSendLoginOtpResponse {
    userId: string;
    message: string;
    sentTo: {
        phone: boolean;
        email: boolean;
    };
}

export type LoginApiResponse = PostLoginResponse | PostSendLoginOtpResponse;

export interface PostSendLoginOtpPayload {
    email: string;
    password?: string;
    otp_type: 'sms' | 'email';
}

export interface PostSendOtpPayload {
    email: string;
}

export interface PostSendOtpResponse {
    message: string;
}

export type PostVerifyOtpPayload = {
    email: string;
    otp: string;
}

export interface PostResetPasswordPayload {
    userId: string;
    password: string;
}

export interface PostVerifyLoginOtpPayload {
    userId: string;
    sentOtp: string;
}

export interface Post2FaSendOtpResponse {
    userId: string;
    message: string;
    sentTo: {
        phone: boolean;
        email: boolean;
    };
}

export interface PostResetPasswordResponse {
    message: string;
}

export interface PostVerifyOtpResponse {
    message: string;
    userId: string;
}
