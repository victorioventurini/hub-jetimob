/**
 * useConstructionReview - Hook para buscar e gerenciar avaliação de construção de OKRs
 */

import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";
import { useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCycle } from "./useCycleData";
import { 
  type ObjectiveReview, 
  type TeamConstructionReview,
  type AiAssessment,
  REVIEW_CRITERIA,
  calculateChecklistScore,
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

  // Local state for checklist (not persisted)
  const [checklistState, setChecklistState] = useState<Record<string, Record<string, boolean>>>({});
  // objectiveId -> { checkItemId -> boolean }

  // Local state for AI assessments
  const [aiAssessments, setAiAssessments] = useState<Record<string, AiAssessment>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [aiErrors, setAiErrors] = useState<Record<string, string>>({});

  // Fetch objectives with KRs
  const { data: rawObjectives, isLoading, error } = useQuery({
    queryKey: [...queryKeys.okrs.teamQuality(currentBuId, teamId, cycleId), 'construction'],
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
      
      // Type cast the result
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

  // Fetch cycle info using existing hook
  const { data: cycleInfo } = useCycle(cycleId);

  // Transform raw data into ObjectiveReview[]
  const objectives: ObjectiveReview[] = useMemo(() => {
    if (!rawObjectives) return [];

    return rawObjectives.map((obj) => {
      const checklist = checklistState[obj.id] || {};
      const checklistScore = calculateChecklistScore(checklist, REVIEW_CRITERIA);
      const aiAssessment = aiAssessments[obj.id];
      const aiScore = aiAssessment?.overallScore;
      const combinedScore = aiScore !== undefined 
        ? Math.round((checklistScore + aiScore) / 2) 
        : checklistScore;

      return {
        objectiveId: obj.id,
        objectiveTitle: obj.title,
        teamId: obj.team_id,
        teamName: obj.team?.name || 'Time',
        krCount: obj.key_results?.length || 0,
        checklist,
        aiAssessment,
        aiAssessmentLoading: aiLoading[obj.id] || false,
        aiAssessmentError: aiErrors[obj.id],
        checklistScore,
        aiScore,
        combinedScore,
        status: determineReviewStatus(checklistScore, aiScore),
      };
    });
  }, [rawObjectives, checklistState, aiAssessments, aiLoading, aiErrors]);

  // Team-level aggregation
  const teamReview: TeamConstructionReview | null = useMemo(() => {
    if (!objectives.length || !teamId || !cycleId) return null;

    const firstObj = objectives[0];
    const avgChecklistScore = Math.round(
      objectives.reduce((sum, o) => sum + o.checklistScore, 0) / objectives.length
    );
    const objsWithAi = objectives.filter(o => o.aiScore !== undefined);
    const avgAiScore = objsWithAi.length > 0
      ? Math.round(objsWithAi.reduce((sum, o) => sum + (o.aiScore || 0), 0) / objsWithAi.length)
      : undefined;
    const avgCombinedScore = Math.round(
      objectives.reduce((sum, o) => sum + o.combinedScore, 0) / objectives.length
    );

    return {
      teamId,
      teamName: firstObj.teamName,
      cycleId,
      cycleName: cycleInfo?.name || 'Ciclo',
      objectives,
      avgChecklistScore,
      avgAiScore,
      avgCombinedScore,
      approvedCount: objectives.filter(o => o.status === 'approved').length,
      needsImprovementCount: objectives.filter(o => o.status === 'needs_improvement').length,
      pendingCount: objectives.filter(o => o.status === 'pending' || o.status === 'in_review').length,
    };
  }, [objectives, teamId, cycleId, cycleInfo]);

  // Toggle checklist item
  const toggleCheckItem = useCallback((objectiveId: string, checkItemId: string) => {
    setChecklistState(prev => ({
      ...prev,
      [objectiveId]: {
        ...(prev[objectiveId] || {}),
        [checkItemId]: !(prev[objectiveId]?.[checkItemId] || false),
      },
    }));
  }, []);

  // Set all items for an objective
  const setAllCheckItems = useCallback((objectiveId: string, value: boolean) => {
    const allItemIds = REVIEW_CRITERIA.flatMap(c => c.checkItems.map(i => i.id));
    const newChecklist: Record<string, boolean> = {};
    allItemIds.forEach(id => { newChecklist[id] = value; });
    
    setChecklistState(prev => ({
      ...prev,
      [objectiveId]: newChecklist,
    }));
  }, []);

  // Request AI assessment for an objective
  const requestAiAssessment = useCallback(async (objectiveId: string) => {
    const obj = rawObjectives?.find(o => o.id === objectiveId);
    if (!obj) return;

    setAiLoading(prev => ({ ...prev, [objectiveId]: true }));
    setAiErrors(prev => ({ ...prev, [objectiveId]: '' }));

    try {
      const { data, error } = await supabase.functions.invoke('okr-construction-review', {
        body: { 
          objectiveId,
          objectiveTitle: obj.title,
          objectiveDescription: obj.description,
          teamName: obj.team?.name,
          orgObjectiveTitle: obj.org_objective?.title,
          keyResults: obj.key_results,
        },
      });

      if (error) throw error;

      const assessment: AiAssessment = data.assessment;
      setAiAssessments(prev => ({ ...prev, [objectiveId]: assessment }));
    } catch (err) {
      console.error('AI assessment error:', err);
      setAiErrors(prev => ({ 
        ...prev, 
        [objectiveId]: err instanceof Error ? err.message : 'Erro ao avaliar com IA' 
      }));
    } finally {
      setAiLoading(prev => ({ ...prev, [objectiveId]: false }));
    }
  }, [rawObjectives]);

  return {
    teamReview,
    objectives,
    isLoading,
    error,
    toggleCheckItem,
    setAllCheckItems,
    requestAiAssessment,
    criteria: REVIEW_CRITERIA,
  };
}
