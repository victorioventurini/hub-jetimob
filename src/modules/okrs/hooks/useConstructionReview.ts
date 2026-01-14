/**
 * useConstructionReview - Hook para avaliação AUTOMÁTICA de construção de OKRs por IA
 */

import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";
import { useState, useCallback, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCycle } from "./useCycleData";
import { 
  type ObjectiveReview, 
  type TeamConstructionReview,
  type AiAssessment,
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

// ============================================================
// HOOK PRINCIPAL
// ============================================================

export function useConstructionReview(
  teamId: string | null,
  cycleId: string | null
) {
  const buSupabase = useBuScopedSupabase();
  const { currentBuId } = useBu();

  // AI assessments state
  const [aiAssessments, setAiAssessments] = useState<Record<string, AiAssessment>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [aiErrors, setAiErrors] = useState<Record<string, string>>({});
  const [autoEvaluateTriggered, setAutoEvaluateTriggered] = useState<Set<string>>(new Set());

  // Fetch objectives with KRs
  const { data: rawObjectives, isLoading, error } = useQuery({
    queryKey: [...queryKeys.okrs.teamQuality(currentBuId, teamId, cycleId), 'construction-v2'],
    queryFn: async (): Promise<RawObjective[]> => {
      if (!teamId || !cycleId) return [];

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
            owner_user_id
          )
        `)
        .eq('team_id', teamId)
        .eq('cycle_id', cycleId)
        .is('cancelled_at', null)
        .is('deleted_at', null)
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
        key_results: (item.key_results || []) as unknown as RawKeyResult[],
      }));
    },
    enabled: !!buSupabase && !!currentBuId && !!teamId && !!cycleId,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch cycle info
  const { data: cycleInfo } = useCycle(cycleId);

  // Auto-evaluate objectives when data loads
  const evaluateObjective = useCallback(async (obj: RawObjective) => {
    if (aiLoading[obj.id] || aiAssessments[obj.id]) return;

    setAiLoading(prev => ({ ...prev, [obj.id]: true }));
    setAiErrors(prev => ({ ...prev, [obj.id]: '' }));

    try {
      const { data, error } = await supabase.functions.invoke('okr-construction-review', {
        body: { 
          objectiveId: obj.id,
          objectiveTitle: obj.title,
          objectiveDescription: obj.description,
          teamName: obj.team?.name,
          orgObjectiveTitle: obj.org_objective?.title,
          keyResults: obj.key_results,
        },
      });

      if (error) throw error;
      if (data?.assessment) {
        setAiAssessments(prev => ({ ...prev, [obj.id]: data.assessment }));
      }
    } catch (err) {
      console.error('AI assessment error:', err);
      setAiErrors(prev => ({ 
        ...prev, 
        [obj.id]: err instanceof Error ? err.message : 'Erro ao avaliar' 
      }));
    } finally {
      setAiLoading(prev => ({ ...prev, [obj.id]: false }));
    }
  }, [aiLoading, aiAssessments]);

  // Trigger auto-evaluation when objectives load
  useEffect(() => {
    if (!rawObjectives?.length) return;

    rawObjectives.forEach(obj => {
      if (!autoEvaluateTriggered.has(obj.id) && !aiAssessments[obj.id] && !aiLoading[obj.id]) {
        setAutoEvaluateTriggered(prev => new Set(prev).add(obj.id));
        // Stagger requests to avoid rate limiting
        const delay = Array.from(autoEvaluateTriggered).length * 1500;
        setTimeout(() => evaluateObjective(obj), delay);
      }
    });
  }, [rawObjectives, autoEvaluateTriggered, aiAssessments, aiLoading, evaluateObjective]);

  // Transform raw data into ObjectiveReview[]
  const objectives: ObjectiveReview[] = useMemo(() => {
    if (!rawObjectives) return [];

    return rawObjectives.map((obj) => {
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

  // Team-level aggregation
  const teamReview: TeamConstructionReview | null = useMemo(() => {
    if (!objectives.length || !teamId || !cycleId) return null;

    const firstObj = objectives[0];
    const objsWithScore = objectives.filter(o => o.aiAssessment);
    const avgScore = objsWithScore.length > 0
      ? Math.round(objsWithScore.reduce((sum, o) => sum + o.score, 0) / objsWithScore.length)
      : 0;

    // Combine alignment suggestions
    const alignmentSuggestions = objectives
      .map(o => o.aiAssessment?.alignmentSuggestion)
      .filter(Boolean);

    return {
      teamId,
      teamName: firstObj.teamName,
      cycleId,
      cycleName: cycleInfo?.name || 'Ciclo',
      objectives,
      avgScore,
      approvedCount: objectives.filter(o => o.status === 'approved').length,
      needsImprovementCount: objectives.filter(o => o.status === 'needs_improvement').length,
      pendingCount: objectives.filter(o => o.status === 'pending' || o.status === 'analyzing').length,
      globalAlignmentSuggestion: alignmentSuggestions.length > 0 ? alignmentSuggestions[0] : undefined,
    };
  }, [objectives, teamId, cycleId, cycleInfo]);

  // Manual re-evaluate
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

  return {
    teamReview,
    objectives,
    isLoading,
    error,
    reEvaluateObjective,
    criteria: REVIEW_CRITERIA,
  };
}
