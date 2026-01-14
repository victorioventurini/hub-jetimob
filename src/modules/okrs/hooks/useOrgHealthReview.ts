/**
 * useOrgHealthReview - Hook para análise de SAÚDE DE EXECUÇÃO das OKRs organizacionais
 * 
 * Focado em:
 * - Progresso de cada objetivo organizacional
 * - Check-ins e contribuições de times
 * - Análise automática por IA de cada objetivo
 * - Análise consolidada da organização
 */

import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";
import { useState, useCallback, useMemo, useEffect } from "react";
import { 
  type OrgObjectiveHealthReview,
  type OrgKrHealthData,
  type OrgHealthAiAnalysis,
  type ConsolidatedOrgAnalysis,
  type OrgHealthReviewData,
  type LinkedTeamKr,
  determineHealthStatus,
  getProgressStatus,
} from "../types/org-health-review";

// ============================================================
// RAW DATA TYPES
// ============================================================

interface RawOrgKr {
  id: string;
  title: string;
  baseline: number | null;
  target: number | null;
  current_value: number | null;
  unit: string | null;
  last_checkin_at: string | null;
}

interface RawTeamKrLink {
  id: string;
  title: string;
  current_value: number | null;
  target: number | null;
  last_checkin_at: string | null;
  linked_org_kr_id: string;
  team: { id: string; name: string } | null;
}

interface RawOrgObjective {
  id: string;
  title: string;
  description: string | null;
  year: number;
  key_results: RawOrgKr[];
}

// ============================================================
// HOOK PRINCIPAL
// ============================================================

export function useOrgHealthReview(year?: number): OrgHealthReviewData {
  const buSupabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const currentYear = year || new Date().getFullYear();

  // AI analysis states
  const [aiAnalyses, setAiAnalyses] = useState<Record<string, OrgHealthAiAnalysis>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [aiErrors, setAiErrors] = useState<Record<string, string>>({});
  const [autoEvaluateTriggered, setAutoEvaluateTriggered] = useState<Set<string>>(new Set());

  // Consolidated analysis states
  const [consolidatedAnalysis, setConsolidatedAnalysis] = useState<ConsolidatedOrgAnalysis | undefined>();
  const [consolidatedLoading, setConsolidatedLoading] = useState(false);
  const [consolidatedError, setConsolidatedError] = useState<string | undefined>();
  const [consolidatedTriggered, setConsolidatedTriggered] = useState(false);

  // ────────────────────────────────────────────────────────────
  // FETCH ORG OBJECTIVES WITH KRS
  // ────────────────────────────────────────────────────────────

  const { data: rawObjectives, isLoading: isLoadingObjectives, error: objectivesError } = useQuery({
    queryKey: queryKeys.okrs.orgHealthReview(currentBuId, currentYear),
    queryFn: async (): Promise<RawOrgObjective[]> => {
      const { data, error } = await buSupabase
        .from('okr_org_objectives')
        .select(`
          id,
          title,
          description,
          year,
          key_results:okr_org_key_results (
            id,
            title,
            baseline,
            target,
            current_value,
            unit,
            last_checkin_at
          )
        `)
        .eq('year', currentYear)
        .is('deleted_at', null)
        .is('cancelled_at', null)
        .order('created_at');

      if (error) throw error;
      return (data || []) as unknown as RawOrgObjective[];
    },
    enabled: !!buSupabase && !!currentBuId,
    staleTime: 2 * 60 * 1000,
  });

  // ────────────────────────────────────────────────────────────
  // FETCH TEAM KR LINKS (contributions to org KRs)
  // ────────────────────────────────────────────────────────────

  const orgKrIds = useMemo(() => {
    if (!rawObjectives) return [];
    return rawObjectives.flatMap(obj => obj.key_results.map(kr => kr.id));
  }, [rawObjectives]);

  const { data: teamKrLinks, isLoading: isLoadingLinks } = useQuery({
    queryKey: queryKeys.okrs.orgKrTeamLinks(currentBuId, orgKrIds),
    queryFn: async (): Promise<RawTeamKrLink[]> => {
      if (!orgKrIds.length) return [];

      const { data, error } = await buSupabase
        .from('okr_team_key_results')
        .select(`
          id,
          title,
          current_value,
          target,
          last_checkin_at,
          linked_org_kr_id,
          objective:okr_team_objectives!inner (
            team:teams (id, name)
          )
        `)
        .in('linked_org_kr_id', orgKrIds)
        .is('deleted_at', null)
        .is('cancelled_at', null);

      if (error) throw error;
      
      // Flatten the nested structure
      return (data || []).map(item => ({
        id: item.id,
        title: item.title,
        current_value: item.current_value,
        target: item.target,
        last_checkin_at: item.last_checkin_at,
        linked_org_kr_id: item.linked_org_kr_id!,
        team: (item.objective as any)?.team || null,
      }));
    },
    enabled: !!buSupabase && !!currentBuId && orgKrIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  // ────────────────────────────────────────────────────────────
  // TRANSFORM DATA
  // ────────────────────────────────────────────────────────────

  const objectives: OrgObjectiveHealthReview[] = useMemo(() => {
    if (!rawObjectives) return [];

    // Create a map of org KR id -> linked team KRs
    const linkMap = new Map<string, LinkedTeamKr[]>();
    (teamKrLinks || []).forEach(link => {
      const existing = linkMap.get(link.linked_org_kr_id) || [];
      if (link.team) {
        const progress = link.target && link.target > 0 
          ? Math.round(((link.current_value || 0) / link.target) * 100)
          : 0;
        existing.push({
          teamId: link.team.id,
          teamName: link.team.name,
          teamKrId: link.id,
          teamKrTitle: link.title,
          teamKrProgress: Math.min(100, Math.max(0, progress)),
          lastCheckinAt: link.last_checkin_at,
        });
      }
      linkMap.set(link.linked_org_kr_id, existing);
    });

    return rawObjectives.map(obj => {
      // Transform KRs with linked teams
      const keyResults: OrgKrHealthData[] = obj.key_results.map(kr => {
        const progress = kr.target && kr.target > 0
          ? Math.round(((kr.current_value || 0) / kr.target) * 100)
          : 0;
        const clampedProgress = Math.min(100, Math.max(0, progress));

        return {
          id: kr.id,
          title: kr.title,
          baseline: kr.baseline,
          target: kr.target,
          currentValue: kr.current_value,
          unit: kr.unit,
          progress: clampedProgress,
          status: getProgressStatus(clampedProgress),
          lastCheckinAt: kr.last_checkin_at,
          linkedTeams: linkMap.get(kr.id) || [],
        };
      });

      // Calculate objective-level metrics
      const totalProgress = keyResults.length > 0
        ? Math.round(keyResults.reduce((sum, kr) => sum + kr.progress, 0) / keyResults.length)
        : 0;

      const linkedTeamsCount = new Set(
        keyResults.flatMap(kr => kr.linkedTeams.map(t => t.teamId))
      ).size;

      // Find most recent checkin
      const allCheckins = keyResults
        .map(kr => kr.lastCheckinAt)
        .filter(Boolean)
        .sort()
        .reverse();
      const lastCheckinAt = allCheckins[0] || null;

      // Calculate health score
      // Factors: progress, recency of check-ins, team coverage
      const progressScore = totalProgress;
      const checkinRecencyScore = calculateCheckinRecencyScore(keyResults);
      const coverageScore = keyResults.length > 0 
        ? Math.round((keyResults.filter(kr => kr.linkedTeams.length > 0).length / keyResults.length) * 100)
        : 0;
      
      const healthScore = Math.round((progressScore * 0.5) + (checkinRecencyScore * 0.3) + (coverageScore * 0.2));

      return {
        objectiveId: obj.id,
        objectiveTitle: obj.title,
        objectiveDescription: obj.description || undefined,
        progress: totalProgress,
        krCount: keyResults.length,
        linkedTeamsCount,
        healthScore,
        healthStatus: determineHealthStatus(healthScore),
        lastCheckinAt,
        keyResults,
        aiAnalysis: aiAnalyses[obj.id],
        aiAnalysisLoading: aiLoading[obj.id] || false,
        aiAnalysisError: aiErrors[obj.id],
      };
    });
  }, [rawObjectives, teamKrLinks, aiAnalyses, aiLoading, aiErrors]);

  // ────────────────────────────────────────────────────────────
  // CALCULATE SCORES
  // ────────────────────────────────────────────────────────────

  const scores = useMemo(() => {
    if (!objectives.length) {
      return { cohesion: 0, distribution: 0, coverage: 0, traceability: 0, overall: 0 };
    }

    // Cohesion: % of KRs with team contributions
    const totalKrs = objectives.reduce((sum, obj) => sum + obj.krCount, 0);
    const krsWithContributions = objectives.reduce(
      (sum, obj) => sum + obj.keyResults.filter(kr => kr.linkedTeams.length > 0).length, 
      0
    );
    const cohesion = totalKrs > 0 ? (krsWithContributions / totalKrs) * 10 : 0;

    // Distribution: average number of teams per KR
    const avgTeamsPerKr = totalKrs > 0
      ? objectives.reduce(
          (sum, obj) => sum + obj.keyResults.reduce((s, kr) => s + kr.linkedTeams.length, 0),
          0
        ) / totalKrs
      : 0;
    const distribution = Math.min(10, avgTeamsPerKr * 3); // Cap at 10

    // Coverage: % of objectives with good health
    const healthyObjectives = objectives.filter(obj => obj.healthStatus === 'healthy').length;
    const coverage = (healthyObjectives / objectives.length) * 10;

    // Traceability: % of KRs with recent check-ins
    const krsWithRecentCheckins = objectives.reduce(
      (sum, obj) => sum + obj.keyResults.filter(kr => isRecentCheckin(kr.lastCheckinAt)).length,
      0
    );
    const traceability = totalKrs > 0 ? (krsWithRecentCheckins / totalKrs) * 10 : 0;

    const overall = (cohesion + distribution + coverage + traceability) / 4;

    return {
      cohesion: Math.round(cohesion * 10) / 10,
      distribution: Math.round(distribution * 10) / 10,
      coverage: Math.round(coverage * 10) / 10,
      traceability: Math.round(traceability * 10) / 10,
      overall: Math.round(overall * 10) / 10,
    };
  }, [objectives]);

  // ────────────────────────────────────────────────────────────
  // COUNTS
  // ────────────────────────────────────────────────────────────

  const counts = useMemo(() => ({
    totalObjectives: objectives.length,
    healthyCount: objectives.filter(obj => obj.healthStatus === 'healthy').length,
    attentionCount: objectives.filter(obj => obj.healthStatus === 'attention').length,
    riskCount: objectives.filter(obj => obj.healthStatus === 'risk').length,
  }), [objectives]);

  // ────────────────────────────────────────────────────────────
  // AI ANALYSIS - INDIVIDUAL OBJECTIVES
  // ────────────────────────────────────────────────────────────

  const evaluateObjective = useCallback(async (objective: OrgObjectiveHealthReview) => {
    if (aiLoading[objective.objectiveId] || aiAnalyses[objective.objectiveId]) return;
    if (!currentBuId) return;

    setAiLoading(prev => ({ ...prev, [objective.objectiveId]: true }));
    setAiErrors(prev => ({ ...prev, [objective.objectiveId]: '' }));

    try {
      const { data, error } = await buSupabase.functions.invoke('okr-org-health-review', {
        body: {
          mode: 'objective',
          objective: {
            id: objective.objectiveId,
            title: objective.objectiveTitle,
            description: objective.objectiveDescription,
            progress: objective.progress,
            keyResults: objective.keyResults.map(kr => ({
              id: kr.id,
              title: kr.title,
              baseline: kr.baseline,
              target: kr.target,
              currentValue: kr.currentValue,
              unit: kr.unit,
              progress: kr.progress,
              lastCheckinAt: kr.lastCheckinAt,
              linkedTeams: kr.linkedTeams.map(t => ({
                teamId: t.teamId,
                teamName: t.teamName,
                teamKrTitle: t.teamKrTitle,
                teamKrProgress: t.teamKrProgress,
                lastCheckinAt: t.lastCheckinAt,
              })),
            })),
          },
        },
      });

      if (error) throw error;
      if (data?.analysis) {
        setAiAnalyses(prev => ({ ...prev, [objective.objectiveId]: data.analysis }));
      }
    } catch (err) {
      console.error('AI analysis error:', err);
      setAiErrors(prev => ({
        ...prev,
        [objective.objectiveId]: err instanceof Error ? err.message : 'Erro ao analisar',
      }));
    } finally {
      setAiLoading(prev => ({ ...prev, [objective.objectiveId]: false }));
    }
  }, [aiLoading, aiAnalyses, buSupabase, currentBuId]);

  // Trigger auto-evaluation when objectives load
  useEffect(() => {
    if (!objectives.length) return;

    objectives.forEach((obj, index) => {
      if (!autoEvaluateTriggered.has(obj.objectiveId) && !aiAnalyses[obj.objectiveId] && !aiLoading[obj.objectiveId]) {
        setAutoEvaluateTriggered(prev => new Set(prev).add(obj.objectiveId));
        // Stagger requests
        setTimeout(() => evaluateObjective(obj), index * 1500);
      }
    });
  }, [objectives, autoEvaluateTriggered, aiAnalyses, aiLoading, evaluateObjective]);

  // ────────────────────────────────────────────────────────────
  // AI ANALYSIS - CONSOLIDATED
  // ────────────────────────────────────────────────────────────

  const evaluateConsolidated = useCallback(async () => {
    if (consolidatedLoading || consolidatedAnalysis || !currentBuId) return;
    if (!objectives.length) return;

    // Only trigger after all individual analyses are done
    const allDone = objectives.every(obj => 
      aiAnalyses[obj.objectiveId] || aiErrors[obj.objectiveId]
    );
    if (!allDone) return;

    setConsolidatedLoading(true);
    setConsolidatedError(undefined);

    try {
      const { data, error } = await buSupabase.functions.invoke('okr-org-health-review', {
        body: {
          mode: 'org-analysis',
          objectives: objectives.map(obj => ({
            id: obj.objectiveId,
            title: obj.objectiveTitle,
            progress: obj.progress,
            healthScore: obj.healthScore,
            healthStatus: obj.healthStatus,
            krCount: obj.krCount,
            linkedTeamsCount: obj.linkedTeamsCount,
          })),
          gaps: {
            objectivesAtRisk: counts.riskCount,
            objectivesNeedingAttention: counts.attentionCount,
            krsWithoutContributions: objectives.reduce(
              (sum, obj) => sum + obj.keyResults.filter(kr => kr.linkedTeams.length === 0).length,
              0
            ),
            krsWithoutRecentCheckins: objectives.reduce(
              (sum, obj) => sum + obj.keyResults.filter(kr => !isRecentCheckin(kr.lastCheckinAt)).length,
              0
            ),
          },
          scores,
        },
      });

      if (error) throw error;
      if (data?.consolidatedAnalysis) {
        setConsolidatedAnalysis(data.consolidatedAnalysis);
      }
    } catch (err) {
      console.error('Consolidated analysis error:', err);
      setConsolidatedError(err instanceof Error ? err.message : 'Erro na análise consolidada');
    } finally {
      setConsolidatedLoading(false);
    }
  }, [consolidatedLoading, consolidatedAnalysis, currentBuId, objectives, aiAnalyses, aiErrors, counts, scores, buSupabase]);

  // Trigger consolidated analysis when all individual analyses are done
  useEffect(() => {
    if (consolidatedTriggered) return;
    if (!objectives.length) return;

    const allDone = objectives.every(obj => 
      aiAnalyses[obj.objectiveId] || aiErrors[obj.objectiveId]
    );

    if (allDone) {
      setConsolidatedTriggered(true);
      setTimeout(() => evaluateConsolidated(), 500);
    }
  }, [objectives, aiAnalyses, aiErrors, consolidatedTriggered, evaluateConsolidated]);

  // ────────────────────────────────────────────────────────────
  // ACTIONS
  // ────────────────────────────────────────────────────────────

  const reEvaluateObjective = useCallback((objectiveId: string) => {
    const obj = objectives.find(o => o.objectiveId === objectiveId);
    if (obj) {
      setAiAnalyses(prev => {
        const copy = { ...prev };
        delete copy[objectiveId];
        return copy;
      });
      evaluateObjective(obj);
    }
  }, [objectives, evaluateObjective]);

  const refreshConsolidatedAnalysis = useCallback(() => {
    setConsolidatedAnalysis(undefined);
    setConsolidatedTriggered(false);
    // Will be triggered by the useEffect
  }, []);

  // ────────────────────────────────────────────────────────────
  // RETURN
  // ────────────────────────────────────────────────────────────

  return {
    year: currentYear,
    objectives,
    scores,
    counts,
    consolidatedAnalysis,
    consolidatedAnalysisLoading: consolidatedLoading,
    consolidatedAnalysisError: consolidatedError,
    isLoading: isLoadingObjectives || isLoadingLinks,
    error: objectivesError as Error | null,
    reEvaluateObjective,
    refreshConsolidatedAnalysis,
  };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function calculateCheckinRecencyScore(keyResults: OrgKrHealthData[]): number {
  if (keyResults.length === 0) return 0;
  
  const now = new Date();
  let totalScore = 0;

  keyResults.forEach(kr => {
    if (!kr.lastCheckinAt) {
      totalScore += 0;
    } else {
      const daysSince = Math.floor(
        (now.getTime() - new Date(kr.lastCheckinAt).getTime()) / (24 * 60 * 60 * 1000)
      );
      if (daysSince <= 7) totalScore += 100;
      else if (daysSince <= 14) totalScore += 70;
      else if (daysSince <= 30) totalScore += 40;
      else totalScore += 10;
    }
  });

  return Math.round(totalScore / keyResults.length);
}

function isRecentCheckin(checkinAt: string | null): boolean {
  if (!checkinAt) return false;
  const daysSince = Math.floor(
    (new Date().getTime() - new Date(checkinAt).getTime()) / (24 * 60 * 60 * 1000)
  );
  return daysSince <= 14;
}
