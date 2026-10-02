'use client';

import { useAdminQuery } from '@/lib/api/admin-hooks';
import { adminQueryKeys } from '@/lib/api/admin-query-keys';

// --- Types ---

export interface SocialLinks {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
    tiktok?: string;
}

export interface PlatformConfig {
    taxRate: number;
    currency: string;
    isEmailEnabled: boolean;
    isSmsEnabled: boolean;
    isRefundsEnabled: boolean;
    isPickupEnabled: boolean;
    pickupAddress: string;
    pickupInstructions: string;
    // Business details
    businessName: string;
    businessDescription: string;
    businessPhone: string;
    businessEmail: string;
    businessAddress: string;
    businessCity: string;
    businessPostcode: string;
    businessCountry: string;
    businessHours: string;
    businessLatitude: number | null;
    businessLongitude: number | null;
    socialLinks: SocialLinks;
    defaultDeliveryFee: number;
    // Legal pages
    termsAndConditions: string;
    privacyPolicy: string;
    returnPolicy: string;
}

interface ConfigResponse {
    success: boolean;
    config?: PlatformConfig;
    data?: { config?: PlatformConfig };
}

// --- Hook ---

/**
 * Hook to fetch and cache the platform configuration.
 * Uses the same admin API infrastructure as other hooks.
 * Cached aggressively since config rarely changes.
 */
export function useConfig() {
    const { data, isLoading, isError, error, refetch } =
        useAdminQuery<ConfigResponse>(adminQueryKeys.settings(), '/config', {
            staleTime: 1000 * 60 * 30, // 30 minutes
            gcTime: 1000 * 60 * 60, // 1 hour
            refetchOnWindowFocus: false,
            retry: 1,
        });

    // Handle both response formats: { config: {...} } and { data: { config: {...} } }
    const config: PlatformConfig | null =
        (data as any)?.data?.config ?? data?.config ?? null;

    return {
        config,
        isLoading,
        isError,
        error,
        refetch,
        // Convenience accessors
        currency: config?.currency || 'GBP',
        taxRate: config?.taxRate ?? 0,
        isEmailEnabled: config?.isEmailEnabled ?? false,
        isSmsEnabled: config?.isSmsEnabled ?? false,
        isRefundsEnabled: config?.isRefundsEnabled ?? false,
        isPickupEnabled: config?.isPickupEnabled ?? false,
        pickupAddress: config?.pickupAddress ?? '',
        pickupInstructions: config?.pickupInstructions ?? '',
        // Business details
        businessName: config?.businessName ?? '',
        businessPhone: config?.businessPhone ?? '',
        businessEmail: config?.businessEmail ?? '',
        businessAddress: config?.businessAddress ?? '',
        businessCity: config?.businessCity ?? '',
        businessPostcode: config?.businessPostcode ?? '',
        businessCountry: config?.businessCountry ?? '',
        businessHours: config?.businessHours ?? '',
        businessLatitude: config?.businessLatitude ?? null,
        businessLongitude: config?.businessLongitude ?? null,
        socialLinks: config?.socialLinks ?? {},
    };
}
