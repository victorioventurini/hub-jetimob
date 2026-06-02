/**
 * useMbrOpeningCuration
 *
 * Invoca a edge function `mbr-curate-opening` (que chama o agente
 * `curador-orquestrador` via Lovable AI Gateway com insumos mensais)
 * e mapeia o output JSON para a estrutura tipada `MbrPanoramaCuration`
 * consumida pelo Step 1 (Panorama Executivo) do MBR.
 *
 * Espelho 1:1 de `useWeeklyOpeningCuration` — varia apenas o payload
 * (insumos mensais vs. semanais), conforme determina o doc canônico
 * `docs/canonical/AI_AGENTS_PHILOSOPHY.md` (sem criar `curador-mbr`).
 *
 * Em caso de fallback (`origin='manual'`), devolve apenas o motivo
 * para o front renderizar o banner "modo manual" e preservar a edição.
 */

import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBu } from '@/contexts/BuContext';
import { useIdentity } from '@/hooks/useIdentity';
import { showAiEdgeFunctionErrorToast } from '@/modules/okrs/utils/edgeFunctionError';
import type {
  MbrPanoramaCuration,
  MbrPanoramaCriticalKpiHighlight,
  MbrPanoramaSuggestedDecision,
  MbrKpiSnapshot,
} from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES (espelho do output da edge)
// ============================================================

interface CuratorOutput {
  executiveSummary?: string;
  criticalKpiHighlights?: Array<{
    kpiId?: string;
    headline?: string;
    impact?: string;
  }>;
  alertsByBlock?: {
    performance?: string[];
    projetos?: string[];
    pessoas?: string[];
  };
  suggestedDecisions?: Array<{
    title?: string;
    category?: string;
  }>;
  coverage?: { rate?: number; level?: 'full' | 'partial' | 'critical' };
}

interface CurateEdgeResponse {
  origin: 'ai-curated' | 'manual';
  reason?: string;
  generatedAt?: string;
  output?: CuratorOutput | null;
}

interface EdgeSuccessEnvelope<T> {
  success: true;
  data: T;
}

// ============================================================
// HELPERS
// ============================================================

function mapCuratorOutputToCuration(
  output: CuratorOutput,
  generatedAt: string,
  byProfileId: string | null,
  prevTransitions: MbrPanoramaCuration['transitions'],
): MbrPanoramaCuration {
  const highlights: MbrPanoramaCriticalKpiHighlight[] = (output.criticalKpiHighlights ?? [])
    .map((h) => ({
      kpiId: (h.kpiId ?? '').trim(),
      headline: (h.headline ?? '').trim(),
      impact: (h.impact ?? '').trim(),
    }))
    .filter((h) => h.headline.length > 0);

  const suggestedDecisions: MbrPanoramaSuggestedDecision[] = (output.suggestedDecisions ?? [])
    .map((d, idx) => ({
      id: `mbr-curated-${idx}-${Date.now()}`,
      title: (d.title ?? '').trim(),
      category: d.category,
      added: false,
    }))
    .filter((d) => d.title.length > 0);

  const alertsByBlock = {
    performance: (output.alertsByBlock?.performance ?? []).filter((s) => (s ?? '').trim()),
    projetos: (output.alertsByBlock?.projetos ?? []).filter((s) => (s ?? '').trim()),
    pessoas: (output.alertsByBlock?.pessoas ?? []).filter((s) => (s ?? '').trim()),
  };

  return {
    state: 'draft',
    origin: 'ai-curated',
    generatedAt,
    summary: output.executiveSummary || '',
    criticalKpiHighlights: highlights,
    alertsByBlock,
    suggestedDecisions,
    transitions: [
      ...prevTransitions,
      { state: 'draft', at: generatedAt, by: byProfileId },
    ],
  };
}

function unwrapCurateResponse(
  response: CurateEdgeResponse | EdgeSuccessEnvelope<CurateEdgeResponse> | null,
): CurateEdgeResponse | null {
  if (!response) return null;
  if ('data' in response && 'success' in response && response.success === true) {
    return response.data;
  }
  return response as CurateEdgeResponse;
}

// ============================================================
// HOOK
// ============================================================

export interface UseMbrOpeningCurationParams {
  /** YYYY-MM */
  referenceMonth: string;
  /** KPIs do escopo org/área (já filtrados upstream pelo MbrPage). */
  kpiSnapshots: MbrKpiSnapshot[];
  /** Objetivos org com progresso/tendência. */
  orgObjectives: Array<{
    objectiveId: string;
    title: string;
    progress: number;
    trend?: string;
    status?: string;
  }>;
  /** Agregados consolidados dos pré-MBRs dos times. */
  mbrPreAggregates: {
    needsDecisionCount: number;
    crossDepCount: number;
    kpiJustifCount: number;
    kpiUpdatedCount: number;
    projectJustifCount: number;
    agendaSuggestionCount: number;
  };
  /** Cobertura: quantos times submeteram pré-MBR. */
  coverage: {
    totalTeams: number;
    submittedTeams: number;
    pendingTeams: number;
  };
  /** Define o tom do prompt: 'mbr' (default) ou 'all-hands' (comunicação ampla, sem sugestões). */
  ritualContext?: 'mbr' | 'all-hands';
}

export interface UseMbrOpeningCurationReturn {
  isGenerating: boolean;
  error: string | null;
  generate: (
    prevCuration: MbrPanoramaCuration,
  ) => Promise<{ next: MbrPanoramaCuration; reason?: string } | null>;
}

export function useMbrOpeningCuration(
  params: UseMbrOpeningCurationParams,
): UseMbrOpeningCurationReturn {
  const { currentBu } = useBu();
  const { realProfileId } = useIdentity();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (prevCuration: MbrPanoramaCuration) => {
      if (!currentBu?.id) {
        setError('BU não selecionada');
        return null;
      }

      setIsGenerating(true);
      setError(null);

      try {
        // Filtra para o curador apenas KPIs com sinal estratégico
        // (red/yellow ou sem dados — green não pede atenção executiva).
        const criticalKpis = params.kpiSnapshots
          .filter((k) => k.ragStatus === 'red' || k.ragStatus === 'yellow' || k.ragStatus === 'no_data')
          .map((k) => ({
            kpiId: k.kpiId,
            name: k.name,
            currentValue: k.currentValue,
            target: k.target,
            ragStatus: k.ragStatus,
            scope: k.scope ?? 'org',
            areaName: k.areaName ?? null,
          }));

        const orgObjectives = params.orgObjectives.map((o) => ({
          objectiveId: o.objectiveId,
          title: o.title,
          progress: Number(o.progress ?? 0),
          trend: o.trend,
          status: o.status,
        }));

        const { data, error: invokeError } = await supabase.functions.invoke<
          CurateEdgeResponse | EdgeSuccessEnvelope<CurateEdgeResponse>
        >('mbr-curate-opening', {
          body: {
            bu_id: currentBu.id,
            buName: currentBu.name,
            referenceMonth: params.referenceMonth,
            criticalKpis,
            orgObjectives,
            mbrPreAggregates: params.mbrPreAggregates,
            coverage: params.coverage,
            ritualContext: params.ritualContext ?? 'mbr',
          },
        });

        if (invokeError) {
          setError(invokeError.message);
          await showAiEdgeFunctionErrorToast(
            invokeError,
            'Não foi possível gerar o rascunho com IA.',
          );
          return null;
        }

        const response = unwrapCurateResponse(data ?? null);

        if (!response || response.origin === 'manual' || !response.output) {
          // Fallback: mantém estrutura atual mas registra origem manual
          return {
            next: { ...prevCuration, origin: 'manual' as const },
            reason: response?.reason || 'MANUAL_FALLBACK',
          };
        }

        const generatedAt = response.generatedAt || new Date().toISOString();
        const next = mapCuratorOutputToCuration(
          response.output,
          generatedAt,
          realProfileId,
          prevCuration.transitions,
        );
        return { next };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Falha ao gerar rascunho';
        setError(message);
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [currentBu?.id, currentBu?.name, params, realProfileId],
  );

  return { isGenerating, error, generate };
}
