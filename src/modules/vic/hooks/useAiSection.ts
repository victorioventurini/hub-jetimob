/**
 * useAiSection — wrapper canônico para seções de UI que dependem de IA opcional.
 *
 * Por que existir
 * ---------------
 * Wizards do Next (criação de OKR, MBR Pre, QBR Pre, Check-in etc.) seguem
 * sempre o MESMO padrão para enriquecer telas com IA:
 *
 *   1. Esperar `isReady` do client + `buId` selecionado.
 *   2. Esperar `bu_ia_config` carregar; se IA desativada → usar fallback.
 *   3. Pré-popular UI com fallback imediato (UX nunca trava).
 *   4. Disparar 1+ chamadas `invokeVic` em paralelo, com timeout e silent toast.
 *   5. Sobrescrever cada slot só se a IA responder a tempo.
 *   6. Garantir `useRef` anti-double-fetch (efeito que reroda).
 *
 * Antes deste hook, os 10+ wizards reimplementavam essa máquina à mão. Erro
 * comum (caso Giordano): esquecer de pré-popular o fallback, deixando a UI
 * presa em loading se a IA atrasasse.
 *
 * Uso
 * ---
 * ```tsx
 * const { values, isLoading } = useAiSection({
 *   slots: {
 *     greeting: {
 *       agent: 'validador-metodologico-okrs',
 *       actionContext: 'okr-create-objective',
 *       context: { type: 'wizard-intro', additionalData: { userName, teamName } },
 *       userQuestion: 'Gere uma saudação...',
 *       fallback: `Olá, ${firstName}!`,
 *     },
 *     message: {
 *       agent: 'cultura',
 *       actionContext: 'dashboard-culture',
 *       context: { type: 'wizard-intro', additionalData: { teamName } },
 *       userQuestion: 'Mensagem curta sobre OKRs...',
 *       fallback: 'OKRs servem para fazer as coisas certas.',
 *     },
 *   },
 *   timeoutMs: 10_000,
 * });
 *
 * // values.greeting / values.message já vêm preenchidos com fallback
 * // e são sobrescritos quando a IA responde.
 * ```
 *
 * Regras
 * ------
 * - NÃO reimplementar `withTimeout`/`Promise.race`/`AbortController` no caller.
 * - NÃO chamar `invokeVic` direto em wizards; sempre via este hook ou
 *   diretamente via `useVicAgent` quando precisar de feedback inline (ex.: validação).
 * - Toda resiliência (timeout/fallback) mora em `useVicAgent.ts`. Este hook
 *   só orquestra a parte de UI/efeito.
 */
import { useEffect, useRef, useState } from 'react';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { useWizardAI } from '@/modules/okrs/hooks';
import { useVicEnabled } from './useVicAgent';
import type { VicAgentSlug, VicActionContext, VicContext } from '../types';

export interface AiSlotConfig {
  agent: VicAgentSlug;
  actionContext: VicActionContext;
  context: VicContext;
  userQuestion?: string;
  /** Texto exibido enquanto a IA responde (ou para sempre, se IA falhar/desabilitada). */
  fallback: string;
}

export interface UseAiSectionOptions<TSlots extends Record<string, AiSlotConfig>> {
  /** Mapa de slots (chaves arbitrárias). Cada slot vira `values[key]`. */
  slots: TSlots;
  /** Timeout por chamada (default 10s). Passar 0 para opt-out. */
  timeoutMs?: number;
  /** Quando true, não dispara as chamadas (ex.: step ainda não foi montado). */
  disabled?: boolean;
}

export interface UseAiSectionResult<TSlots extends Record<string, AiSlotConfig>> {
  /** Valores resolvidos (fallback inicial, IA sobrescreve quando responde). */
  values: Record<keyof TSlots, string>;
  /**
   * `true` enquanto qualquer chamada de IA está em curso.
   * Não bloqueie UI por causa disso — `values` já tem fallback.
   */
  isLoading: boolean;
  /** `true` se IA está desativada para a BU OU não há BU selecionada. */
  isAiUnavailable: boolean;
}

const DEFAULT_TIMEOUT_MS = 10_000;

export function useAiSection<TSlots extends Record<string, AiSlotConfig>>({
  slots,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  disabled = false,
}: UseAiSectionOptions<TSlots>): UseAiSectionResult<TSlots> {
  const { invokeVic } = useWizardAI();
  const { isReady, buId } = useOptionalBuClient();
  const { isEnabled: isIaEnabled, isLoading: isIaConfigLoading } = useVicEnabled();

  // Inicializa todos os slots com seus fallbacks (UX nunca trava).
  const initialValues = Object.fromEntries(
    Object.entries(slots).map(([key, cfg]) => [key, cfg.fallback]),
  ) as Record<keyof TSlots, string>;

  const [values, setValues] = useState<Record<keyof TSlots, string>>(initialValues);
  const [isLoading, setIsLoading] = useState(false);
  const hasFetched = useRef(false);

  const isAiUnavailable = !buId || (!isIaConfigLoading && !isIaEnabled);

  useEffect(() => {
    if (disabled) return;
    if (!isReady) return;
    if (!buId) return; // sem BU → mantém fallback
    if (isIaConfigLoading) return;
    if (!isIaEnabled) return; // IA off → mantém fallback
    if (hasFetched.current) return;

    hasFetched.current = true;
    setIsLoading(true);

    const entries = Object.entries(slots) as Array<[keyof TSlots, AiSlotConfig]>;

    const promises = entries.map(([key, cfg]) =>
      invokeVic(cfg.agent, cfg.actionContext, cfg.context, cfg.userQuestion, {
        silent: true,
        timeoutMs,
      })
        .then((r) => ({ key, response: r?.response ?? null }))
        .catch(() => ({ key, response: null as string | null })),
    );

    Promise.all(promises)
      .then((results) => {
        setValues((prev) => {
          const next = { ...prev };
          for (const { key, response } of results) {
            if (response) next[key] = response;
          }
          return next;
        });
      })
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, buId, isIaConfigLoading, isIaEnabled, disabled]);

  return { values, isLoading, isAiUnavailable };
}
