'use client';

import Axios from '@/config/axios';
import { useQueryParams } from '@/hooks/use-query-params';
import { ApiErrorResponse } from '@/types';
import { useQuery, UseQueryOptions } from '@tanstack/react-query';

type UseApiQueryOptions<T> = Omit<UseQueryOptions<T, ApiErrorResponse>, 'queryKey' | 'queryFn'>;

type ParamTransform = {
  allowedKeys?: string[]; // if provided, only these keys are included
  omitValues?: unknown[]; // if provided, any param/value equal to one of these will be dropped
  mapper?: (params: Record<string, unknown>) => Record<string, unknown>; // full custom transform
};

export function useApiQuery<T>(
  endpoint: string,
  options?: UseApiQueryOptions<T>,
  paramTransform?: ParamTransform
) {
  const { getAllParams } = useQueryParams();

  let params = getAllParams();


  if (paramTransform?.mapper) {
    params = paramTransform.mapper(params) as Record<string, string | string[]>;
  } else if (paramTransform?.allowedKeys) {
    params = Object.fromEntries(
      Object.entries(params).filter(([k]) => paramTransform.allowedKeys!.includes(k))
    ) as Record<string, string | string[]>;
  }

  const omitSet = new Set(paramTransform?.omitValues ?? []);

  const queryKey = [endpoint, params];

  return useQuery<T, ApiErrorResponse>({
    queryKey,
    queryFn: async () => {
      const query = new URLSearchParams();

      Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;

        if (Array.isArray(value)) {
          value.forEach((v) => {
            if (v !== undefined && v !== null && v !== '' && !omitSet.has(v)) {
              query.append(key, String(v));
            }
          });
        } else {
          if (!omitSet.has(value)) {
            query.append(key, String(value));
          }
        }
      });

      const qs = query.toString();
      const apiUrl = qs ? `${endpoint}?${qs}` : endpoint;

      const res = await Axios.get<T>(apiUrl);
      return res.data;
    },
    retry: false,
    ...options,
  });
}