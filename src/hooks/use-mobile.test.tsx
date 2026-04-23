/**
 * Tests for useIsMobile — responsive breakpoint hook (768px).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from './use-mobile';

describe('useIsMobile', () => {
  let listeners: Array<(e: MediaQueryListEvent) => void>;
  let originalInnerWidth: number;

  beforeEach(() => {
    listeners = [];
    originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: (_: string, cb: any) => listeners.push(cb),
        removeEventListener: (_: string, cb: any) => {
          listeners = listeners.filter((l) => l !== cb);
        },
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      })),
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth });
  });

  function setWidth(w: number) {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: w });
  }

  it('returns true when window is below 768px', () => {
    setWidth(500);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('returns false when window is 768px or above', () => {
    setWidth(1024);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('returns false at exact breakpoint (768px)', () => {
    setWidth(768);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('reacts to viewport changes via media query listener', () => {
    setWidth(1200);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
    act(() => {
      setWidth(400);
      listeners.forEach((l) => l({} as MediaQueryListEvent));
    });
    expect(result.current).toBe(true);
  });
});
