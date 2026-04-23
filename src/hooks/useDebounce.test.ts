/**
 * Tests for useDebouncedValue / useDebouncedCallback / useDebouncedCallbackAdvanced.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useDebouncedValue,
  useDebouncedCallback,
  useDebouncedCallbackAdvanced,
} from './useDebounce';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('a', 200));
    expect(result.current).toBe('a');
  });

  it('updates only after delay elapses', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 200), {
      initialProps: { v: 'a' },
    });
    rerender({ v: 'b' });
    expect(result.current).toBe('a');
    act(() => {
      vi.advanceTimersByTime(199);
    });
    expect(result.current).toBe('a');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('b');
  });

  it('cancels prior pending update if value changes again', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 100), {
      initialProps: { v: 'a' },
    });
    rerender({ v: 'b' });
    act(() => {
      vi.advanceTimersByTime(50);
    });
    rerender({ v: 'c' });
    act(() => {
      vi.advanceTimersByTime(99);
    });
    expect(result.current).toBe('a');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('c');
  });
});

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('only invokes callback once after multiple rapid calls', () => {
    const cb = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(cb, 200));
    act(() => {
      result.current('a');
      result.current('b');
      result.current('c');
    });
    expect(cb).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith('c');
  });

  it('invokes again if called after delay elapsed', () => {
    const cb = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(cb, 100));
    act(() => result.current('first'));
    act(() => {
      vi.advanceTimersByTime(100);
    });
    act(() => result.current('second'));
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(cb).toHaveBeenCalledTimes(2);
  });
});

describe('useDebouncedCallbackAdvanced', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('cancel() prevents pending invocation', () => {
    const cb = vi.fn();
    const { result } = renderHook(() => useDebouncedCallbackAdvanced(cb, 200));
    act(() => result.current('x'));
    act(() => result.current.cancel());
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(cb).not.toHaveBeenCalled();
  });

  it('flush() invokes immediately with last args', () => {
    const cb = vi.fn();
    const { result } = renderHook(() => useDebouncedCallbackAdvanced(cb, 200));
    act(() => result.current('y'));
    act(() => result.current.flush());
    expect(cb).toHaveBeenCalledWith('y');
  });

  it('flush() does nothing when no pending call', () => {
    const cb = vi.fn();
    const { result } = renderHook(() => useDebouncedCallbackAdvanced(cb, 200));
    act(() => result.current.flush());
    expect(cb).not.toHaveBeenCalled();
  });
});
