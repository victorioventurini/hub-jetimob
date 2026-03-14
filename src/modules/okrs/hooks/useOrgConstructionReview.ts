/**
 * Hook para avaliação de construção de OKRs Organizacionais
 * 
 * Similar ao useConstructionReview, mas para OKRs de nível organizacional.
 * Usa o agente validador-metodologico-okrs via edge function.
 * 
 * @see TCR v2.75.0 - Módulo OKRs
 */

import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { useBu } from '@/contexts/BuContext';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { okrsKeys } from '@/lib/queryKeys/okrs';
import type { 
  ObjectiveReview, 
  AiAssessment, 
  ReviewStatus,
} from '../types/construction-review';

// Re-export types for convenience
export type { ObjectiveReview, AiAssessment };

interface OrgObjectiveData {
  id: string;
  title: string;
  description: string | null;
  year: number;
  status: string;
  key_results: {
    id: string;
    title: string;
    baseline: number | null;
    target: number | null;
    unit: string | null;
    owner_user_id: string | null;
  }[];
}

interface UseOrgConstructionReviewReturn {
  objectives: ObjectiveReview[];
  avgScore: number;
  approvedCount: number;
  needsImprovementCount: number;
  pendingCount: number;
  totalObjectives: number;
  isLoading: boolean;
  error: Error | null;
  reEvaluateObjective: (objectiveId: string) => Promise<void>;
}

const STAGGER_DELAY_MS = 800; // Delay entre avaliações para evitar rate limiting

export function useOrgConstructionReview(year: number | null): UseOrgConstructionReviewReturn {
  const { currentBuId } = useBu();
  const supabase = useBuScopedSupabase();
  
  // State for AI assessments (separate from query data)
  const [aiAssessments, setAiAssessments] = useState<Record<string, AiAssessment>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [aiErrors, setAiErrors] = useState<Record<string, string>>({});

  // Fetch org objectives with KRs
  const { data: orgObjectivesData, isLoading, error } = useQuery({
    queryKey: okrsKeys.orgConstructionReview(currentBuId, year),
    queryFn: async () => {
      if (!currentBuId || !year) return [];
      
      const { data, error } = await supabase
        .from('okr_org_objectives')
        .select(`
          id,
          title,
          description,
          year,
          status,
          key_results:okr_org_key_results(
            id,
            title,
            baseline,
            target,
            unit,
            owner_user_id
          )
        `)
        .eq('bu_id', currentBuId)
        .eq('year', year)
        .is('deleted_at', null)
        .is('cancelled_at', null)
        .neq('status', 'cancelled')
        .neq('status', 'discarded')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as OrgObjectiveData[];
    },
    enabled: !!currentBuId && !!year,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Transform data to ObjectiveReview format
  const objectives: ObjectiveReview[] = (orgObjectivesData || []).map((obj) => {
    const assessment = aiAssessments[obj.id];
    const score = assessment?.overallScore ?? 0;
    const status: ReviewStatus = aiLoading[obj.id] 
      ? 'analyzing' 
      : aiErrors[obj.id]
        ? 'pending'
        : assessment 
          ? (score >= 80 ? 'approved' : 'needs_improvement')
          : 'pending';

    return {
      objectiveId: obj.id,
      objectiveTitle: obj.title,
      objectiveDescription: obj.description || undefined,
      teamId: '', // Not applicable for org level
      teamName: 'Organizacional',
      orgObjectiveTitle: undefined, // This IS the org objective
      krCount: obj.key_results.length,
      keyResults: obj.key_results.map((kr) => ({
        id: kr.id,
        title: kr.title,
        type: null, // okr_org_key_results doesn't have kr_type column
        baseline: kr.baseline,
        target: kr.target,
        unit: kr.unit,
        hasOwner: !!kr.owner_user_id,
      })),
      aiAssessment: assessment,
      aiAssessmentLoading: aiLoading[obj.id] || false,
      aiAssessmentError: aiErrors[obj.id],
      score,
      status,
    };
  });

  // Calculate aggregated metrics
  const totalObjectives = objectives.length;
  const approvedCount = objectives.filter((o) => o.status === 'approved').length;
  const needsImprovementCount = objectives.filter((o) => o.status === 'needs_improvement').length;
  const pendingCount = objectives.filter((o) => o.status === 'pending' || o.status === 'analyzing').length;
  
  const scoredObjectives = objectives.filter((o) => o.aiAssessment);
  const avgScore = scoredObjectives.length > 0
    ? Math.round(scoredObjectives.reduce((sum, o) => sum + o.score, 0) / scoredObjectives.length)
    : 0;

  // Evaluate single objective via edge function
  const evaluateObjective = useCallback(async (objective: OrgObjectiveData) => {
    if (!currentBuId) return;

    const objectiveId = objective.id;
    setAiLoading((prev) => ({ ...prev, [objectiveId]: true }));
    setAiErrors((prev) => {
      const next = { ...prev };
      delete next[objectiveId];
      return next;
    });

    try {
      const response = await supabase.functions.invoke('okr-construction-review', {
        body: {
          buId: currentBuId,
          mode: 'org-objective',
          isOrgLevel: true,
          objectiveId: objective.id,
          objectiveTitle: objective.title,
          objectiveDescription: objective.description,
          year: objective.year,
          keyResults: objective.key_results.map((kr) => ({
            id: kr.id,
            title: kr.title,
            type: null, // okr_org_key_results doesn't have kr_type column
            baseline: kr.baseline,
            target: kr.target,
            unit: kr.unit,
            owner_user_id: kr.owner_user_id,
          })),
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao avaliar objetivo');
      }

      const responseData = response.data?.data ?? response.data;
      const assessment = responseData?.assessment;
      if (assessment) {
        setAiAssessments((prev) => ({ ...prev, [objectiveId]: assessment }));
      }
    } catch (err) {
      console.error('[useOrgConstructionReview] Error evaluating objective:', err);
      setAiErrors((prev) => ({
        ...prev,
        [objectiveId]: err instanceof Error ? err.message : 'Erro desconhecido',
      }));
    } finally {
      setAiLoading((prev) => ({ ...prev, [objectiveId]: false }));
    }
  }, [currentBuId, supabase.functions]);

  // Re-evaluate single objective (exposed to UI)
  const reEvaluateObjective = useCallback(async (objectiveId: string) => {
    const objective = orgObjectivesData?.find((o) => o.id === objectiveId);
    if (!objective) return;
    await evaluateObjective(objective);
  }, [orgObjectivesData, evaluateObjective]);

  // Auto-evaluate all objectives on data load (staggered to avoid rate limiting)
  useEffect(() => {
    if (!orgObjectivesData?.length) return;

    const objectivesToEvaluate = orgObjectivesData.filter(
      (obj) => !aiAssessments[obj.id] && !aiLoading[obj.id] && !aiErrors[obj.id]
    );

    if (objectivesToEvaluate.length === 0) return;

    // Stagger evaluations
    objectivesToEvaluate.forEach((obj, index) => {
      setTimeout(() => {
        evaluateObjective(obj);
      }, index * STAGGER_DELAY_MS);
    });
  }, [orgObjectivesData, aiAssessments, aiLoading, aiErrors, evaluateObjective]);

  return {
    objectives,
    avgScore,
    approvedCount,
    needsImprovementCount,
    pendingCount,
    totalObjectives,
    isLoading,
    error: error as Error | null,
    reEvaluateObjective,
  };
}
