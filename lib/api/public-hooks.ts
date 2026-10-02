'use client';

/**
 * Public API hooks — mirrors the admin hooks pattern exactly.
 *
 * usePublicQuery  — wraps useQuery for GET requests via publicApi
 * usePublicMutation — wraps useMutation for POST/PUT/PATCH/DELETE via publicApi
 *
 * Query keys must always use ['public', ...] format.
 */

import { ApiErrorResponse } from '@/types';
import {
    useMutation,
    UseMutationOptions,
    useQuery,
    UseQueryOptions,
} from '@tanstack/react-query';
import { AxiosRequestConfig } from 'axios';

import publicApi from './public-api';

// --- Types ---

type PublicQueryOptions<T> = Omit<
    UseQueryOptions<T, ApiErrorResponse>,
    'queryKey' | 'queryFn'
>;

type PublicMutationOptions<TData, TVariables> = Omit<
    UseMutationOptions<TData, ApiErrorResponse, TVariables>,
    'mutationFn'
>;

// --- Hooks ---

/**
 * Reusable query hook for public API endpoints.
 * Wraps @tanstack/react-query's useQuery with the public axios instance.
 *
 * @param queryKey - The react-query cache key — must start with ['public', ...]
 * @param endpoint - The API endpoint path (relative to base URL)
 * @param options - Additional react-query options
 * @param axiosConfig - Optional axios request config (params, headers, etc.)
 */
export function usePublicQuery<T>(
    queryKey: readonly unknown[],
    endpoint: string,
    options?: PublicQueryOptions<T>,
    axiosConfig?: AxiosRequestConfig,
) {
    return useQuery<T, ApiErrorResponse>({
        queryKey,
        queryFn: async () => {
            const res = await publicApi.get<T>(endpoint, axiosConfig);
            return res.data;
        },
        retry: false,
        ...options,
    });
}

/**
 * Reusable mutation hook for public API endpoints.
 * Wraps @tanstack/react-query's useMutation with the public axios instance.
 *
 * @param method - HTTP method ('post' | 'put' | 'patch' | 'delete')
 * @param endpoint - The API endpoint path. Can be a string or a function that receives variables.
 * @param options - Additional react-query mutation options
 */
export function usePublicMutation<TData = unknown, TVariables = unknown>(
    method: 'post' | 'put' | 'patch' | 'delete',
    endpoint: string | ((variables: TVariables) => string),
    options?: PublicMutationOptions<TData, TVariables>,
) {
    return useMutation<TData, ApiErrorResponse, TVariables>({
        mutationFn: async (variables: TVariables) => {
            const url = typeof endpoint === 'function' ? endpoint(variables) : endpoint;

            let res;
            switch (method) {
                case 'post':
                    res = await publicApi.post<TData>(url, variables);
                    break;
                case 'put':
                    res = await publicApi.put<TData>(url, variables);
                    break;
                case 'patch':
                    res = await publicApi.patch<TData>(url, variables);
                    break;
                case 'delete':
                    res = await publicApi.delete<TData>(url);
                    break;
            }

            return res.data;
        },
        ...options,
    });
}
