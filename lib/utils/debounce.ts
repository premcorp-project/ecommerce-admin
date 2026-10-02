/**
 * debounce — delays invoking `fn` until `delayMs` milliseconds have elapsed
 * since the last call. Returns a debounced function with a `.cancel()` method.
 *
 * Usage:
 *   const debouncedSearch = debounce((query: string) => fetch(query), 300);
 *   debouncedSearch('hello');  // only fires after 300ms of inactivity
 *   debouncedSearch.cancel();  // cancel any pending invocation
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
    fn: T,
    delayMs: number,
): T & { cancel: () => void } {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const debounced = (...args: Parameters<T>) => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            timeoutId = null;
            fn(...args);
        }, delayMs);
    };

    debounced.cancel = () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    };

    return debounced as T & { cancel: () => void };
}
