/**
 * useQbrExecutiveReport
 * 
 * Hook for fetching and generating AI-powered QBR executive reports.
 * Reports are persisted in okr_wizard_sessions with wizard_type = 'qbr-executive-report'.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useBu } from '@/contexts/BuContext';
import { okrsKeys } from '@/lib/queryKeys/okrs';
import type { Json } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface QbrExecutiveReportObjectiveAchievement {
  id: string;
  title: string;
  teamName: string;
  progress: number;
  krCount: number;
}

export interface QbrExecutiveReportTeamAchievement {
  teamId: string;
  teamName: string;
  progress: number;
  objectivesCount: number;
  krCount: number;
}

export interface QbrExecutiveReportOverallAchievement {
  overallProgress: number;
  byTeam: QbrExecutiveReportTeamAchievement[];
  byObjective: QbrExecutiveReportObjectiveAchievement[];
}

export interface QbrExecutiveAnalyzedTeam {
  teamId: string;
  teamName: string;
  leaderName: string | null;
  completedAt: string | null;
}

export interface QbrExecutiveReportData {
  quarterNarrative: string;
  proposalsAnalysis: string;
  kpiInsights: {
    healthy: string;
    atRisk: string;
    critical: string;
  };
  decisionsNeeded: string[];
  teamProposals: Array<{
    teamName: string;
    objectiveTitle: string;
    krCount: number;
    krs: string[];
  }>;
  overallAchievement: QbrExecutiveReportOverallAchievement;
  analyzedTeams: QbrExecutiveAnalyzedTeam[];
}

type ReportRecord = Record<string, unknown>;

function isRecord(value: unknown): value is ReportRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  if (isRecord(value)) {
    const preferredKeys = ['title', 'description', 'text', 'name', 'objectiveTitle', 'teamName'] as const;

    for (const key of preferredKeys) {
      const candidate = value[key];
      if (typeof candidate === 'string' && candidate.trim()) return candidate;
    }
  }

  return '';
}

function toInteger(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return 0;
}

function normalizeQbrExecutiveReportData(input: unknown): QbrExecutiveReportData {
  const root = isRecord(input) ? input : {};
  const source = typeof root.quarterNarrative !== 'string' && isRecord(root.data) ? root.data : root;
  const kpiInsights = isRecord(source.kpiInsights) ? source.kpiInsights : {};

  return {
    quarterNarrative: toText(source.quarterNarrative),
    proposalsAnalysis: toText(source.proposalsAnalysis),
    kpiInsights: {
      healthy: toText(kpiInsights.healthy),
      atRisk: toText(kpiInsights.atRisk),
      critical: toText(kpiInsights.critical),
    },
    decisionsNeeded: Array.isArray(source.decisionsNeeded)
      ? source.decisionsNeeded.map(toText).filter(Boolean)
      : [],
    teamProposals: Array.isArray(source.teamProposals)
      ? source.teamProposals.map((proposal) => {
          const proposalRecord = isRecord(proposal) ? proposal : {};

          return {
            teamName: toText(proposalRecord.teamName) || 'Time não informado',
            objectiveTitle:
              toText(proposalRecord.objectiveTitle) ||
              toText(proposalRecord.title) ||
              'Objetivo não informado',
            krCount: toInteger(proposalRecord.krCount),
            krs: Array.isArray(proposalRecord.krs)
              ? proposalRecord.krs.map(toText).filter(Boolean)
              : [],
          };
        })
      : [],
    overallAchievement: (() => {
      const oa = isRecord(source.overallAchievement) ? source.overallAchievement : {};
      const byTeam = Array.isArray(oa.byTeam)
        ? oa.byTeam.map((t) => {
            const r = isRecord(t) ? t : {};
            return {
              teamId: toText(r.teamId),
              teamName: toText(r.teamName) || 'Time não informado',
              progress: toInteger(r.progress),
              objectivesCount: toInteger(r.objectivesCount),
              krCount: toInteger(r.krCount),
            };
          })
        : [];
      const byObjective = Array.isArray(oa.byObjective)
        ? oa.byObjective.map((o) => {
            const r = isRecord(o) ? o : {};
            return {
              id: toText(r.id),
              title: toText(r.title),
              teamName: toText(r.teamName) || 'Time não informado',
              progress: toInteger(r.progress),
              krCount: toInteger(r.krCount),
            };
          })
        : [];
      return {
        overallProgress: toInteger(oa.overallProgress),
        byTeam,
        byObjective,
      };
    })(),
    analyzedTeams: Array.isArray(source.analyzedTeams)
      ? source.analyzedTeams.map((t) => {
          const r = isRecord(t) ? t : {};
          const leader = toText(r.leaderName);
          const completed = toText(r.completedAt);
          return {
            teamId: toText(r.teamId),
            teamName: toText(r.teamName) || 'Time não informado',
            leaderName: leader ? leader : null,
            completedAt: completed ? completed : null,
          };
        })
      : [],
  };
}

export function useQbrExecutiveReport(cycleId: string | null) {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = okrsKeys.qbrExecutiveReport(currentBuId, cycleId);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('okr_wizard_sessions')
        .select('reflection_data, completed_at')
        .eq('wizard_type', 'qbr-executive-report')
        .eq('cycle_id', cycleId!)
        .eq('bu_id', currentBuId!)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        report: normalizeQbrExecutiveReportData(data.reflection_data),
        generatedAt: data.completed_at,
      };
    },
    enabled: !!cycleId && !!currentBuId,
    staleTime: 5 * 60 * 1000,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error('Profile not loaded');

      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'qbr-executive-report',
        { body: { cycleId, bu_id: currentBuId } }
      );

      if (fnError) throw fnError;

      const reportData = normalizeQbrExecutiveReportData(fnData?.data || fnData);
      if (!reportData.quarterNarrative) {
        throw new Error('Invalid report response');
      }

      const { error: insertError } = await supabase
        .from('okr_wizard_sessions')
        .insert({
          wizard_type: 'qbr-executive-report',
          cycle_id: cycleId!,
          bu_id: currentBuId!,
          started_by: profile.id,
          status: 'completed' as const,
          completed_at: new Date().toISOString(),
          reflection_data: reportData as unknown as Json,
          // qbr-executive-report não é WizardPersona padrão (relatório IA persistido como sessão).
          // Mantém v1 explícito até o relatório ser incorporado ao framework.
          structure_version: 'v1',
        });

      if (insertError) {
        console.error('Failed to persist QBR report:', insertError);
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
      console.error('Failed to generate QBR report:', error);

      const message = error?.message || '';
      if (message.includes('429') || message.includes('Rate limit')) {
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
