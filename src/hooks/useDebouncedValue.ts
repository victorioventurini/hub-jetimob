import { useState, useEffect } from 'react';

/**
 * Hook para debounce de valores.
 * Útil para campos de busca onde queremos esperar o usuário parar de digitar.
 * 
 * @param value - O valor a ser debounced
 * @param delay - O delay em milissegundos (padrão: 300ms)
 * @returns O valor debounced
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
