import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useUrlState } from '../hooks/useUrlState.js';

describe('useUrlState', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('reads empty state from a clean URL', () => {
    const { result } = renderHook(() => useUrlState());

    expect(result.current.state).toEqual({
      minBmi: '',
      maxBmi: '',
      cursor: '',
      direction: '',
    });
  });

  it('reads existing filter and pagination params from the URL', () => {
    window.history.replaceState(null, '', '/?minBmi=18.5&maxBmi=25&cursor=abc&direction=next');

    const { result } = renderHook(() => useUrlState());

    expect(result.current.state).toEqual({
      minBmi: '18.5',
      maxBmi: '25',
      cursor: 'abc',
      direction: 'next',
    });
  });

  it('writes filter params to the URL and to state via setFilter', () => {
    const { result } = renderHook(() => useUrlState());

    act(() => {
      result.current.setFilter('18.5', '25');
    });

    expect(result.current.state.minBmi).toBe('18.5');
    expect(result.current.state.maxBmi).toBe('25');
    expect(new URLSearchParams(window.location.search).get('minBmi')).toBe('18.5');
  });

  it('clears cursor and direction when the filter changes', () => {
    window.history.replaceState(null, '', '/?minBmi=10&cursor=abc&direction=next');
    const { result } = renderHook(() => useUrlState());

    act(() => {
      result.current.setFilter('20', '');
    });

    expect(result.current.state).toEqual({
      minBmi: '20',
      maxBmi: '',
      cursor: '',
      direction: '',
    });
    const current = new URLSearchParams(window.location.search);
    expect(current.get('cursor')).toBeNull();
    expect(current.get('direction')).toBeNull();
  });

  it('sets cursor and direction via setPage without touching the filter', () => {
    window.history.replaceState(null, '', '/?minBmi=18.5');
    const { result } = renderHook(() => useUrlState());

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
    window.history.replaceState(null, '', '/?minBmi=18.5&cursor=xyz&direction=next');
    const { result } = renderHook(() => useUrlState());

    act(() => {
      result.current.resetPagination();
    });

    expect(result.current.state).toEqual({
      minBmi: '18.5',
      maxBmi: '',
      cursor: '',
      direction: '',
    });
  });

  it('stays in sync when the URL changes via a popstate event (browser back/forward)', () => {
    const { result } = renderHook(() => useUrlState());

    act(() => {
      window.history.replaceState(null, '', '/?minBmi=30');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(result.current.state.minBmi).toBe('30');
  });
});
