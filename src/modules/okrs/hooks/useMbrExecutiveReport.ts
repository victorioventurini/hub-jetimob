/**
 * useMbrExecutiveReport
 *
 * Hook for fetching and generating AI-powered MBR (monthly) executive reports.
 * Reports are persisted in okr_wizard_sessions with wizard_type='mbr-executive-report'
 * and the monthRef stored inside `reflection_data`.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useBu } from '@/contexts/BuContext';
import { okrsKeys } from '@/lib/queryKeys/okrs';
import type { Json } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface MbrExecutiveReportTeamCommitment {
  teamName: string;
  focus: string;
  prioritizedItems: string[];
  crossDependencies: string[];
}

export interface MbrExecutiveReportTeamHighlight {
  teamName: string;
  accelerated: string;
  blocked: string;
  needsDecision: string;
}

export interface MbrExecutiveReportData {
  monthRef: string;
  monthNarrative: string;
  commitmentsAnalysis: string;
  kpiInsights: {
    healthy: string;
    atRisk: string;
    critical: string;
  };
  decisionsNeeded: string[];
  teamCommitments: MbrExecutiveReportTeamCommitment[];
  teamHighlights: MbrExecutiveReportTeamHighlight[];
}

type ReportRecord = Record<string, unknown>;

function isRecord(value: unknown): value is ReportRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (isRecord(value)) {
    const preferredKeys = ['title', 'description', 'text', 'name', 'teamName', 'focus'] as const;
    for (const key of preferredKeys) {
      const candidate = value[key];
      if (typeof candidate === 'string' && candidate.trim()) return candidate;
    }
  }
  return '';
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(toText).filter(Boolean);
}

function normalizeMbrExecutiveReportData(input: unknown): MbrExecutiveReportData {
  const root = isRecord(input) ? input : {};
  const source = typeof root.monthNarrative !== 'string' && isRecord(root.data)
    ? root.data
    : root;
  const kpiInsights = isRecord(source.kpiInsights) ? source.kpiInsights : {};

  return {
    monthRef: toText(source.monthRef),
    monthNarrative: toText(source.monthNarrative),
    commitmentsAnalysis: toText(source.commitmentsAnalysis),
    kpiInsights: {
      healthy: toText(kpiInsights.healthy),
      atRisk: toText(kpiInsights.atRisk),
      critical: toText(kpiInsights.critical),
    },
    decisionsNeeded: toStringArray(source.decisionsNeeded),
    teamCommitments: Array.isArray(source.teamCommitments)
      ? source.teamCommitments.map((c) => {
          const r = isRecord(c) ? c : {};
          return {
            teamName: toText(r.teamName) || 'Time não informado',
            focus: toText(r.focus),
            prioritizedItems: toStringArray(r.prioritizedItems),
            crossDependencies: toStringArray(r.crossDependencies),
          };
        })
      : [],
    teamHighlights: Array.isArray(source.teamHighlights)
      ? source.teamHighlights.map((h) => {
          const r = isRecord(h) ? h : {};
          return {
            teamName: toText(r.teamName) || 'Time não informado',
            accelerated: toText(r.accelerated),
            blocked: toText(r.blocked),
            needsDecision: toText(r.needsDecision),
          };
        })
      : [],
  };
}

export function useMbrExecutiveReport(cycleId: string | null, monthRef: string | null) {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = okrsKeys.mbrExecutiveReport(currentBuId, cycleId, monthRef);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      // Buscamos as últimas sessões do tipo no par (cycle, bu) e filtramos o
      // monthRef em JS porque está dentro de `reflection_data`.
      const { data, error } = await supabase
        .from('okr_wizard_sessions')
        .select('reflection_data, completed_at')
        .eq('wizard_type', 'mbr-executive-report')
        .eq('cycle_id', cycleId!)
        .eq('bu_id', currentBuId!)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      if (!data || data.length === 0) return null;

      for (const row of data) {
        const normalized = normalizeMbrExecutiveReportData(row.reflection_data);
        if (normalized.monthRef === monthRef && normalized.monthNarrative) {
          return { report: normalized, generatedAt: row.completed_at };
        }
      }
      return null;
    },
    enabled: !!cycleId && !!currentBuId && !!monthRef,
    staleTime: 5 * 60 * 1000,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error('Profile not loaded');
      if (!monthRef) throw new Error('monthRef required');

      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'mbr-executive-report',
        { body: { cycleId, monthRef, bu_id: currentBuId } },
      );

      if (fnError) throw fnError;

      const reportData = normalizeMbrExecutiveReportData(fnData?.data || fnData);
      if (!reportData.monthNarrative) {
        throw new Error('Invalid report response');
      }
      // Garantia: monthRef sempre presente no snapshot persistido.
      if (!reportData.monthRef) reportData.monthRef = monthRef;

      const { error: insertError } = await supabase
        .from('okr_wizard_sessions')
        .insert({
          wizard_type: 'mbr-executive-report',
          cycle_id: cycleId!,
          bu_id: currentBuId!,
          started_by: profile.id,
          status: 'completed' as const,
          completed_at: new Date().toISOString(),
          reflection_data: reportData as unknown as Json,
          // Relatório IA persistido como sessão (mesma estratégia do qbr-executive-report).
          structure_version: 'v1',
        });

      if (insertError) {
        console.error('Failed to persist MBR report:', insertError);
      }

      return reportData;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, {
        report: data,
        generatedAt: new Date().toISOString(),
      });
    },
    onError: (error: any) => {
      console.error('Failed to generate MBR report:', error);

      const message = error?.message || '';
      if (message.includes('NO_MBR_PRE_FOR_MONTH') || message.includes('Nenhum MBR-pré')) {
        toast.error('Nenhum líder submeteu MBR-pré para este mês ainda.');
      } else if (message.includes('429') || message.includes('Rate limit')) {
        toast.error('Limite de requisições atingido. Tente novamente em alguns minutos.');
      } else if (message.includes('402') || message.includes('credits')) {
        toast.error('Créditos de IA esgotados. Contate o administrador.');
      } else {
        toast.error('Erro ao gerar o relatório executivo. Tente novamente.');
      }
    },
  });

  return {
    report: query.data?.report ?? null,
    generatedAt: query.data?.generatedAt ?? null,
    isLoading: query.isLoading,
    generate: generateMutation.mutate,
    isGenerating: generateMutation.isPending,
  };
}
