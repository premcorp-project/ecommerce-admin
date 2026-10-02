'use client';

/**
 * useDeliveryLocations — fetches deliverable countries and cities from the backend.
 *
 * Only shows locations where we actually deliver (configured via admin zones).
 * No hardcoded country/city lists — everything comes from the API.
 *
 * Public endpoints (no auth required):
 *   GET /delivery/countries → list of served countries
 *   GET /delivery/cities?country=XX → list of deliverable cities in that country
 *   GET /delivery/check?country=XX&city=YY → deliverability + estimated days
 */

import type { SelectOption } from '@/components/shared/LocationSelect';
import { usePublicQuery } from '@/lib/api/public-hooks';
import { publicQueryKeys } from '@/lib/api/public-query-keys';

// ─── Response Types ───────────────────────────────────────────────────────────

interface CountriesResponse {
    data?: {
        countries: { code: string; name: string }[];
    };
    countries?: { code: string; name: string }[];
}

interface CitiesResponse {
    data?: {
        country: string;
        cities: { name: string; value: string }[];
    };
    country?: string;
    cities?: { name: string; value: string }[];
}

interface DeliveryCheckResponse {
    data?: {
        deliverable: boolean;
        zone: string | null;
        estimatedDays: number | null;
    };
    deliverable?: boolean;
    zone?: string | null;
    estimatedDays?: number | null;
}

// ─── Hook: Countries ──────────────────────────────────────────────────────────

export function useDeliveryCountries() {
    const { data: raw, isLoading, isError } = usePublicQuery<CountriesResponse>(
        publicQueryKeys.deliveryCountries,
        '/delivery/countries',
        { staleTime: 1000 * 60 * 10 }, // cache 10 minutes
    );

    const countries: SelectOption[] = (() => {
        const list = (raw as any)?.data?.countries ?? raw?.countries ?? [];
        return list.map((c: { code: string; name: string }) => ({
            label: c.name,
            value: c.code,
        }));
    })();

    return { countries, isLoading, isError };
}

// ─── Hook: Cities ─────────────────────────────────────────────────────────────

export function useDeliveryCities(country: string) {
    const { data: raw, isLoading, isError } = usePublicQuery<CitiesResponse>(
        publicQueryKeys.deliveryCities(country),
        '/delivery/cities',
        {
            staleTime: 1000 * 60 * 5, // cache 5 minutes
            enabled: !!country, // don't fetch until country is selected
        },
        { params: { country } },
    );

    const cities: SelectOption[] = (() => {
        const list = (raw as any)?.data?.cities ?? raw?.cities ?? [];
        return list.map((c: { name: string; value: string }) => ({
            label: c.name,
            value: c.name, // use name as value (addresses store city as string)
        }));
    })();

    return { cities, isLoading, isError };
}

// ─── Hook: Deliverability Check ───────────────────────────────────────────────

export function useDeliveryCheck(country: string, city: string) {
    const { data: raw, isLoading } = usePublicQuery<DeliveryCheckResponse>(
        publicQueryKeys.deliveryCheck(country, city),
        '/delivery/check',
        {
            staleTime: 1000 * 60 * 2, // cache 2 minutes
            enabled: !!country && !!city, // only check when both are selected
        },
        { params: { country, city } },
    );

    const result = (raw as any)?.data ?? raw ?? null;

    return {
        deliverable: result?.deliverable ?? null,
        zone: result?.zone ?? null,
        estimatedDays: result?.estimatedDays ?? null,
        isLoading,
    };
}
