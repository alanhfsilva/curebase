import { useCallback, useMemo, useState } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface SortConfig<T extends string> {
  column: T;
  direction: SortDirection;
}

export interface UseSortResult<T extends string> {
  sortConfig: SortConfig<T> | null;
  toggleSort: (column: T) => void;
  sortItems: <I>(items: readonly I[], accessor: (item: I, column: T) => string | number) => I[];
}

export function useSort<T extends string>(): UseSortResult<T> {
  const [sortConfig, setSortConfig] = useState<SortConfig<T> | null>(null);

  const toggleSort = useCallback((column: T) => {
    setSortConfig((prev) => {
      if (prev?.column !== column) {
        return { column, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { column, direction: 'desc' };
      }
      return null;
    });
  }, []);

  const sortItems = useMemo(() => {
    return <I,>(items: readonly I[], accessor: (item: I, column: T) => string | number): I[] => {
      if (!sortConfig) {
        return [...items];
      }

      const { column, direction } = sortConfig;
      const multiplier = direction === 'asc' ? 1 : -1;

      return [...items].sort((a, b) => {
        const aVal = accessor(a, column);
        const bVal = accessor(b, column);

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return multiplier * aVal.localeCompare(bVal);
        }

        return multiplier * (Number(aVal) - Number(bVal));
      });
    };
  }, [sortConfig]);

  return { sortConfig, toggleSort, sortItems };
}
