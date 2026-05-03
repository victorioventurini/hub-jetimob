/**
 * useKpisForWizardV2 - Role-based KPI classification for OKR wizards
 * 
 * v2.83.0: Evolves useKpisForWizard with:
 * - Clear separation: owner vs contributor vs viewer
 * - KPIs classified by purpose: toUpdate, teamContext, strategic
 * - Guardrails detection for KRs at risk
 * - Scope-aware filtering per wizard type
 * 
 * NEVER throws exceptions - returns empty state on error.
 */

import { useQuery } from "@tanstack/react-query";
import { useOptionalBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { kpisKeys } from "@/lib/queryKeys/okrs";
import type {
  KpiForWizardV2,
  UseKpisForWizardV2Options,
  UseKpisForWizardV2Result,
  KpiRagStatus,
  KpiFrequencyValue,
  KpiInputType,
  KpiLifecycleStatus,
  KpiDirection,
  KpiScope,
  KpiUserRole,
  KpiDisplayMode,
  KpiAlertReason,
} from "../types";
import { FREQUENCY_DAYS } from "../utils/frequency";

// ============================================================
// Hook
// ============================================================

/**
 * Hook fail-safe para exibir KPIs em wizards OKR com classificação por papel.
 * NUNCA lança exceção - retorna estado vazio em caso de erro.
 * 
 * @example
 * const { 
 *   kpisToUpdate, 
 *   kpisTeamContext, 
 *   kpisStrategic,
 *   kpisInAlert,
 *   guardrailsViolated 
 * } = useKpisForWizardV2({ 
 *   userId: effectiveUserId,
 *   teamId: userTeamId,
 *   scope: 'collaborator'
 * });
 */
export function useKpisForWizardV2(options: UseKpisForWizardV2Options): UseKpisForWizardV2Result {
  const supabase = useOptionalBuScopedSupabase();
  const { currentBuId } = useBu();
  const {
    userId,
    teamId,
    areaId,
    scope = 'collaborator',
    includeGuardrailsAtRisk = false,
    lifecycleStatuses = ['active'],
    responsibleTeamId,
  } = options;

  const { data, error, isLoading } = useQuery({
    queryKey: kpisKeys.forWizardV2({
      userId,
      teamId,
      areaId,
      scope,
      lifecycleStatuses,
      responsibleTeamId: responsibleTeamId ?? null,
    }),
    enabled: !!supabase && !!userId && !!currentBuId,
    staleTime: 5 * 60 * 1000, // 5 min cache
    queryFn: async () => {
      try {
        if (!supabase || !userId || !currentBuId) {
          return emptyResult();
        }

        // 1. Fetch KPIs where user is contributor
        const { data: contributions } = await supabase
          .from('kpi_data_contributors')
          .select('kpi_id')
          .eq('contributor_user_id', userId)
          .is('deleted_at', null);
        
        const contributedKpiIds = new Set((contributions ?? []).map(c => c.kpi_id));

        // 2. Fetch all relevant KPIs based on scope
        let kpiQuery = supabase
          .from('kpi_metrics')
          .select(`
            id, name, unit, target_value, direction, indicator_type,
            consolidation_frequency, update_frequency,
            lifecycle_status, recovery_protocol, team_id, owner_user_id,
            area_id, scope, responsible_team_id,
            owner:profiles!owner_user_id(id, display_name, photo_url),
            team:teams!team_id(id, name),
            area:areas!area_id(id, name, color)
          `)
          .in('lifecycle_status', lifecycleStatuses)
          .eq('bu_id', currentBuId)
          .is('deleted_at', null);

        // Apply filtering precedence:
        //   responsibleTeamId (explicit) > scope-based heuristics
        if (responsibleTeamId) {
          kpiQuery = kpiQuery.eq('responsible_team_id', responsibleTeamId);
        } else if (scope === 'collaborator' || scope === 'leader') {
          // Team-scoped: get team KPIs + org KPIs
          if (teamId) {
            kpiQuery = kpiQuery.or(`team_id.eq.${teamId},scope.eq.org`);
          }
        } else if (scope === 'manager') {
          // Area-scoped: get area KPIs + org KPIs
          if (areaId) {
            kpiQuery = kpiQuery.or(`area_id.eq.${areaId},scope.eq.org,scope.eq.area`);
          } else {
            kpiQuery = kpiQuery.or(`scope.eq.org,scope.eq.area`);
          }
        } else if (scope === 'clevel') {
          // Org-scoped only
          kpiQuery = kpiQuery.eq('scope', 'org');
        }

        const { data: kpis, error: kpiError } = await kpiQuery;
        
        if (kpiError || !kpis || kpis.length === 0) {
          return emptyResult();
        }

        // 3. Fetch latest value per KPI
        const kpiIds = kpis.map(k => k.id);
        
        const { data: latestValues } = await supabase
          .from('kpi_values')
          .select('kpi_id, value, reference_date, rag_status, period_label, input_type')
          .in('kpi_id', kpiIds)
          .order('reference_date', { ascending: false });
        
        // Map latest value per KPI
        const latestByKpi = new Map<string, (typeof latestValues)[number]>();
        for (const v of (latestValues || [])) {
          if (!latestByKpi.has(v.kpi_id)) {
            latestByKpi.set(v.kpi_id, v);
          }
        }

        // 4. Fetch guardrail links if needed
        let guardrailKpiIds = new Set<string>();
        let krAtRiskGuardrails = new Map<string, string[]>();
        
        if (includeGuardrailsAtRisk && teamId) {
          const { data: krMetrics } = await supabase
            .from('okr_kr_metrics')
            .select(`
              kpi_id,
              kr_id,
              role,
              kr:okr_team_key_results!kr_id(id, title, status)
            `)
            .eq('role', 'guardrail')
            .in('kpi_id', kpiIds);
          
          for (const link of (krMetrics ?? [])) {
            if (link.kpi_id) {
              guardrailKpiIds.add(link.kpi_id);
              const existing = krAtRiskGuardrails.get(link.kpi_id) || [];
              existing.push(link.kr_id);
              krAtRiskGuardrails.set(link.kpi_id, existing);
            }
          }
        }

        // 5. Enrich and classify KPIs
        const allEnriched: KpiForWizardV2[] = kpis.map(kpi => {
          const latest = latestByKpi.get(kpi.id);
          const consolidationFreq =
            (kpi.consolidation_frequency as KpiFrequencyValue | null | undefined) ?? null;
          const updateFreq =
            (kpi.update_frequency as KpiFrequencyValue | null | undefined) ?? null;
          const needsUpdate = checkNeedsUpdate(updateFreq, latest?.reference_date);
          const ragStatus = (latest?.rag_status as KpiRagStatus) ?? 'no_data';

          // Pré-calculo de desvio percentual (latest vs target).
          // Direção é considerada: down (menor é melhor) inverte o sinal.
          let deviationPct: number | null = null;
          if (
            latest?.value != null &&
            kpi.target_value != null &&
            kpi.target_value !== 0
          ) {
            const raw = ((latest.value - kpi.target_value) / Math.abs(kpi.target_value)) * 100;
            deviationPct = (kpi.direction as KpiDirection) === 'down' ? -raw : raw;
          }

          // Determine user role
          let userRole: KpiUserRole = 'viewer';
          if (kpi.owner_user_id === userId) {
            userRole = 'owner';
          } else if (contributedKpiIds.has(kpi.id)) {
            userRole = 'contributor';
          }

          // Determine display mode
          let displayMode: KpiDisplayMode = 'readonly';
          if ((userRole === 'owner' || userRole === 'contributor') && needsUpdate) {
            displayMode = 'editable';
          } else if (ragStatus === 'off_track' || ragStatus === 'at_risk') {
            displayMode = 'alert';
          }

          // Determine alert reason
          let alertReason: KpiAlertReason | null = null;
          if (ragStatus === 'off_track') alertReason = 'off_track';
          else if (ragStatus === 'at_risk') alertReason = 'at_risk';
          else if (needsUpdate) alertReason = 'outdated';

          // Check if guardrail is violated
          const isGuardrailAtRisk = guardrailKpiIds.has(kpi.id) &&
            (ragStatus === 'off_track' || ragStatus === 'at_risk');
          if (isGuardrailAtRisk) alertReason = 'guardrail_violated';

          return {
            id: kpi.id,
            name: kpi.name,
            unit: kpi.unit,
            target_value: kpi.target_value,
            direction: kpi.direction as KpiDirection,
            indicator_type: ((kpi as { indicator_type?: string | null }).indicator_type ?? 'kpi') as KpiForWizardV2['indicator_type'],
            consolidation_frequency: consolidationFreq,
            update_frequency: updateFreq,
            lifecycle_status: kpi.lifecycle_status as KpiLifecycleStatus,
            recovery_protocol: kpi.recovery_protocol,
            team_id: kpi.team_id,
            area_id: kpi.area_id,
            owner_user_id: kpi.owner_user_id,
            scope: kpi.scope as KpiScope,
            latest_value: latest?.value ?? null,
            latest_reference_date: latest?.reference_date ?? null,
            latest_rag_status: ragStatus,
            latest_period_label: latest?.period_label ?? null,
            latest_input_type: (latest?.input_type as KpiInputType | undefined) ?? null,
            needs_update: needsUpdate,
            deviation_pct: deviationPct,
            // Role-based fields
            userRole,
            isStrategic: kpi.scope === 'org',
            isGuardrailAtRisk,
            linkedKrIds: krAtRiskGuardrails.get(kpi.id) ?? [],
            displayMode,
            alertReason,
            // Relations
            owner: kpi.owner as KpiForWizardV2['owner'],
            team: kpi.team as KpiForWizardV2['team'],
            area: kpi.area as KpiForWizardV2['area'],
          };
        });

        // 6. Classify into categories
        const kpisOwnedOrContributed = allEnriched.filter(k =>
          k.userRole === 'owner' || k.userRole === 'contributor'
        );

        const kpisToUpdate = kpisOwnedOrContributed.filter(k => k.needs_update);
        
        const kpisTeamContext = allEnriched.filter(k => 
          k.team_id === teamId && 
          !kpisToUpdate.some(u => u.id === k.id) &&
          !k.isStrategic
        );
        
        const kpisStrategic = allEnriched.filter(k => k.isStrategic);
        
        const kpisInAlert = allEnriched.filter(k => 
          k.alertReason && k.alertReason !== 'outdated'
        );
        
        const guardrailsViolated = allEnriched.filter(k => k.isGuardrailAtRisk);

        return {
          kpisToUpdate,
          kpisOwnedOrContributed,
          kpisTeamContext,
          kpisStrategic,
          kpisInAlert,
          guardrailsViolated,
          hasUpdatesNeeded: kpisToUpdate.length > 0,
          hasAlertsToShow: kpisInAlert.length > 0,
          hasGuardrailsViolated: guardrailsViolated.length > 0,
        };
      } catch (e) {
        console.warn('[KPI Module V2] Unavailable for wizard:', e);
        return emptyResult();
      }
    },
  });

  return {
    kpisToUpdate: data?.kpisToUpdate ?? [],
    kpisOwnedOrContributed: data?.kpisOwnedOrContributed ?? [],
    kpisTeamContext: data?.kpisTeamContext ?? [],
    kpisStrategic: data?.kpisStrategic ?? [],
    kpisInAlert: data?.kpisInAlert ?? [],
    guardrailsViolated: data?.guardrailsViolated ?? [],
    hasUpdatesNeeded: data?.hasUpdatesNeeded ?? false,
    hasAlertsToShow: data?.hasAlertsToShow ?? false,
    hasGuardrailsViolated: data?.hasGuardrailsViolated ?? false,
    isLoading,
    hasError: !!error,
  };
}

// ============================================================
// Helpers
// ============================================================

function emptyResult() {
  return {
    kpisToUpdate: [],
    kpisOwnedOrContributed: [],
    kpisTeamContext: [],
    kpisStrategic: [],
    kpisInAlert: [],
    guardrailsViolated: [],
    hasUpdatesNeeded: false,
    hasAlertsToShow: false,
    hasGuardrailsViolated: false,
  };
}

/**
 * Check if KPI needs update based on update_frequency.
 *
 * v3.0.0: usa `update_frequency` (cadência de atualização) em vez de
 * `frequency` legado. KPIs sem `update_frequency` (ex-`manual` não revisados)
 * ficam fora do bucket `kpisToUpdate` retornando `false`.
 */
function checkNeedsUpdate(
  updateFrequency: KpiFrequencyValue | null,
  lastDate: string | null | undefined,
): boolean {
  // Sem update_frequency definida → KPI não entra no fluxo de cobrança.
  if (!updateFrequency) return false;
  // Sem valor lançado → precisa update.
  if (!lastDate) return true;

  const last = new Date(lastDate);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays >= FREQUENCY_DAYS[updateFrequency];
}
