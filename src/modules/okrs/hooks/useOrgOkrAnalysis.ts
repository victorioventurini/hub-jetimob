/**
 * useOrgOkrAnalysis - Hook para análise de OKRs organizacionais
 * 
 * Agrega dados de:
 * - OKRs organizacionais (useAllOrgObjectivesView)
 * - Times da BU (useTeams)
 * - Qualidade por time (useTeamOkrQuality pattern)
 * 
 * Calcula 4 critérios de avaliação (0-10):
 * 1. Coesão: Alinhamento entre OKRs org e times
 * 2. Distribuição: Equilíbrio de responsabilidades
 * 3. Cobertura: Áreas estratégicas cobertas
 * 4. Rastreabilidade: Transparência e updates
 */

import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";
import { useAllOrgObjectivesView, type OrgObjectiveWithKrs } from "./queries";
import { useTeams } from "@/modules/teams/hooks";
import type { TeamWithRelations } from "@/modules/teams/types";
import type { HealthStatus } from "../types/health";

// ============================================================
// TYPES
// ============================================================

export interface AnalysisScore {
  value: number; // 0-10
  label: string;
  description: string;
  status: 'excellent' | 'good' | 'warning' | 'critical';
}

export interface TeamSummary {
  id: string;
  name: string;
  leaderId: string | null;
  leaderName: string | null;
  leaderPhoto: string | null;
  objectiveCount: number;
  krCount: number;
  healthScore: number;
  healthStatus: HealthStatus;
  hasOkrs: boolean;
}

export interface AnalysisGaps {
  teamsWithoutOkrs: TeamSummary[];
  orgKrsWithoutTeamLinks: Array<{ id: string; title: string; objectiveTitle: string }>;
  teamsWithLowHealth: TeamSummary[];
  strategicAreasUncovered: string[];
}

export interface OrgOkrAnalysisData {
  // Scores calculados (0-10)
  scores: {
    cohesion: AnalysisScore;
    distribution: AnalysisScore;
    coverage: AnalysisScore;
    traceability: AnalysisScore;
    overall: AnalysisScore;
  };
  
  // Dados agregados
  orgObjectives: OrgObjectiveWithKrs[];
  teamSummaries: TeamSummary[];
  gaps: AnalysisGaps;
  
  // Métricas gerais
  totals: {
    orgObjectives: number;
    orgKrs: number;
    totalTeams: number;
    teamsWithOkrs: number;
    linkedKrs: number;
    unlinkedKrs: number;
  };
  
  // Estados
  isLoading: boolean;
  error: Error | null;
}

// ============================================================
// CONSTANTS
// ============================================================

const STRATEGIC_AREAS = [
  'Produto',
  'Crescimento',
  'Operações',
  'Cultura',
  'Tecnologia',
  'Financeiro',
  'Comercial',
  'Marketing',
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getScoreStatus(value: number): 'excellent' | 'good' | 'warning' | 'critical' {
  if (value >= 8) return 'excellent';
  if (value >= 6) return 'good';
  if (value >= 4) return 'warning';
  return 'critical';
}

function calculateCohesionScore(
  orgObjectives: OrgObjectiveWithKrs[],
  linkedKrsCount: number,
  totalOrgKrsCount: number
): AnalysisScore {
  // Cohesion = % of org KRs that have team KRs linked
  const linkageRatio = totalOrgKrsCount > 0 ? linkedKrsCount / totalOrgKrsCount : 0;
  const value = Math.round(linkageRatio * 10 * 10) / 10;
  
  return {
    value: Math.min(10, value),
    label: 'Coesão',
    description: `${Math.round(linkageRatio * 100)}% dos KRs org têm contribuições de times`,
    status: getScoreStatus(value),
  };
}

function calculateDistributionScore(
  teamsWithOkrs: number,
  totalTeams: number
): AnalysisScore {
  // Distribution = % of teams that have OKRs defined
  const ratio = totalTeams > 0 ? teamsWithOkrs / totalTeams : 0;
  const value = Math.round(ratio * 10 * 10) / 10;
  
  return {
    value: Math.min(10, value),
    label: 'Distribuição',
    description: `${teamsWithOkrs} de ${totalTeams} times têm OKRs definidas`,
    status: getScoreStatus(value),
  };
}

function calculateCoverageScore(
  orgObjectives: OrgObjectiveWithKrs[],
  coveredAreas: string[]
): AnalysisScore {
  // Coverage = areas covered / total strategic areas
  const coverage = STRATEGIC_AREAS.length > 0 
    ? coveredAreas.length / STRATEGIC_AREAS.length 
    : 0;
  const value = Math.round(coverage * 10 * 10) / 10;
  
  return {
    value: Math.min(10, value),
    label: 'Cobertura',
    description: `${coveredAreas.length} de ${STRATEGIC_AREAS.length} áreas estratégicas cobertas`,
    status: getScoreStatus(value),
  };
}

function calculateTraceabilityScore(
  krsWithRecentCheckin: number,
  totalKrs: number
): AnalysisScore {
  // Traceability = % of KRs with check-ins in last 14 days
  const ratio = totalKrs > 0 ? krsWithRecentCheckin / totalKrs : 0;
  const value = Math.round(ratio * 10 * 10) / 10;
  
  return {
    value: Math.min(10, value),
    label: 'Rastreabilidade',
    description: `${Math.round(ratio * 100)}% dos KRs com check-ins recentes`,
    status: getScoreStatus(value),
  };
}

// Detect strategic area from objective title (simple keyword matching)
function detectStrategicArea(title: string): string | null {
  const lowerTitle = title.toLowerCase();
  
  const areaKeywords: Record<string, string[]> = {
    'Produto': ['produto', 'feature', 'funcionalidade', 'plataforma', 'app'],
    'Crescimento': ['crescimento', 'growth', 'expansão', 'escala', 'mercado'],
    'Operações': ['operações', 'processo', 'eficiência', 'automação'],
    'Cultura': ['cultura', 'engajamento', 'clima', 'pessoas', 'time'],
    'Tecnologia': ['tecnologia', 'infraestrutura', 'segurança', 'devops'],
    'Financeiro': ['receita', 'custo', 'margem', 'financeiro', 'roi'],
    'Comercial': ['venda', 'comercial', 'cliente', 'conversão', 'negócio'],
    'Marketing': ['marketing', 'marca', 'branding', 'campanha', 'awareness'],
  };
  
  for (const [area, keywords] of Object.entries(areaKeywords)) {
    if (keywords.some(kw => lowerTitle.includes(kw))) {
      return area;
    }
  }
  
  return null;
}

// ============================================================
// HOOK
// ============================================================

export function useOrgOkrAnalysis(
  year?: number,
  cycleId?: string | null
): OrgOkrAnalysisData {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const currentYear = year || new Date().getFullYear();

  // Fetch org objectives
  const { 
    data: orgObjectives, 
    isLoading: isLoadingOrg,
    error: orgError,
  } = useAllOrgObjectivesView(currentYear);

  // Fetch all teams
  const { 
    data: teams, 
    isLoading: isLoadingTeams,
    error: teamsError,
  } = useTeams();

  // Fetch team objectives summary for all teams
  const {
    data: teamOkrsSummary,
    isLoading: isLoadingTeamOkrs,
    error: teamOkrsError,
  } = useQuery({
    queryKey: queryKeys.okrs.orgAnalysis(currentBuId, currentYear, cycleId || null),
    queryFn: async () => {
      if (!supabase) return { teamObjectives: [], teamKrStats: new Map() };

      // Build query for team objectives
      let query = supabase
        .from('okr_team_objectives')
        .select(`
          id,
          title,
          team_id,
          cycle_id,
          key_results:okr_team_key_results (
            id,
            status,
            last_checkin_at,
            linked_org_kr_id
          )
        `)
        .is('cancelled_at', null)
        .is('deleted_at', null);

      // Filter by cycle if provided
      if (cycleId) {
        query = query.eq('cycle_id', cycleId);
      }

      const { data: teamObjectives, error } = await query;
      if (error) throw error;

      // Build team KR stats map
      const teamKrStats = new Map<string, {
        objectiveCount: number;
        krCount: number;
        krsWithRecentCheckin: number;
        krsAtRisk: number;
        healthScore: number;
      }>();

      const now = new Date();

      for (const obj of teamObjectives || []) {
        const existing = teamKrStats.get(obj.team_id) || {
          objectiveCount: 0,
          krCount: 0,
          krsWithRecentCheckin: 0,
          krsAtRisk: 0,
          healthScore: 100,
        };

        existing.objectiveCount++;
        
        const krs = obj.key_results || [];
        existing.krCount += krs.length;

        for (const kr of krs) {
          // Check if KR has recent checkin (last 14 days)
          if (kr.last_checkin_at) {
            const lastCheckin = new Date(kr.last_checkin_at);
            const daysSince = Math.floor((now.getTime() - lastCheckin.getTime()) / (24 * 60 * 60 * 1000));
            if (daysSince <= 14) {
              existing.krsWithRecentCheckin++;
            }
          }

          // Check if KR is at risk
          if (kr.status === 'red' || kr.status === 'yellow') {
            existing.krsAtRisk++;
          }
        }

        // Calculate health score
        if (krs.length > 0) {
          const updateRatio = existing.krsWithRecentCheckin / existing.krCount;
          const riskRatio = existing.krsAtRisk / existing.krCount;
          existing.healthScore = Math.round((updateRatio * 50) + ((1 - riskRatio) * 50));
        }

        teamKrStats.set(obj.team_id, existing);
      }

      return { teamObjectives: teamObjectives || [], teamKrStats };
    },
    enabled: !!supabase && !!currentBuId,
    staleTime: 2 * 60 * 1000,
  });

  // Calculate derived data
  const teamSummaries: TeamSummary[] = (teams || []).map((team: TeamWithRelations) => {
    const stats = teamOkrsSummary?.teamKrStats.get(team.id);
    const healthScore = stats?.healthScore || 0;
    
    let healthStatus: HealthStatus = 'healthy';
    if (!stats || stats.objectiveCount === 0) {
      healthStatus = 'risk';
    } else if (healthScore < 50) {
      healthStatus = 'risk';
    } else if (healthScore < 75) {
      healthStatus = 'attention';
    }

    return {
      id: team.id,
      name: team.name,
      leaderId: team.leader?.id || null,
      leaderName: team.leader?.display_name || null,
      leaderPhoto: team.leader?.photo_url || null,
      objectiveCount: stats?.objectiveCount || 0,
      krCount: stats?.krCount || 0,
      healthScore,
      healthStatus,
      hasOkrs: (stats?.objectiveCount || 0) > 0,
    };
  });

  // Calculate totals
  const totalOrgKrs = (orgObjectives || []).reduce(
    (sum, obj) => sum + obj.orgKrs.length, 
    0
  );

  const linkedKrsCount = (orgObjectives || []).reduce(
    (sum, obj) => sum + obj.orgKrs.reduce(
      (kSum, kr) => kSum + kr.linkedTeamKrs.length,
      0
    ),
    0
  );

  const teamsWithOkrs = teamSummaries.filter(t => t.hasOkrs).length;

  // Detect covered strategic areas
  const coveredAreas = new Set<string>();
  for (const obj of orgObjectives || []) {
    const area = detectStrategicArea(obj.title);
    if (area) coveredAreas.add(area);
  }

  // Calculate KRs with recent checkins (from team objectives data)
  let totalTeamKrs = 0;
  let krsWithRecentCheckin = 0;
  teamOkrsSummary?.teamKrStats.forEach((stats) => {
    totalTeamKrs += stats.krCount;
    krsWithRecentCheckin += stats.krsWithRecentCheckin;
  });

  // Calculate scores
  const cohesionScore = calculateCohesionScore(orgObjectives || [], linkedKrsCount, totalOrgKrs);
  const distributionScore = calculateDistributionScore(teamsWithOkrs, teams?.length || 0);
  const coverageScore = calculateCoverageScore(orgObjectives || [], Array.from(coveredAreas));
  const traceabilityScore = calculateTraceabilityScore(krsWithRecentCheckin, totalTeamKrs);

  // Overall score (average of 4 criteria)
  const overallValue = Math.round(
    ((cohesionScore.value + distributionScore.value + coverageScore.value + traceabilityScore.value) / 4) * 10
  ) / 10;

  const overallScore: AnalysisScore = {
    value: overallValue,
    label: 'Score Geral',
    description: 'Média dos 4 critérios de avaliação',
    status: getScoreStatus(overallValue),
  };

  // Identify gaps
  const gaps: AnalysisGaps = {
    teamsWithoutOkrs: teamSummaries.filter(t => !t.hasOkrs),
    orgKrsWithoutTeamLinks: (orgObjectives || []).flatMap(obj =>
      obj.orgKrs
        .filter(kr => kr.linkedTeamKrs.length === 0)
        .map(kr => ({
          id: kr.id,
          title: kr.title,
          objectiveTitle: obj.title,
        }))
    ),
    teamsWithLowHealth: teamSummaries.filter(t => t.hasOkrs && t.healthScore < 50),
    strategicAreasUncovered: STRATEGIC_AREAS.filter(area => !coveredAreas.has(area)),
  };

  return {
    scores: {
      cohesion: cohesionScore,
      distribution: distributionScore,
      coverage: coverageScore,
      traceability: traceabilityScore,
      overall: overallScore,
    },
    orgObjectives: orgObjectives || [],
    teamSummaries,
    gaps,
    totals: {
      orgObjectives: orgObjectives?.length || 0,
      orgKrs: totalOrgKrs,
      totalTeams: teams?.length || 0,
      teamsWithOkrs,
      linkedKrs: linkedKrsCount,
      unlinkedKrs: totalOrgKrs - linkedKrsCount,
    },
    isLoading: isLoadingOrg || isLoadingTeams || isLoadingTeamOkrs,
    error: (orgError || teamsError || teamOkrsError) as Error | null,
  };
}
