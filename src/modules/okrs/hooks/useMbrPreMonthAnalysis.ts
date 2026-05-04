/**
 * useMbrPreMonthAnalysis — Invoca a edge function `mbr-pre-month-analysis`
 *
 * Reutiliza o agente `analista-estrategico` (não cria agente por rito).
 * Recebe panorama mensal estruturado e devolve análise IA cacheada no draft.
 */

import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBu } from '@/contexts/BuContext';
import type {
  MbrPreMonthAnalysis,
  MbrKpiSnapshot,
  MbrPreDraftData,
} from '@/modules/okrs/types/wizard';

export interface MonthAnalysisProjectInput {
  name: string;
  reason: string;
}

export interface UseMbrPreMonthAnalysisParams {
  teamName: string;
  referenceMonth: string; // YYYY-MM
  krFinalStates: MbrPreDraftData['krFinalStates'];
  kpis: MbrKpiSnapshot[];
  overdueProjects: MonthAnalysisProjectInput[];
  krTitleById?: Map<string, string>;
}

interface EdgeResponse {
  origin: 'ai-generated' | 'manual';
  generatedAt?: string;
  reason?: string;
  output: MbrPreMonthAnalysis | null;
}

interface WrappedEdgeResponse {
  success: boolean;
  data?: EdgeResponse;
  error?: {
    message?: string;
    code?: string;
  };
}

function unwrapEdgeResponse(response: EdgeResponse | WrappedEdgeResponse | null): EdgeResponse | null {
  if (!response) return null;
  if ('data' in response && response.data) return response.data;
  if ('origin' in response) return response;
  return null;
}

function previousMonth(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number);
  if (!y || !m) return yyyymm;
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function useMbrPreMonthAnalysis() {
  const { currentBu } = useBu();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (params: UseMbrPreMonthAnalysisParams): Promise<MbrPreMonthAnalysis | null> => {
      if (!currentBu?.id) {
        setError('BU não selecionada');
        return null;
      }

      setIsGenerating(true);
      setError(null);

      try {
        const krs = params.krFinalStates.map((kr) => ({
          title: params.krTitleById?.get(kr.krId) ?? kr.krTitle ?? kr.krId,
          state: kr.state,
          finalProgress: kr.finalProgress,
          paceStatus: kr.paceStatus,
          isContributed: kr.isContributed === true,
        }));

        const kpis = params.kpis.map((k) => {
          const deltaPct =
            k.previousValue != null && k.currentValue != null && k.previousValue !== 0
              ? ((k.currentValue - k.previousValue) / Math.abs(k.previousValue)) * 100
              : null;
          return {
            name: k.name,
            unit: k.unit,
            currentValue: k.currentValue,
            previousValue: k.previousValue,
            target: k.target,
            ragStatus: k.ragStatus,
            deltaPct: deltaPct != null ? Math.round(deltaPct * 10) / 10 : null,
          };
        });

        const totals = {
          krsTotal: krs.length,
          krsAttention: krs.filter((kr) => {
            const s = (kr.state ?? '').toLowerCase();
            return s.includes('risk') || s.includes('off') || s.includes('stagnant');
          }).length,
          kpisTotal: kpis.length,
          kpisAttention: kpis.filter(
            (k) => k.ragStatus === 'red' || k.ragStatus === 'yellow',
          ).length,
          projectsTotal: params.overdueProjects.length,
          projectsAttention: params.overdueProjects.length,
        };

        const { data, error: invokeError } = await supabase.functions.invoke<EdgeResponse | WrappedEdgeResponse>(
          'mbr-pre-month-analysis',
          {
            body: {
              bu_id: currentBu.id,
              teamName: params.teamName,
              referenceMonth: params.referenceMonth,
              previousMonth: previousMonth(params.referenceMonth),
              krs,
              kpis,
              overdueProjects: params.overdueProjects,
              totals,
            },
          },
        );

        if (invokeError) {
          setError(invokeError.message);
          return null;
        }

        const response = unwrapEdgeResponse(data ?? null);

        if (!response || response.origin === 'manual' || !response.output) {
          setError(response?.reason || 'Não foi possível gerar a análise no momento.');
          return null;
        }

        // Sanitização: substituir UUIDs sobreviventes por nomes (cinto+suspensórios).
        const nameById = new Map<string, string>();
        for (const [id, t] of (params.krTitleById ?? new Map<string, string>())) nameById.set(id, t);
        for (const k of params.kpis) if (k.kpiId && k.name) nameById.set(k.kpiId, k.name);
        const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
        const scrub = (s: string): string =>
          (s ?? '').replace(UUID_RE, (u) => nameById.get(u.toLowerCase()) ?? nameById.get(u) ?? '(item)');
        const scrubItem = (it: { title: string; detail: string }) => ({
          title: scrub(it.title),
          detail: scrub(it.detail),
        });

        return {
          generatedAt: response.generatedAt || new Date().toISOString(),
          origin: 'ai-generated',
          referenceMonth: params.referenceMonth,
          summary: scrub(response.output.summary || ''),
          highlights: (response.output.highlights || []).map(scrubItem),
          offenders: (response.output.offenders || []).map(scrubItem),
          risks: (response.output.risks || []).map(scrubItem),
          recommendations: (response.output.recommendations || []).map(scrub),
        };
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Falha ao gerar análise');
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [currentBu?.id],
  );

  return { isGenerating, error, generate };
}
