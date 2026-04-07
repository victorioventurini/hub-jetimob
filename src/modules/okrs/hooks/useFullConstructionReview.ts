/**
 * useFullConstructionReview - Avaliação consolidada de OKRs de TODOS os times de um quarter
 * 
 * Reutiliza types e edge function de construction-review.
 * Objetivo: superar silos — análise cross-team + sugestões de OKRs compartilhadas.
 */

import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useCycle } from "./useCycleData";
import { 
  type ObjectiveReview, 
  type AiAssessment,
  type TeamAnalysisResult,
  type OrgObjective,
  REVIEW_CRITERIA,
  determineReviewStatus,
} from "../types/construction-review";

// ============================================================
// TYPES
// ============================================================

interface RawKeyResult {
  id: string;
  title: string;
  type: string | null;
  baseline: number | null;
  target: number | null;
  unit: string | null;
  owner_user_id: string | null;
}

interface RawObjective {
  id: string;
  title: string;
  description: string | null;
  team_id: string;
  org_objective_id: string | null;
  owner_user_id: string | null;
  team: { id: string; name: string };
  org_objective: { id: string; title: string } | null;
  key_results: RawKeyResult[];
}

export interface TeamGroup {
  teamId: string;
  teamName: string;
  objectives: ObjectiveReview[];
  avgScore: number;
  approvedCount: number;
  needsImprovementCount: number;
  pendingCount: number;
}

export interface FullReviewResult {
  teams: TeamGroup[];
  globalAvgScore: number;
  totalObjectives: number;
  totalApproved: number;
  totalNeedsImprovement: number;
  totalPending: number;
  // Cross-team analysis
  crossTeamAnalysis?: TeamAnalysisResult;
  crossTeamAnalysisLoading: boolean;
  crossTeamAnalysisError?: string;
}

// ============================================================
// HOOK
// ============================================================

export function useFullConstructionReview(cycleId: string | null) {
  const buSupabase = useBuScopedSupabase();
  const { currentBuId } = useBu();

  // AI state
  const [aiAssessments, setAiAssessments] = useState<Record<string, AiAssessment>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [aiErrors, setAiErrors] = useState<Record<string, string>>({});
  const [autoEvalQueue, setAutoEvalQueue] = useState<Set<string>>(new Set());
  
  // Cross-team analysis state
  const [crossAnalysis, setCrossAnalysis] = useState<TeamAnalysisResult | null>(null);
  const [crossAnalysisLoading, setCrossAnalysisLoading] = useState(false);
  const [crossAnalysisError, setCrossAnalysisError] = useState<string | null>(null);
  const crossAnalysisTriggered = useRef(false);

  // Reset on cycle change
  useEffect(() => {
    setAiAssessments({});
    setAiLoading({});
    setAiErrors({});
    setAutoEvalQueue(new Set());
    setCrossAnalysis(null);
    setCrossAnalysisLoading(false);
    setCrossAnalysisError(null);
    crossAnalysisTriggered.current = false;
  }, [cycleId]);

  // Fetch ALL objectives for cycle
  const { data: rawObjectives, isLoading, error } = useQuery({
    queryKey: queryKeys.okrs.fullConstructionReview(currentBuId, cycleId),
    queryFn: async (): Promise<RawObjective[]> => {
      if (!cycleId) return [];

      const { data, error } = await buSupabase
        .from('okr_team_objectives')
        .select(`
          id,
          title,
          description,
          team_id,
          org_objective_id,
          owner_user_id,
          team:teams!inner (id, name),
          org_objective:okr_org_objectives (id, title),
          key_results:okr_team_key_results (
            id,
            title,
            type,
            baseline,
            target,
            unit,
            owner_user_id,
            deleted_at,
            cancelled_at
          )
        `)
        .eq('cycle_id', cycleId)
        .is('cancelled_at', null)
        .is('deleted_at', null)
        .neq('status', 'cancelled')
        .neq('status', 'discarded')
        .order('created_at');

      if (error) throw error;
      
      return (data || []).map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        team_id: item.team_id,
        org_objective_id: item.org_objective_id,
        owner_user_id: item.owner_user_id,
        team: item.team as unknown as { id: string; name: string },
        org_objective: item.org_objective as unknown as { id: string; title: string } | null,
        key_results: ((item.key_results || []) as any[])
          .filter((kr: any) => !kr.deleted_at && !kr.cancelled_at) as unknown as RawKeyResult[],
      }));
    },
    enabled: !!buSupabase && !!currentBuId && !!cycleId,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch cycle info
  const { data: cycleInfo } = useCycle(cycleId);

  // Fetch cycle year for org objectives
  const { data: cycleData } = useQuery({
    queryKey: ['cycle-year', cycleId],
    queryFn: async () => {
      if (!cycleId) return null;
      const { data, error } = await buSupabase
        .from('cycles')
        .select('id, name, start_date')
        .eq('id', cycleId)
        .single();
      if (error) throw error;
      const year = data?.start_date 
        ? parseInt(data.start_date.substring(0, 4), 10)
        : parseInt(data?.name?.slice(0, 4) || '0');
      return { ...data, year };
    },
    enabled: !!buSupabase && !!cycleId,
    staleTime: 10 * 60 * 1000,
  });

  const cycleYear = cycleData?.year;

  // Fetch org objectives
  const { data: orgObjectives } = useQuery({
    queryKey: queryKeys.okrs.orgObjectivesWithKrs(currentBuId, cycleYear),
    queryFn: async (): Promise<OrgObjective[]> => {
      if (!cycleYear) return [];
      const { data, error } = await buSupabase
        .from('okr_org_objectives')
        .select(`
          id, title, description,
          key_results:okr_org_key_results (id, title, baseline, target, unit)
        `)
        .eq('year', cycleYear)
        .is('deleted_at', null)
        .is('cancelled_at', null);
      if (error) throw error;
      return (data || []).map(obj => ({
        id: obj.id,
        title: obj.title,
        description: obj.description || undefined,
        keyResults: (obj.key_results || []) as Array<{
          id: string; title: string; baseline: number | null; target: number | null; unit: string | null;
        }>,
      }));
    },
    enabled: !!buSupabase && !!currentBuId && !!cycleYear,
    staleTime: 5 * 60 * 1000,
  });

  // Evaluate single objective
  const evaluateObjective = useCallback(async (obj: RawObjective) => {
    if (aiLoading[obj.id] || aiAssessments[obj.id]) return;
    if (!currentBuId) return;

    setAiLoading(prev => ({ ...prev, [obj.id]: true }));
    setAiErrors(prev => ({ ...prev, [obj.id]: '' }));

    try {
      const { data, error } = await buSupabase.functions.invoke('okr-construction-review', {
        body: { 
          buId: currentBuId,
          objectiveId: obj.id,
          objectiveTitle: obj.title,
          objectiveDescription: obj.description,
          teamName: obj.team?.name,
          orgObjectiveTitle: obj.org_objective?.title,
          keyResults: obj.key_results,
        },
      });

      if (error) throw error;
      const responseData = data?.data ?? data;
      if (responseData?.assessment) {
        setAiAssessments(prev => ({ ...prev, [obj.id]: responseData.assessment }));
      }
    } catch (err) {
      console.error('AI assessment error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Erro ao avaliar';
      setAiErrors(prev => ({ 
        ...prev, 
        [obj.id]: errorMsg.includes('non-2xx') ? 'Edge Function retornou erro. Tente novamente.' : errorMsg
      }));
    } finally {
      setAiLoading(prev => ({ ...prev, [obj.id]: false }));
    }
  }, [aiLoading, aiAssessments, buSupabase, currentBuId]);

  // Auto-evaluate with staggering
  useEffect(() => {
    if (!rawObjectives?.length) return;

    rawObjectives.forEach((obj, index) => {
      if (!autoEvalQueue.has(obj.id) && !aiAssessments[obj.id] && !aiLoading[obj.id]) {
        setAutoEvalQueue(prev => new Set(prev).add(obj.id));
        const delay = index * 1500;
        setTimeout(() => evaluateObjective(obj), delay);
      }
    });
  }, [rawObjectives, autoEvalQueue, aiAssessments, aiLoading, evaluateObjective]);

  // Transform into ObjectiveReview[]
  const allObjectives: ObjectiveReview[] = useMemo(() => {
    if (!rawObjectives) return [];
    return rawObjectives.map(obj => {
      const aiAssessment = aiAssessments[obj.id];
      const score = aiAssessment?.overallScore ?? 0;
      return {
        objectiveId: obj.id,
        objectiveTitle: obj.title,
        objectiveDescription: obj.description || undefined,
        teamId: obj.team_id,
        teamName: obj.team?.name || 'Time',
        orgObjectiveTitle: obj.org_objective?.title,
        krCount: obj.key_results?.length || 0,
        keyResults: obj.key_results.map(kr => ({
          id: kr.id,
          title: kr.title,
          type: kr.type,
          baseline: kr.baseline,
          target: kr.target,
          unit: kr.unit,
          hasOwner: !!kr.owner_user_id,
        })),
        aiAssessment,
        aiAssessmentLoading: aiLoading[obj.id] || false,
        aiAssessmentError: aiErrors[obj.id],
        score,
        status: aiLoading[obj.id] ? 'analyzing' : determineReviewStatus(aiAssessment?.overallScore),
      };
    });
  }, [rawObjectives, aiAssessments, aiLoading, aiErrors]);

  // Group by team
  const teamGroups: TeamGroup[] = useMemo(() => {
    const map = new Map<string, ObjectiveReview[]>();
    for (const obj of allObjectives) {
      if (!map.has(obj.teamId)) map.set(obj.teamId, []);
      map.get(obj.teamId)!.push(obj);
    }
    return Array.from(map.entries()).map(([teamId, objectives]) => {
      const withScore = objectives.filter(o => o.aiAssessment);
      const avgScore = withScore.length > 0
        ? Math.round(withScore.reduce((s, o) => s + o.score, 0) / withScore.length)
        : 0;
      return {
        teamId,
        teamName: objectives[0].teamName,
        objectives,
        avgScore,
        approvedCount: objectives.filter(o => o.status === 'approved').length,
        needsImprovementCount: objectives.filter(o => o.status === 'needs_improvement').length,
        pendingCount: objectives.filter(o => o.status === 'pending' || o.status === 'analyzing').length,
      };
    });
  }, [allObjectives]);

  // Cross-team analysis trigger
  const evaluateCrossTeam = useCallback(async () => {
    if (crossAnalysisLoading || crossAnalysis || !currentBuId) return;
    if (!rawObjectives?.length || !orgObjectives) return;


    setCrossAnalysisLoading(true);
    setCrossAnalysisError(null);

    // Build per-team data for cross-team analysis
    const teamMap = new Map<string, typeof rawObjectives>();
    for (const obj of rawObjectives) {
      if (!teamMap.has(obj.team_id)) teamMap.set(obj.team_id, []);
      teamMap.get(obj.team_id)!.push(obj);
    }

    const teamsPayload = Array.from(teamMap.entries()).map(([teamId, objs]) => ({
      teamId,
      teamName: objs[0]?.team?.name || 'Time',
      objectives: objs.map(obj => ({
        id: obj.id,
        title: obj.title,
        description: obj.description,
        orgObjectiveId: obj.org_objective_id,
        orgObjectiveTitle: obj.org_objective?.title,
        keyResults: obj.key_results.map(kr => ({
          id: kr.id,
          title: kr.title,
          type: kr.type,
          baseline: kr.baseline,
          target: kr.target,
          unit: kr.unit,
          hasOwner: !!kr.owner_user_id,
        })),
      })),
    }));

    // Build otherTeamsObjectives format for each team
    const otherTeamsForAll = teamsPayload.map(t => ({
      teamId: t.teamId,
      teamName: t.teamName,
      leaderFirstName: '',
      objectives: t.objectives.map(o => ({ id: o.id, title: o.title })),
    }));

    try {
      const { data, error } = await buSupabase.functions.invoke('okr-construction-review', {
        body: { 
          buId: currentBuId,
          mode: 'team-analysis',
          teamId: 'cross-team',
          teamName: 'Todos os Times',
          cycleId,
          objectives: rawObjectives.map(obj => ({
            id: obj.id,
            title: obj.title,
            description: obj.description,
            orgObjectiveId: obj.org_objective_id,
            orgObjectiveTitle: obj.org_objective?.title,
            teamId: obj.team_id,
            teamName: obj.team?.name,
            keyResults: obj.key_results.map(kr => ({
              id: kr.id,
              title: kr.title,
              type: kr.type,
              baseline: kr.baseline,
              target: kr.target,
              unit: kr.unit,
              hasOwner: !!kr.owner_user_id,
            })),
          })),
          orgObjectives,
          otherTeamsObjectives: otherTeamsForAll,
        },
      });

      if (error) throw error;
      const responseData = data?.data ?? data;
      if (responseData?.teamAnalysis) {
        setCrossAnalysis(responseData.teamAnalysis);
      }
    } catch (err) {
      console.error('Cross-team analysis error:', err);
      setCrossAnalysisError(err instanceof Error ? err.message : 'Erro na análise cross-team');
    } finally {
      setCrossAnalysisLoading(false);
    }
  }, [crossAnalysisLoading, crossAnalysis, currentBuId, rawObjectives, orgObjectives, buSupabase, cycleId]);

  useEffect(() => {
    if (crossAnalysisTriggered.current) return;
    if (!rawObjectives?.length || !orgObjectives) return;
    
    crossAnalysisTriggered.current = true;
    const timer = setTimeout(() => evaluateCrossTeam(), 5000);
    return () => clearTimeout(timer);
  }, [rawObjectives, orgObjectives, evaluateCrossTeam]);

  // Re-evaluate
  const reEvaluateObjective = useCallback((objectiveId: string) => {
    const obj = rawObjectives?.find(o => o.id === objectiveId);
    if (obj) {
      setAiAssessments(prev => {
        const copy = { ...prev };
        delete copy[objectiveId];
        return copy;
      });
      evaluateObjective(obj);
    }
  }, [rawObjectives, evaluateObjective]);

  // Global stats
  const result: FullReviewResult = useMemo(() => {
    const withScore = allObjectives.filter(o => o.aiAssessment);
    const globalAvg = withScore.length > 0
      ? Math.round(withScore.reduce((s, o) => s + o.score, 0) / withScore.length)
      : 0;
    return {
      teams: teamGroups,
      globalAvgScore: globalAvg,
      totalObjectives: allObjectives.length,
      totalApproved: allObjectives.filter(o => o.status === 'approved').length,
      totalNeedsImprovement: allObjectives.filter(o => o.status === 'needs_improvement').length,
      totalPending: allObjectives.filter(o => o.status === 'pending' || o.status === 'analyzing').length,
      crossTeamAnalysis: crossAnalysis || undefined,
      crossTeamAnalysisLoading: crossAnalysisLoading,
      crossTeamAnalysisError: crossAnalysisError || undefined,
    };
  }, [teamGroups, allObjectives, crossAnalysis, crossAnalysisLoading, crossAnalysisError]);

  return {
    result,
    isLoading,
    error,
    reEvaluateObjective,
    criteria: REVIEW_CRITERIA,
    cycleName: cycleInfo?.name || 'Ciclo',
  };
}
