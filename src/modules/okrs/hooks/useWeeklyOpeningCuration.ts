/**
 * useWeeklyOpeningCuration
 *
 * Invoca a edge function `weekly-curate-opening` (que chama o agente
 * `curador-orquestrador` via Lovable AI Gateway) e mapeia o output JSON
 * para a estrutura tipada `WeeklyExecutiveOpening` consumida pelo Step 1
 * da Weekly v2. Em caso de fallback (`origin='manual'`), devolve apenas
 * o motivo para o front renderizar o banner "modo manual".
 */

import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBu } from '@/contexts/BuContext';
import { useIdentity } from '@/hooks/useIdentity';
import type {
  WeeklyExecutiveOpening,
  WeeklyTheme,
  RitualBlock,
  RitualThemeActionType,
  WeeklyPriorityItem,
  WeeklyPeopleSignalAggregated,
} from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES (espelho do output da edge)
// ============================================================

interface CuratorBlockItem {
  title?: string;
  summary?: string;
  urgency?: 'alta' | 'media' | 'baixa';
  leaders?: string[];
  suggestedDecision?: string;
}

interface CuratorOutput {
  executiveSummary?: string;
  blocks?: {
    performance?: CuratorBlockItem[];
    projects?: CuratorBlockItem[];
    people?: CuratorBlockItem[];
  };
  suggestedOrder?: string[];
  outOfAgenda?: string[];
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
// HELPERS
// ============================================================

const BLOCK_KEY_MAP: Record<keyof NonNullable<CuratorOutput['blocks']>, RitualBlock> = {
  performance: 'performance',
  projects: 'projetos',
  people: 'pessoas',
};

function mapCuratorOutputToOpening(
  output: CuratorOutput,
  generatedAt: string,
  byProfileId: string | null,
  prevTransitions: WeeklyExecutiveOpening['transitions'],
): WeeklyExecutiveOpening {
  const themes: WeeklyTheme[] = [];
  const alertsByBlock = { performance: [] as string[], projetos: [] as string[], pessoas: [] as string[] };

  (Object.keys(BLOCK_KEY_MAP) as Array<keyof typeof BLOCK_KEY_MAP>).forEach((srcBlock) => {
    const dstBlock = BLOCK_KEY_MAP[srcBlock];
    const items = output.blocks?.[srcBlock] ?? [];
    items.forEach((item, idx) => {
      const title = (item.title || '').trim();
      if (!title) return;
      const themeType: RitualThemeActionType =
        item.urgency === 'alta' ? 'risco' : item.urgency === 'baixa' ? 'oportunidade' : 'alerta';
      themes.push({
        id: `${dstBlock}-${idx}-${Date.now()}`,
        title,
        block: dstBlock,
        type: themeType,
        motivation: item.summary || '',
        suggestedDecision: item.suggestedDecision,
        affectedTeams: Array.isArray(item.leaders) ? item.leaders : [],
      });
      // Item de urgência alta também vira alerta consultivo no bloco
      if (item.urgency === 'alta' && item.summary) {
        alertsByBlock[dstBlock].push(item.summary);
      }
    });
  });

  const suggestedOrder = (output.suggestedOrder ?? []).map((title, idx) => {
    const matched = themes.find((t) => t.title === title);
    return { themeId: matched?.id ?? `unmatched-${idx}`, minutes: 10 };
  });

  return {
    state: 'draft',
    origin: 'ai-curated',
    generatedAt,
    summary: output.executiveSummary || '',
    themes,
    alertsByBlock,
    offAgenda: output.outOfAgenda ?? [],
    suggestedOrder,
    transitions: [
      ...prevTransitions,
      { state: 'draft', at: generatedAt, by: byProfileId },
    ],
  };
}

// ============================================================
// HOOK
// ============================================================

export interface UseWeeklyOpeningCurationParams {
  referenceWeek: string;
  topics: WeeklyPriorityItem[];
  peopleSignals: WeeklyPeopleSignalAggregated[];
  coverage: { totalLeaders: number; submittedLeaders: number; pendingLeaders: number };
}

export interface UseWeeklyOpeningCurationReturn {
  isGenerating: boolean;
  error: string | null;
  generate: (
    prevOpening: WeeklyExecutiveOpening,
  ) => Promise<{ next: WeeklyExecutiveOpening; reason?: string } | null>;
}

export function useWeeklyOpeningCuration(
  params: UseWeeklyOpeningCurationParams,
): UseWeeklyOpeningCurationReturn {
  const { currentBu } = useBu();
  const { realProfileId } = useIdentity();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (prevOpening: WeeklyExecutiveOpening) => {
      if (!currentBu?.id) {
        setError('BU não selecionada');
        return null;
      }

      setIsGenerating(true);
      setError(null);

      try {
        const aggregatedTopics = params.topics.map((t) => ({
          teamName: t.teamName,
          title: t.topic.title,
          category: t.topic.category,
          urgency: t.topic.priority,
          rationale: t.topic.context,
        }));
        const aggregatedSignals = params.peopleSignals.map((s) => ({
          teamName: s.teamName,
          type: s.signal.type,
          description: s.signal.description,
        }));

        const { data, error: invokeError } = await supabase.functions.invoke<CurateEdgeResponse>(
          'weekly-curate-opening',
          {
            body: {
              bu_id: currentBu.id,
              buName: currentBu.name,
              referenceWeek: params.referenceWeek,
              topics: aggregatedTopics,
              peopleSignals: aggregatedSignals,
              coverage: params.coverage,
            },
          },
        );

        if (invokeError) {
          setError(invokeError.message);
          return null;
        }

        if (!data || data.origin === 'manual' || !data.output) {
          // Fallback: mantém estrutura atual mas registra origem manual
          return {
            next: { ...prevOpening, origin: 'manual' as const },
            reason: data?.reason || 'MANUAL_FALLBACK',
          };
        }

        const generatedAt = data.generatedAt || new Date().toISOString();
        const next = mapCuratorOutputToOpening(
          data.output,
          generatedAt,
          realProfileId,
          prevOpening.transitions,
        );
        return { next };
      } catch (err: any) {
        setError(err?.message || 'Falha ao gerar rascunho');
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [currentBu?.id, currentBu?.name, params, realProfileId],
  );

  return { isGenerating, error, generate };
}
