import { useState, useEffect, useMemo } from "react";
import { useUrlSearch } from "./useUrlState";

/**
 * Hook for instant-feedback search with URL state sync.
 * 
 * Provides a local state that updates immediately for responsive UI,
 * while debouncing URL updates to avoid excessive history entries.
 * 
 * @param key - URL parameter key (default: "q")
 * @param debounceMs - Debounce delay in ms (default: 300)
 * 
 * @example
 * const { value, setValue, urlValue } = useLocalSearch("q", 300);
 * 
 * // Use `value` for filtering (instant)
 * // Use `setValue` for input onChange
 * // URL updates automatically after debounce
 */
export function useLocalSearch(key = "q", debounceMs = 300) {
  const { value: urlValue, set: setUrlValue } = useUrlSearch(key, debounceMs);
  const [localValue, setLocalValue] = useState(urlValue);

  // Sync local state when URL changes (navigation, reload, back/forward)
  useEffect(() => {
    setLocalValue(urlValue);
  }, [urlValue]);

  // Debounce: update URL after inactivity
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== urlValue) {
        setUrlValue(localValue);
      }
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [localValue, urlValue, setUrlValue, debounceMs]);

  return useMemo(() => ({
    /** Local value for instant UI feedback (use in Input value and filtering) */
    value: localValue,
    /** Setter for instant local update */
    setValue: setLocalValue,
    /** Current URL value (for debugging/sync checks) */
    urlValue,
  }), [localValue, urlValue]);
}
