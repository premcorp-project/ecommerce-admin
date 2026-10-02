import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useSyncExternalStore } from 'react';
import {
  dispatchQueryParamsChange,
  QUERY_PARAMS_CHANGE_EVENT,
} from '@/lib/query-params-events';

type SetOptions = {
  method?: 'replace' | 'push';
  scroll?: boolean;
  strategy?: 'history' | 'router';
};

export function useQueryParams() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const subscribe = useCallback((onStoreChange: () => void) => {
    if (typeof window === 'undefined') return () => undefined;

    window.addEventListener(
      QUERY_PARAMS_CHANGE_EVENT,
      onStoreChange as EventListener,
    );
    window.addEventListener('popstate', onStoreChange);

    return () => {
      window.removeEventListener(
        QUERY_PARAMS_CHANGE_EVENT,
        onStoreChange as EventListener,
      );
      window.removeEventListener('popstate', onStoreChange);
    };
  }, []);

  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined') {
      const initial = sp.toString();
      return initial ? `?${initial}` : '';
    }
    return window.location.search;
  }, [sp]);

  const getServerSnapshot = useCallback(() => {
    const initial = sp.toString();
    return initial ? `?${initial}` : '';
  }, [sp]);

  const search = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const getCurrentParams = useCallback(() => {
    return new URLSearchParams(search.replace(/^\?/, ''));
  }, [search]);

  const getParam = useCallback(
    (key: string) => getCurrentParams().get(key),
    [getCurrentParams]
  );

  const hasParam = useCallback(
    (key: string) => getCurrentParams().has(key),
    [getCurrentParams]
  );

  const getAllParams = useCallback(() => {
    const paramsObj: Record<string, string | string[]> = {};

    getCurrentParams().forEach((value, key) => {
      if (paramsObj[key]) {
        const existing = paramsObj[key];
        paramsObj[key] = Array.isArray(existing)
          ? [...existing, value]
          : [existing, value];
      } else {
        paramsObj[key] = value;
      }
    });

    return paramsObj;
  }, [getCurrentParams]);

  const setParams = useCallback(
    (
      paramsToSet: Record<string, string | null | undefined>,
      options?: SetOptions,
    ) => {
      const params = getCurrentParams();

      for (const [key, value] of Object.entries(paramsToSet)) {
        if (value == null || value === '') {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      }

      const qs = params.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      const currentQs = search.replace(/^\?/, '');
      const currentUrl = currentQs ? `${pathname}?${currentQs}` : pathname;

      if (url === currentUrl) return;

      const method = options?.method ?? 'replace';
      const scroll = options?.scroll ?? false;
      const strategy = options?.strategy ?? 'history';

      if (strategy === 'history' && typeof window !== 'undefined') {
        if (method === 'push') {
          window.history.pushState(window.history.state, '', url);
        } else {
          window.history.replaceState(window.history.state, '', url);
        }
        dispatchQueryParamsChange();
        return;
      }

      if (method === 'push') {
        router.push(url, { scroll });
      } else {
        router.replace(url, { scroll });
      }
    },
    [getCurrentParams, pathname, router, search],
  );

  return { getParam, hasParam, setParams, getAllParams };
}





// USAGE
// 'use client';
// import { useUrlParams } from '@/hooks/useUrlParams';

// export default function Example() {
//   const { getParam, hasParam, setParam } = useUrlParams();

//   const view = getParam('view');         // "grid" | null
//   const hasToken = hasParam('token');    // true/false

//   return (
//     <button onClick={() => setParam('view', 'list')}>List view</button>
//     // remove: setParam('view', null)
//     // push instead of replace: setParam('view', 'grid', { method: 'push' })
//   );
// }
