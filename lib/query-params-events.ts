export const QUERY_PARAMS_CHANGE_EVENT = 'lumi:query-params-change';

export function dispatchQueryParamsChange() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(QUERY_PARAMS_CHANGE_EVENT));
}
