import { useCallback, useState } from 'react';

export interface FilterState {
  minBmi: string;
  maxBmi: string;
  cursor: string;
  direction: string;
}

const INITIAL_STATE: FilterState = {
  minBmi: '',
  maxBmi: '',
  cursor: '',
  direction: '',
};

export interface UseFilterStateResult {
  state: FilterState;
  setFilter: (minBmi: string, maxBmi: string) => void;
  setPage: (cursor: string, direction: 'next' | 'prev') => void;
  resetPagination: () => void;
}

export function useUrlState(): UseFilterStateResult {
  const [state, setState] = useState<FilterState>(INITIAL_STATE);

  const setFilter = useCallback((minBmi: string, maxBmi: string) => {
    setState({ minBmi, maxBmi, cursor: '', direction: '' });
  }, []);

  const setPage = useCallback((cursor: string, direction: 'next' | 'prev') => {
    setState((prev) => ({ ...prev, cursor, direction }));
  }, []);

  const resetPagination = useCallback(() => {
    setState((prev) => ({ ...prev, cursor: '', direction: '' }));
  }, []);

  return { state, setFilter, setPage, resetPagination };
}
