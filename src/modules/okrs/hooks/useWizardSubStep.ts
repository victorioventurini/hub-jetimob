/**
 * useWizardSubStep — sub-step persistido no URL (?substep=...)
 *
 * Para wizards onde um step contém múltiplos itens navegáveis (ex.: KPI atual
 * no MBR > kpi-deep-dive, Time atual no MBR > team-okrs-detail). O valor é
 * apenas um cursor de UI; quando uma decisão/nota é registrada, a URL
 * preserva também o sub-contexto exato.
 *
 * Contrato:
 * - Lê `?substep=` na montagem (e quando o step do wizard muda).
 * - Sincroniza via `replaceState` (não polui histórico).
 * - Quando o sub-step assume o valor default → remove o param.
 * - Trabalha com qualquer tipo serializável via `serialize`/`deserialize`.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseWizardSubStepOptions<T> {
  /** Step atual do wizard — sub-step só é relevante dentro deste step. */
  currentStep: string;
  /** Step ao qual este sub-step pertence; fora dele, hook é noop. */
  ownerStep: string;
  /** Valor default (não escrito na URL). */
  defaultValue: T;
  /** Serializa o valor para a URL. */
  serialize?: (value: T) => string;
  /** Lê valor da URL. Retornar `null` mantém o default. */
  deserialize?: (raw: string) => T | null;
}

export function useWizardSubStep<T>({
  currentStep,
  ownerStep,
  defaultValue,
  serialize = (v) => String(v),
  deserialize = (raw) => raw as unknown as T,
}: UseWizardSubStepOptions<T>): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue;
    if (currentStep !== ownerStep) return defaultValue;
    const raw = new URLSearchParams(window.location.search).get('substep');
    if (raw == null) return defaultValue;
    const parsed = deserialize(raw);
    return parsed ?? defaultValue;
  });

  const lastStepRef = useRef(currentStep);

  // Quando o step muda, ressincronizar (lê URL se voltou para owner; reseta caso contrário)
  useEffect(() => {
    if (lastStepRef.current === currentStep) return;
    lastStepRef.current = currentStep;
    if (currentStep !== ownerStep) {
      // Sai deste step: limpa param e reseta valor
      const url = new URL(window.location.href);
      if (url.searchParams.has('substep')) {
        url.searchParams.delete('substep');
        window.history.replaceState(window.history.state, '', url.toString());
      }
      setValue(defaultValue);
      return;
    }
    const raw = new URLSearchParams(window.location.search).get('substep');
    const parsed = raw == null ? null : deserialize(raw);
    setValue(parsed ?? defaultValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, ownerStep]);

  const update = useCallback(
    (next: T) => {
      setValue(next);
      if (currentStep !== ownerStep) return;
      const url = new URL(window.location.href);
      const serialized = serialize(next);
      const isDefault = serialized === serialize(defaultValue);
      if (isDefault) {
        url.searchParams.delete('substep');
      } else {
        url.searchParams.set('substep', serialized);
      }
      window.history.replaceState(window.history.state, '', url.toString());
    },
    [currentStep, ownerStep, serialize, defaultValue],
  );

  return [value, update];
}
