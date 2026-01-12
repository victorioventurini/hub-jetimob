/**
 * useDebounce - Consolidated debounce hooks for the Hub
 * 
 * This module provides two patterns:
 * 1. useDebouncedValue - Debounce a value (for search inputs, etc.)
 * 2. useDebouncedCallback - Debounce a callback function (for auto-save, etc.)
 * 
 * @example Value debounce (search input)
 * ```tsx
 * const [search, setSearch] = useState('');
 * const debouncedSearch = useDebouncedValue(search, 300);
 * // debouncedSearch updates 300ms after last search change
 * ```
 * 
 * @example Callback debounce (auto-save)
 * ```tsx
 * const saveDraft = useDebouncedCallback((data) => {
 *   localStorage.setItem('draft', JSON.stringify(data));
 * }, 500);
 * // saveDraft will only execute 500ms after last call
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// =============================================================================
// VALUE DEBOUNCE
// =============================================================================

/**
 * Debounce a value. Returns the debounced value that updates after the delay.
 * 
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300)
 * @returns The debounced value
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * @deprecated Use useDebouncedValue instead
 * Alias for backwards compatibility
 */
export const useDebounce = useDebouncedValue;

// =============================================================================
// CALLBACK DEBOUNCE
// =============================================================================

/**
 * Debounce a callback function. The returned function will only execute
 * after the specified delay since the last call.
 * 
 * @param callback - The callback to debounce
 * @param delay - Delay in milliseconds
 * @returns The debounced callback
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);
  
  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  const debouncedCallback = useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }, [delay]) as T;
  
  return debouncedCallback;
}

// =============================================================================
// ADVANCED: Debounce with cancel/flush
// =============================================================================

export interface DebouncedFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): void;
  cancel: () => void;
  flush: () => void;
}

/**
 * Advanced debounce with cancel and flush capabilities.
 * Use when you need more control over the debounced function.
 * 
 * @param callback - The callback to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function with cancel() and flush() methods
 */
export function useDebouncedCallbackAdvanced<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): DebouncedFunction<T> {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);
  const lastArgsRef = useRef<Parameters<T> | null>(null);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    lastArgsRef.current = null;
  }, []);
  
  const flush = useCallback(() => {
    if (timeoutRef.current && lastArgsRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      callbackRef.current(...lastArgsRef.current);
      lastArgsRef.current = null;
    }
  }, []);
  
  const debouncedFn = useCallback((...args: Parameters<T>) => {
    lastArgsRef.current = args;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
      lastArgsRef.current = null;
    }, delay);
  }, [delay]) as DebouncedFunction<T>;
  
  debouncedFn.cancel = cancel;
  debouncedFn.flush = flush;
  
  return debouncedFn;
}
