import adminApi from "@/lib/api/admin-api";
import { ApiErrorResponse } from "@/types";
import { useQuery, UseQueryOptions } from "@tanstack/react-query";

export interface Currency {
    code: string;
    symbol: string;
    name: string;
}

type GetActiveCurrencyResponse = Currency | null;

/**
 * Map of common currency codes to their symbols and names
 */
const CURRENCY_MAP: Record<string, { symbol: string; name: string }> = {
    GBP: { symbol: '£', name: 'British Pound' },
    USD: { symbol: '$', name: 'US Dollar' },
    EUR: { symbol: '€', name: 'Euro' },
    AED: { symbol: 'د.إ', name: 'UAE Dirham' },
    SAR: { symbol: '﷼', name: 'Saudi Riyal' },
    PKR: { symbol: '₨', name: 'Pakistani Rupee' },
    INR: { symbol: '₹', name: 'Indian Rupee' },
};

/**
 * Hook to fetch the active currency from the platform config endpoint.
 * Returns a Currency object derived from the config's currency code.
 * Non-blocking: falls back to GBP if the API call fails.
 */
export const useGetActiveCurrency = (
    options?: Omit<UseQueryOptions<GetActiveCurrencyResponse, ApiErrorResponse>, 'queryKey' | 'queryFn'>
) => {
    return useQuery<GetActiveCurrencyResponse, ApiErrorResponse>({
        queryKey: ['active-currency'],
        queryFn: async () => {
            try {
                const { data } = await adminApi.get('/config');
                const config = data?.data?.config ?? data?.config ?? data;
                const code = config?.currency || 'GBP';
                const mapped = CURRENCY_MAP[code] || { symbol: code, name: code };
                return { code, symbol: mapped.symbol, name: mapped.name };
            } catch {
                // Fallback to GBP if config endpoint fails
                return { code: 'GBP', symbol: '£', name: 'British Pound' };
            }
        },
        staleTime: Infinity,
        gcTime: 1000 * 60 * 60 * 24,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        retry: false,
        ...options,
    });
};
