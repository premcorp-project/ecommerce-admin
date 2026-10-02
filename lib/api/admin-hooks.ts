'use client';

import { ApiErrorResponse } from '@/types';
import {
    useMutation,
    UseMutationOptions,
    useQuery,
    UseQueryOptions,
} from '@tanstack/react-query';
import { AxiosRequestConfig } from 'axios';

import adminApi from './admin-api';

// --- Types ---

type AdminQueryOptions<T> = Omit<
    UseQueryOptions<T, ApiErrorResponse>,
    'queryKey' | 'queryFn'
>;

type AdminMutationOptions<TData, TVariables> = Omit<
    UseMutationOptions<TData, ApiErrorResponse, TVariables>,
    'mutationFn'
>;

// --- Hooks ---

/**
 * Reusable query hook for admin API endpoints.
 * Wraps @tanstack/react-query's useQuery with the admin axios instance.
 *
 * @param queryKey - The react-query cache key (use adminQueryKeys factory)
 * @param endpoint - The API endpoint path (relative to base URL)
 * @param options - Additional react-query options
 * @param axiosConfig - Optional axios request config (params, headers, etc.)
 */
export function useAdminQuery<T>(
    queryKey: readonly unknown[],
    endpoint: string,
    options?: AdminQueryOptions<T>,
    axiosConfig?: AxiosRequestConfig,
) {
    return useQuery<T, ApiErrorResponse>({
        queryKey,
        queryFn: async () => {
            const res = await adminApi.get<T>(endpoint, axiosConfig);
            return res.data;
        },
        retry: false,
        ...options,
    });
}

/**
 * Reusable mutation hook for admin API endpoints.
 * Wraps @tanstack/react-query's useMutation with the admin axios instance.
 *
 * @param method - HTTP method ('post' | 'put' | 'patch' | 'delete')
 * @param endpoint - The API endpoint path (relative to base URL). Can include :id placeholders.
 * @param options - Additional react-query mutation options
 */
export function useAdminMutation<TData = unknown, TVariables = unknown>(
    method: 'post' | 'put' | 'patch' | 'delete',
    endpoint: string | ((variables: TVariables) => string),
    options?: AdminMutationOptions<TData, TVariables>,
) {
    return useMutation<TData, ApiErrorResponse, TVariables>({
        mutationFn: async (variables: TVariables) => {
            const url = typeof endpoint === 'function' ? endpoint(variables) : endpoint;

            let res;
            switch (method) {
                case 'post':
                    res = await adminApi.post<TData>(url, variables);
                    break;
                case 'put':
                    res = await adminApi.put<TData>(url, variables);
                    break;
                case 'patch':
                    res = await adminApi.patch<TData>(url, variables);
                    break;
                case 'delete':
                    res = await adminApi.delete<TData>(url);
                    break;
            }

            return res.data;
        },
        ...options,
    });
}
