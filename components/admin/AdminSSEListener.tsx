'use client';

import { useAdminSSE } from '@/hooks/use-admin-sse';

/**
 * AdminSSEListener — invisible component that connects to the admin SSE stream.
 * Place inside the admin layout (after auth guard) to receive real-time events.
 *
 * Uses fetch-based ReadableStream (not EventSourcePolyfill) so there are
 * zero unhandled promise rejections — all errors are caught internally.
 */
export function AdminSSEListener() {
    useAdminSSE();
    return null;
}
