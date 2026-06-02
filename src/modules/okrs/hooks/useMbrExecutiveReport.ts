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
import { showAiEdgeFunctionErrorToast } from '@/modules/okrs/utils/edgeFunctionError';

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

export interface MbrExecutiveReportProjectIssue {
  teamName: string;
  kind: 'project' | 'milestone';
  refId: string;
  name?: string;
  projectName?: string;
  justification: string;
}

export interface MbrExecutiveReportKrIssue {
  teamName: string;
  krId: string;
  title?: string;
  paceStatus: string | null;
  finalProgress: number | null;
  state: string | null;
  justification: string;
}

export interface MbrExecutiveReportKpiIssue {
  teamName: string;
  kpiId: string;
  kind: 'justified' | 'no_data';
  text: string;
}

export interface MbrExecutiveReportKpiToCreate {
  teamName: string;
  description: string;
  suggestedScope: string;
}

export interface MbrExecutiveReportAgendaSuggestion {
  teamName: string;
  text: string;
}

export interface MbrExecutiveReportMonthAnalysis {
  teamName: string;
  summary: string;
  offenders: string[];
  risks: string[];
  recommendations: string[];
}

export interface MbrExecutiveReportObjectiveAchievement {
  id: string;
  title: string;
  teamName: string;
  progress: number;
  krCount: number;
}

export interface MbrExecutiveReportTeamAchievement {
  teamId: string;
  teamName: string;
  progress: number;
  objectivesCount: number;
  krCount: number;
}

export interface MbrExecutiveReportOverallAchievement {
  overallProgress: number;
  byTeam: MbrExecutiveReportTeamAchievement[];
  byObjective: MbrExecutiveReportObjectiveAchievement[];
}

export interface MbrExecutiveReportAnalyzedTeam {
  teamId: string;
  teamName: string;
  leaderName: string | null;
  completedAt: string | null;
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
  projectsAnalysis: string;
  krIssuesAnalysis: string;
  leaderSignals: string;
  projectIssues: MbrExecutiveReportProjectIssue[];
  krIssues: MbrExecutiveReportKrIssue[];
  kpiIssues: MbrExecutiveReportKpiIssue[];
  kpisToCreate: MbrExecutiveReportKpiToCreate[];
  agendaSuggestions: MbrExecutiveReportAgendaSuggestion[];
  monthAnalyses: MbrExecutiveReportMonthAnalysis[];
  overallAchievement: MbrExecutiveReportOverallAchievement;
  analyzedTeams: MbrExecutiveReportAnalyzedTeam[];
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

function toNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
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
    projectsAnalysis: toText(source.projectsAnalysis),
    krIssuesAnalysis: toText(source.krIssuesAnalysis),
    leaderSignals: toText(source.leaderSignals),
    projectIssues: Array.isArray(source.projectIssues)
      ? source.projectIssues.map((p) => {
          const r = isRecord(p) ? p : {};
          const kind = r.kind === 'milestone' ? 'milestone' : 'project';
          return {
            teamName: toText(r.teamName) || 'Time não informado',
            kind,
            refId: toText(r.refId),
            name: toText(r.name) || undefined,
            projectName: toText(r.projectName) || undefined,
            justification: toText(r.justification),
          } as MbrExecutiveReportProjectIssue;
        }).filter((p) => p.justification)
      : [],
    krIssues: Array.isArray(source.krIssues)
      ? source.krIssues.map((k) => {
          const r = isRecord(k) ? k : {};
          return {
            teamName: toText(r.teamName) || 'Time não informado',
            krId: toText(r.krId),
            title: toText(r.title) || undefined,
            paceStatus: typeof r.paceStatus === 'string' ? r.paceStatus : null,
            finalProgress: toNumberOrNull(r.finalProgress),
            state: typeof r.state === 'string' ? r.state : null,
            justification: toText(r.justification),
          } as MbrExecutiveReportKrIssue;
        }).filter((k) => k.justification)
      : [],
    kpiIssues: Array.isArray(source.kpiIssues)
      ? source.kpiIssues.map((k) => {
          const r = isRecord(k) ? k : {};
          const kind = r.kind === 'no_data' ? 'no_data' : 'justified';
          return {
            teamName: toText(r.teamName) || 'Time não informado',
            kpiId: toText(r.kpiId),
            kind,
            text: toText(r.text),
          } as MbrExecutiveReportKpiIssue;
        }).filter((k) => k.text)
      : [],
    kpisToCreate: Array.isArray(source.kpisToCreate)
      ? source.kpisToCreate.map((k) => {
          const r = isRecord(k) ? k : {};
          return {
            teamName: toText(r.teamName) || 'Time não informado',
            description: toText(r.description),
            suggestedScope: toText(r.suggestedScope),
          };
        }).filter((k) => k.description)
      : [],
    agendaSuggestions: Array.isArray(source.agendaSuggestions)
      ? source.agendaSuggestions.map((a) => {
          const r = isRecord(a) ? a : {};
          return {
            teamName: toText(r.teamName) || 'Time não informado',
            text: toText(r.text) || toText(a),
          };
        }).filter((a) => a.text)
      : [],
    monthAnalyses: Array.isArray(source.monthAnalyses)
      ? source.monthAnalyses.map((m) => {
          const r = isRecord(m) ? m : {};
          return {
            teamName: toText(r.teamName) || 'Time não informado',
            summary: toText(r.summary),
            offenders: toStringArray(r.offenders),
            risks: toStringArray(r.risks),
            recommendations: toStringArray(r.recommendations),
          };
        }).filter((m) => m.summary || m.offenders.length || m.risks.length || m.recommendations.length)
      : [],
    overallAchievement: (() => {
      const oa = isRecord(source.overallAchievement) ? source.overallAchievement : {};
      const byTeam = Array.isArray(oa.byTeam)
        ? oa.byTeam.map((t) => {
            const r = isRecord(t) ? t : {};
            return {
              teamId: toText(r.teamId),
              teamName: toText(r.teamName) || 'Time não informado',
              progress: toNumberOrNull(r.progress) ?? 0,
              objectivesCount: toNumberOrNull(r.objectivesCount) ?? 0,
              krCount: toNumberOrNull(r.krCount) ?? 0,
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
              progress: toNumberOrNull(r.progress) ?? 0,
              krCount: toNumberOrNull(r.krCount) ?? 0,
            };
          })
        : [];
      return {
        overallProgress: toNumberOrNull(oa.overallProgress) ?? 0,
        byTeam,
        byObjective,
      };
    })(),
    analyzedTeams: Array.isArray(source.analyzedTeams)
      ? source.analyzedTeams.map((t) => {
          const r = isRecord(t) ? t : {};
          return {
            teamId: toText(r.teamId),
            teamName: toText(r.teamName) || 'Time não informado',
            leaderName: typeof r.leaderName === 'string' && r.leaderName.trim() ? r.leaderName : null,
            completedAt: typeof r.completedAt === 'string' ? r.completedAt : null,
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
    onError: async (error: any) => {
      console.error('Failed to generate MBR report:', error);

      const message = error?.message || '';
      if (message.includes('NO_MBR_PRE_FOR_MONTH') || message.includes('Nenhum MBR-pré')) {
        toast.error('Nenhum líder submeteu MBR-pré para este mês ainda.');
        return;
      }
      await showAiEdgeFunctionErrorToast(error, 'Erro ao gerar o relatório executivo. Tente novamente.');
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
