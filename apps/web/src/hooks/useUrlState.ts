import { useCallback, useEffect, useState } from 'react';

/**
 * Filter and pagination state that lives in the URL's query string. Keeping
 * it here (rather than component state) means a reload, a shared link, or
 * browser back/forward all reproduce the same view.
 */
export interface UrlState {
  minBmi: string;
  maxBmi: string;
  cursor: string;
  direction: string;
}

function readState(): UrlState {
  const params = new URLSearchParams(window.location.search);
  return {
    minBmi: params.get('minBmi') ?? '',
    maxBmi: params.get('maxBmi') ?? '',
    cursor: params.get('cursor') ?? '',
    direction: params.get('direction') ?? '',
  };
}

function writeState(updates: Partial<UrlState>): void {
  const current = new URLSearchParams(window.location.search);

  for (const [key, value] of Object.entries(updates)) {
    if (value) {
      current.set(key, value);
    } else {
      current.delete(key);
    }
  }

  const query = current.toString();
  const newUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;

  window.history.replaceState(null, '', newUrl);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/**
 * Reads and writes `minBmi`, `maxBmi`, `cursor`, and `direction` to the URL
 * query string via `URLSearchParams` and `history.replaceState`. State
 * updates dispatch a synthetic `popstate` event so every mounted instance of
 * this hook (and the browser back/forward buttons) stay in sync.
 */
export interface UseUrlStateResult {
  state: UrlState;
  setFilter: (minBmi: string, maxBmi: string) => void;
  setPage: (cursor: string, direction: 'next' | 'prev') => void;
  resetPagination: () => void;
}

export function useUrlState(): UseUrlStateResult {
  const [state, setState] = useState<UrlState>(readState);

  useEffect(() => {
    const handlePopState = () => setState(readState());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const setFilter = useCallback((minBmi: string, maxBmi: string) => {
    writeState({ minBmi, maxBmi, cursor: '', direction: '' });
    setState(readState());
  }, []);

  const setPage = useCallback((cursor: string, direction: 'next' | 'prev') => {
    writeState({ cursor, direction });
    setState(readState());
  }, []);

  const resetPagination = useCallback(() => {
    writeState({ cursor: '', direction: '' });
    setState(readState());
  }, []);

  return { state, setFilter, setPage, resetPagination };
}
