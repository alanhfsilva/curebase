import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useUrlState } from '../hooks/useUrlState.js';

describe('useUrlState', () => {
  it('starts with empty state', () => {
    const { result } = renderHook(() => useUrlState());

    expect(result.current.state).toEqual({
      minBmi: '',
      maxBmi: '',
      cursor: '',
      direction: '',
    });
  });

  it('updates filter via setFilter and clears pagination', () => {
    const { result } = renderHook(() => useUrlState());

    act(() => {
      result.current.setPage('abc', 'next');
    });

    act(() => {
      result.current.setFilter('18.5', '25');
    });

    expect(result.current.state).toEqual({
      minBmi: '18.5',
      maxBmi: '25',
      cursor: '',
      direction: '',
    });
  });

  it('does not write filter or pagination state to the URL', () => {
    const { result } = renderHook(() => useUrlState());

    act(() => {
      result.current.setFilter('18.5', '25');
    });

    expect(window.location.search).toBe('');
  });

  it('sets cursor and direction via setPage without touching the filter', () => {
    const { result } = renderHook(() => useUrlState());

    act(() => {
      result.current.setFilter('18.5', '');
    });

    act(() => {
      result.current.setPage('xyz', 'next');
    });

    expect(result.current.state).toEqual({
      minBmi: '18.5',
      maxBmi: '',
      cursor: 'xyz',
      direction: 'next',
    });
  });

  it('clears only cursor and direction via resetPagination', () => {
    const { result } = renderHook(() => useUrlState());

    act(() => {
      result.current.setFilter('18.5', '30');
    });

    act(() => {
      result.current.setPage('xyz', 'next');
    });

    act(() => {
      result.current.resetPagination();
    });

    expect(result.current.state).toEqual({
      minBmi: '18.5',
      maxBmi: '30',
      cursor: '',
      direction: '',
    });
  });
});
