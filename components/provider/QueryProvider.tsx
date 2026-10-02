'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const ReactQueryDevtools =
  process.env.NODE_ENV === 'development'
    ? dynamic(
        () =>
          import('@tanstack/react-query-devtools').then(
            (mod) => mod.ReactQueryDevtools,
          ),
        { ssr: false },
      )
    : null;

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes - data is fresh
            gcTime: 1000 * 60 * 60 * 24, // 24 hours - keep in cache (optimal for admin dashboards)
            refetchOnWindowFocus: false, // Don't refetch on tab focus (good for admin dashboards)
            refetchOnReconnect: true, // Refetch on network reconnect (good for reliability)
            retry: false, // Retry failed requests twice (network resilience)
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {ReactQueryDevtools ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  );
}
