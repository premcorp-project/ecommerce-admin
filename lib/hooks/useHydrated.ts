'use client';

import { useEffect, useState } from 'react';

/**
 * Returns false on the server and during the first client render,
 * then true after hydration is complete.
 *
 * Use this to prevent hydration mismatches in components that read from
 * client-only storage (sessionStorage, localStorage) via Zustand stores.
 *
 * Pattern:
 *   const hydrated = useHydrated();
 *   if (!hydrated) return <Skeleton />;  // matches server render
 *   // now safe to use client-only state
 */
export function useHydrated(): boolean {
    const [hydrated, setHydrated] = useState(false);
    useEffect(() => { setHydrated(true); }, []);
    return hydrated;
}
