'use client';

/**
 * useDebouncedCallback — returns a stable debounced version of the provided callback.
 *
 * The debounced function delays invoking `callback` until `delayMs` milliseconds
 * have elapsed since the last call. Automatically cleans up on unmount.
 *
 * Usage:
 *   const debouncedUpdate = useDebouncedCallback((value: string) => {
 *     router.push(`/products?search=${value}`);
 *   }, 300);
 *
 *   <input onChange={(e) => debouncedUpdate(e.target.value)} />
 */

import { useCallback, useEffect, useRef } from 'react';

export function useDebouncedCallback<T extends (...args: never[]) => void>(
    callback: T,
    delayMs: number,
): (...args: Parameters<T>) => void {
    const callbackRef = useRef(callback);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Always use the latest callback without re-creating the debounced function
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    return useCallback(
        (...args: Parameters<T>) => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
                timeoutRef.current = null;
                callbackRef.current(...args);
            }, delayMs);
        },
        [delayMs],
    );
}
