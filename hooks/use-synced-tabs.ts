// lib/hooks/useSyncedTab.ts
'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  dispatchQueryParamsChange,
  QUERY_PARAMS_CHANGE_EVENT,
} from '@/lib/query-params-events';

export type TabDef = {
  value: string;
  label: string;
  showDot?: boolean;
  dotColor?: string;
};

type Mode = 'url+storage' | 'url-only' | 'storage-only' | 'none';

type Options = {
  /** default selected value; falls back to defs[0].value */
  defaultValue?: string;
  /** query param name for URL syncing (only used if mode includes "url") */
  paramName?: string;
  storageKey?: string;
  mode?: Mode;
  keepOtherParams?: boolean;
  /**
   * Extra query params to merge whenever tab changes in URL modes.
   * Pass null/undefined/'' to remove a param.
   */
  syncParamsOnChange?: Record<string, string | null | undefined>;
  /**
   * Prefetch URLs for sibling tabs in URL modes.
   * Useful for warming client bundles and reducing tab content delay.
   */
  prefetchTabUrls?: boolean;
};

export function useSyncedTab(defs: TabDef[], opts: Options = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const mode: Mode = opts.mode ?? 'url+storage';
  const usesUrl = mode === 'url+storage' || mode === 'url-only';
  const usesStorage = mode === 'url+storage' || mode === 'storage-only';
  const isUrlOnlyMode = mode === 'url-only';

  const paramName = opts.paramName ?? 'tab';
  const storageKey =
    opts.storageKey ?? `syncedTab:${paramName}:${pathname || 'root'}`;
  const keepOtherParams = opts.keepOtherParams ?? true;
  const syncParamsOnChange = opts.syncParamsOnChange;
  const prefetchTabUrls = opts.prefetchTabUrls ?? false;

  const values = React.useMemo(() => new Set(defs.map((d) => d.value)), [defs]);

  const firstValue = defs[0]?.value ?? '';
  const defaultValue = React.useMemo(() => {
    if (opts.defaultValue && values.has(opts.defaultValue)) return opts.defaultValue;
    return firstValue;
  }, [opts.defaultValue, firstValue, values]);

  const isValid = React.useCallback(
    (v: string | null | undefined): v is string => v !== null && v !== undefined && values.has(v),
    [values]
  );

  const readUrlValue = React.useCallback(() => {
    if (!usesUrl) return null;
    // Prefer live URL (prevents races with other writers)
    if (typeof window !== 'undefined') {
      const live = new URLSearchParams(window.location.search);
      const raw = live.get(paramName);
      return raw ?? null; // no decode; URLSearchParams already handles encoding
    }
    // SSR fallback
    const raw = searchParams.get(paramName);
    return raw ?? null;
  }, [usesUrl, paramName, searchParams]);

  const readStorageValue = React.useCallback(() => {
    if (!usesStorage || typeof window === 'undefined') return null;
    return window.localStorage.getItem(storageKey);
  }, [usesStorage, storageKey]);

  // Initial: URL (if enabled) -> storage (if enabled) -> default
  const initial = React.useMemo(() => {
    const fromUrl = readUrlValue();
    if (isValid(fromUrl)) return fromUrl!;
    const fromStorage = readStorageValue();
    if (isValid(fromStorage)) return fromStorage!;
    return defaultValue;
  }, [readUrlValue, readStorageValue, isValid, defaultValue]);

  const [active, setActiveState] = React.useState<string>(initial);

  // Keep track of what we last applied to avoid loops
  const lastAppliedRef = React.useRef<{ url?: string | null; storage?: string | null; state?: string | null }>({
    url: usesUrl ? readUrlValue() : null,
    storage: usesStorage ? readStorageValue() : null,
    state: initial,
  });

  // If defs change (tabs added/removed/renamed), ensure current value is valid
  React.useEffect(() => {
    if (!isValid(active)) {
      const urlV = readUrlValue();
      const storageV = readStorageValue();
      if (isValid(urlV)) setActiveState(urlV!);
      else if (isValid(storageV)) setActiveState(storageV!);
      else setActiveState(defaultValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defs]); // validate only when defs change

  // React to external URL changes (back/forward or other writers)
  React.useEffect(() => {
    if (!usesUrl) return;
    const urlV = readUrlValue();
    if (isValid(urlV) && urlV !== active) {
      setActiveState(urlV!);
      lastAppliedRef.current.url = urlV;
      lastAppliedRef.current.state = urlV;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, usesUrl, readUrlValue, isValid]);

  React.useEffect(() => {
    if (!usesUrl || typeof window === 'undefined') return;

    const syncFromUrl = () => {
      const urlV = readUrlValue();
      if (isValid(urlV) && urlV !== active) {
        setActiveState(urlV);
        lastAppliedRef.current.url = urlV;
        lastAppliedRef.current.state = urlV;
      }
    };

    window.addEventListener(
      QUERY_PARAMS_CHANGE_EVENT,
      syncFromUrl as EventListener,
    );
    window.addEventListener('popstate', syncFromUrl);

    return () => {
      window.removeEventListener(
        QUERY_PARAMS_CHANGE_EVENT,
        syncFromUrl as EventListener,
      );
      window.removeEventListener('popstate', syncFromUrl);
    };
  }, [active, isValid, readUrlValue, usesUrl]);

  const setActive = React.useCallback(
    (nextValue: string) => {
      if (!isValid(nextValue)) return;

      setActiveState(nextValue);

      if (!usesUrl || typeof window === 'undefined') return;

      const currentSearch = window.location.search.replace(/^\?/, '');
      const nextParams = keepOtherParams
        ? new URLSearchParams(currentSearch)
        : new URLSearchParams();

      nextParams.set(paramName, nextValue);

      if (syncParamsOnChange) {
        for (const [key, value] of Object.entries(syncParamsOnChange)) {
          if (value == null || value === '') {
            nextParams.delete(key);
          } else {
            nextParams.set(key, String(value));
          }
        }
      }

      const nextSearch = nextParams.toString();
      if (nextSearch === currentSearch) return;

      const next = nextSearch ? `${pathname}?${nextSearch}` : pathname;
      const nextComparable = nextParams.get(paramName);

      // URL-only tabs should avoid App Router roundtrips.
      if (isUrlOnlyMode) {
        window.history.replaceState(window.history.state, '', next);
        dispatchQueryParamsChange();
      } else {
        router.replace(next, { scroll: false });
      }
      lastAppliedRef.current.url = nextComparable ?? null;
      lastAppliedRef.current.state = nextValue;
    },
    [
      isValid,
      usesUrl,
      keepOtherParams,
      paramName,
      syncParamsOnChange,
      pathname,
      router,
      isUrlOnlyMode,
    ]
  );

  // Persist to storage on change
  React.useEffect(() => {
    if (!usesStorage || typeof window === 'undefined') return;
    if (lastAppliedRef.current.storage === active) return;
    window.localStorage.setItem(storageKey, active);
    lastAppliedRef.current.storage = active;
  }, [active, usesStorage, storageKey]);

  // Write to URL on change (preserve other params if requested)
  React.useEffect(() => {
    if (!usesUrl) return;
    if (typeof window === 'undefined') return;

    const currentSearch = window.location.search.replace(/^\?/, '');
    const nextParams = keepOtherParams
      ? new URLSearchParams(currentSearch)
      : new URLSearchParams();
    nextParams.set(paramName, active);

    if (syncParamsOnChange) {
      for (const [key, value] of Object.entries(syncParamsOnChange)) {
        if (value == null || value === '') {
          nextParams.delete(key);
        } else {
          nextParams.set(key, String(value));
        }
      }
    }

    const nextSearch = nextParams.toString();
    if (nextSearch === currentSearch) return; // no-op

    const next = nextSearch ? `${pathname}?${nextSearch}` : pathname;

    // Avoid loops: only replace if different from last URL-applied
    const nextComparable = nextParams.get(paramName);
    if (lastAppliedRef.current.url !== nextComparable) {
      if (isUrlOnlyMode) {
        window.history.replaceState(window.history.state, '', next);
        dispatchQueryParamsChange();
      } else {
        router.replace(next, { scroll: false });
      }
      lastAppliedRef.current.url = nextComparable ?? null;
      lastAppliedRef.current.state = active;
    }
  }, [
    active,
    usesUrl,
    keepOtherParams,
    pathname,
    paramName,
    router,
    syncParamsOnChange,
    isUrlOnlyMode,
  ]);

  // Prefetch sibling tab URLs in background to reduce perceived tab latency.
  const prefetchedUrlsRef = React.useRef<Set<string>>(new Set());
  React.useEffect(() => {
    if (!usesUrl || !prefetchTabUrls) return;
    if (!pathname) return;
    if (typeof window === 'undefined') return;

    const currentSearch = window.location.search.replace(/^\?/, '');
    const baseParams = keepOtherParams
      ? new URLSearchParams(currentSearch)
      : new URLSearchParams();

    const prefetch = () => {
      defs.forEach((tab) => {
        if (tab.value === active) return;

        const nextParams = new URLSearchParams(baseParams.toString());
        nextParams.set(paramName, tab.value);

        if (syncParamsOnChange) {
          for (const [key, value] of Object.entries(syncParamsOnChange)) {
            if (value == null || value === '') {
              nextParams.delete(key);
            } else {
              nextParams.set(key, String(value));
            }
          }
        }

        const nextSearch = nextParams.toString();
        const next = nextSearch ? `${pathname}?${nextSearch}` : pathname;
        if (prefetchedUrlsRef.current.has(next)) return;

        prefetchedUrlsRef.current.add(next);
        router.prefetch(next);
      });
    };

    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(prefetch, { timeout: 1200 });
      return () => window.cancelIdleCallback(id);
    }

    const timeoutId = window.setTimeout(prefetch, 60);
    return () => window.clearTimeout(timeoutId);
  }, [
    active,
    defs,
    keepOtherParams,
    paramName,
    pathname,
    prefetchTabUrls,
    router,
    syncParamsOnChange,
    usesUrl,
  ]);

  return { active, setActive, tabs: defs };
}
