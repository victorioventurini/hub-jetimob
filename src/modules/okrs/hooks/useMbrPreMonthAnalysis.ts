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

        const { data, error: invokeError } = await supabase.functions.invoke<EdgeResponse>(
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

        if (!data || data.origin === 'manual' || !data.output) {
          setError(data?.reason || 'Não foi possível gerar a análise no momento.');
          return null;
        }

        return {
          generatedAt: data.generatedAt || new Date().toISOString(),
          origin: 'ai-generated',
          referenceMonth: params.referenceMonth,
          summary: data.output.summary || '',
          highlights: data.output.highlights || [],
          offenders: data.output.offenders || [],
          risks: data.output.risks || [],
          recommendations: data.output.recommendations || [],
        };
      } catch (err: any) {
        setError(err?.message || 'Falha ao gerar análise');
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [currentBu?.id],
  );

  return { isGenerating, error, generate };
}
