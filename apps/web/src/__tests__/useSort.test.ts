import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSort } from '../hooks/useSort.js';

describe('useSort', () => {
  it('starts with no sort applied', () => {
    const { result } = renderHook(() => useSort<'name' | 'age'>());

    expect(result.current.sortConfig).toBeNull();
  });

  it('sets ascending sort on first click', () => {
    const { result } = renderHook(() => useSort<'name' | 'age'>());

    act(() => {
      result.current.toggleSort('name');
    });

    expect(result.current.sortConfig).toEqual({ column: 'name', direction: 'asc' });
  });

  it('toggles to descending on second click of same column', () => {
    const { result } = renderHook(() => useSort<'name' | 'age'>());

    act(() => {
      result.current.toggleSort('name');
    });

    act(() => {
      result.current.toggleSort('name');
    });

    expect(result.current.sortConfig).toEqual({ column: 'name', direction: 'desc' });
  });

  it('clears sort on third click of same column', () => {
    const { result } = renderHook(() => useSort<'name' | 'age'>());

    act(() => {
      result.current.toggleSort('name');
    });
    act(() => {
      result.current.toggleSort('name');
    });
    act(() => {
      result.current.toggleSort('name');
    });

    expect(result.current.sortConfig).toBeNull();
  });

  it('resets to ascending when clicking a different column', () => {
    const { result } = renderHook(() => useSort<'name' | 'age'>());

    act(() => {
      result.current.toggleSort('name');
    });
    act(() => {
      result.current.toggleSort('name');
    });

    expect(result.current.sortConfig?.direction).toBe('desc');

    act(() => {
      result.current.toggleSort('age');
    });

    expect(result.current.sortConfig).toEqual({ column: 'age', direction: 'asc' });
  });

  it('sorts numeric items ascending', () => {
    const { result } = renderHook(() => useSort<'value'>());
    const items = [{ v: 3 }, { v: 1 }, { v: 2 }];

    act(() => {
      result.current.toggleSort('value');
    });

    const sorted = result.current.sortItems(items, (item) => item.v);

    expect(sorted.map((i) => i.v)).toEqual([1, 2, 3]);
  });

  it('sorts string items descending', () => {
    const { result } = renderHook(() => useSort<'name'>());
    const items = [{ n: 'Bob' }, { n: 'Alice' }, { n: 'Charlie' }];

    act(() => {
      result.current.toggleSort('name');
    });
    act(() => {
      result.current.toggleSort('name');
    });

    const sorted = result.current.sortItems(items, (item) => item.n);

    expect(sorted.map((i) => i.n)).toEqual(['Charlie', 'Bob', 'Alice']);
  });

  it('returns a copy without mutation when no sort is applied', () => {
    const { result } = renderHook(() => useSort<'name'>());
    const items = [{ n: 'Bob' }, { n: 'Alice' }];

    const sorted = result.current.sortItems(items, (item) => item.n);

    expect(sorted).toEqual(items);
    expect(sorted).not.toBe(items);
  });
});
