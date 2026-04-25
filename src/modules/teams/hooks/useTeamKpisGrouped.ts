/**
 * useTeamKpisGrouped
 *
 * Hook agregador para a aba "Contribuição" do time.
 * Retorna KPIs em 2 grupos:
 *  - team:    KPIs sob responsabilidade do(s) time(s) (responsible_team_id IN teamIds
 *             OU team_id IN teamIds quando responsible_team_id é NULL — fallback legado)
 *  - members: KPIs sob responsabilidade pessoal de membros do time
 *             (owner_user_id IN memberIds, deduplicados contra o grupo "team")
 *
 * Reaproveita os tipos de @/modules/kpis (KpiWithValues + calculateRagStatus)
 * para que o componente de UI possa renderizar com KpiCard sem alterações.
 *
 * Respeita:
 *  - BU isolation (useOptionalBuClient)
 *  - Soft-delete (.is('deleted_at', null))
 *  - Sem select('*')
 *  - Query keys via teamsKeys.contributionKpis
 */
import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { useBu } from '@/contexts/BuContext';
import { teamsKeys } from '@/lib/queryKeys/teams';
import {
  type KpiWithValues,
  type KpiValue,
  type KpiValueSource,
  type KpiIndicatorType,
  type KpiLifecycleStatus,
  type KpiScope,
  calculateRagStatus,
} from '@/modules/kpis/types';

const KPI_FIELDS = `
  id, name, description, category, bu_id, owner_user_id, team_id,
  unit, direction, frequency, target_value, status, is_global,
  created_at, updated_at, deleted_at,
  indicator_type, lifecycle_status, target_source, recovery_protocol,
  area_id, scope, responsible_area_id, responsible_team_id,
  owner:profiles!kpi_metrics_owner_user_id_fkey(id, display_name, photo_url),
  team:teams!kpi_metrics_team_id_fkey(id, name),
  area:areas!kpi_metrics_area_id_fkey(id, name, color)
` as const;

const KPI_VALUE_FIELDS = `
  id, kpi_id, value, reference_date, source, notes, created_by, created_at,
  period_start, period_end, period_label, confidence, rag_status
` as const;

function mapSource(source: string): KpiValueSource {
  if (source === 'integration') return 'api';
  if (source === 'calculation') return 'database';
  return source as KpiValueSource;
}

function hydrateKpi(kpi: any, allValues: any[]): KpiWithValues {
  const values = allValues
    .filter((v) => v.kpi_id === kpi.id)
    .sort(
      (a, b) =>
        new Date(b.reference_date).getTime() -
        new Date(a.reference_date).getTime()
    );

  const currentValue = values[0]?.value ?? null;
  const previousValue = values[1]?.value ?? null;
  const lastValue = values[0];

  let variation: number | null = null;
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (currentValue !== null && previousValue !== null && previousValue !== 0) {
    variation = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
    if (variation > 0.5) trend = 'up';
    else if (variation < -0.5) trend = 'down';
  }

  const mappedValues: KpiValue[] = values.map((v) => ({
    ...v,
    source: mapSource(v.source),
    confidence: v.confidence || 'medium',
    rag_status: v.rag_status as KpiValue['rag_status'],
  }));

  return {
    id: kpi.id,
    name: kpi.name,
    description: kpi.description,
    category: kpi.category as any,
    bu_id: kpi.bu_id || '',
    owner_user_id: kpi.owner_user_id,
    team_id: kpi.team_id,
    unit: kpi.unit,
    direction: kpi.direction,
    frequency: kpi.frequency === 'quarterly' ? 'quarterly' : kpi.frequency,
    target_value: kpi.target_value,
    status: kpi.status,
    source_type: 'manual' as const,
    source_config: null,
    visibility: 'bu' as const,
    comparison_rule:
      kpi.direction === 'up'
        ? ('higher_is_better' as const)
        : ('lower_is_better' as const),
    linked_okrs: [],
    created_at: kpi.created_at,
    updated_at: kpi.updated_at,
    deleted_at: kpi.deleted_at,
    indicator_type: (kpi.indicator_type || 'kpi') as KpiIndicatorType,
    lifecycle_status: (kpi.lifecycle_status || 'active') as KpiLifecycleStatus,
    target_source: kpi.target_source,
    recovery_protocol: kpi.recovery_protocol,
    area_id: kpi.area_id,
    scope: (kpi.scope || 'team') as KpiScope,
    responsible_area_id: kpi.responsible_area_id ?? null,
    responsible_team_id: kpi.responsible_team_id ?? null,
    owner: kpi.owner,
    team: kpi.team,
    area: kpi.area,
    values: mappedValues,
    current_value: currentValue,
    previous_value: previousValue,
    variation,
    trend,
    rag_status: calculateRagStatus(currentValue, kpi.target_value, kpi.direction),
    last_updated_at: lastValue?.created_at ?? null,
    last_update_source: lastValue ? mapSource(lastValue.source) : null,
    last_updated_by: lastValue?.created_by ?? null,
    last_updated_by_user: null,
  };
}

export interface TeamKpisGrouped {
  team: KpiWithValues[];
  members: KpiWithValues[];
  memberCount: number;
}

interface Options {
  /** Quando true, expande para os mesmos teamIds resolvidos (sub-times incluídos). */
  resolvedTeamIds: string[];
  includeSubteams: boolean;
}

export function useTeamKpisGrouped(
  teamId: string | undefined,
  { resolvedTeamIds, includeSubteams }: Options
) {
  const { currentBu } = useBu();
  const { client: supabase, isReady } = useOptionalBuClient();

  return useQuery({
    queryKey: teamsKeys.contributionKpis(
      teamId ?? null,
      currentBu?.id ?? null,
      includeSubteams
    ),
    queryFn: async (): Promise<TeamKpisGrouped> => {
      if (!teamId || !currentBu?.id || !supabase || resolvedTeamIds.length === 0) {
        return { team: [], members: [], memberCount: 0 };
      }

      // 1) KPIs do time: responsible_team_id IN teamIds OR team_id IN teamIds (legado)
      const [byResponsibleRes, byLegacyTeamRes] = await Promise.all([
        supabase
          .from('kpi_metrics')
          .select(KPI_FIELDS)
          .eq('bu_id', currentBu.id)
          .eq('status', 'active')
          .is('deleted_at', null)
          .in('responsible_team_id', resolvedTeamIds),
        supabase
          .from('kpi_metrics')
          .select(KPI_FIELDS)
          .eq('bu_id', currentBu.id)
          .eq('status', 'active')
          .is('deleted_at', null)
          .is('responsible_team_id', null)
          .in('team_id', resolvedTeamIds),
      ]);

      if (byResponsibleRes.error) throw byResponsibleRes.error;
      if (byLegacyTeamRes.error) throw byLegacyTeamRes.error;

      const teamKpisMap = new Map<string, any>();
      for (const k of byResponsibleRes.data || []) teamKpisMap.set(k.id, k);
      for (const k of byLegacyTeamRes.data || []) {
        if (!teamKpisMap.has(k.id)) teamKpisMap.set(k.id, k);
      }
      const teamKpisRaw = Array.from(teamKpisMap.values());

      // 2) Resolver members do(s) time(s)
      const { data: membersData, error: membersErr } = await supabase
        .from('profiles')
        .select('id')
        .in('team_id', resolvedTeamIds)
        .is('deleted_at', null)
        .neq('employment_status', 'terminated');
      if (membersErr) throw membersErr;
      const memberIds = (membersData || []).map((m) => m.id);

      // 3) KPIs cujo owner é um membro do time, exceto os já listados em "team"
      let memberKpisRaw: any[] = [];
      if (memberIds.length > 0) {
        const { data: ownerKpisData, error: ownerErr } = await supabase
          .from('kpi_metrics')
          .select(KPI_FIELDS)
          .eq('bu_id', currentBu.id)
          .eq('status', 'active')
          .is('deleted_at', null)
          .in('owner_user_id', memberIds);
        if (ownerErr) throw ownerErr;
        memberKpisRaw = (ownerKpisData || []).filter((k) => !teamKpisMap.has(k.id));
      }

      // 4) Buscar valores em batch para todos os KPIs (team + members)
      const allKpiIds = [
        ...teamKpisRaw.map((k) => k.id),
        ...memberKpisRaw.map((k) => k.id),
      ];

      let allValues: any[] = [];
      if (allKpiIds.length > 0) {
        const { data: valsData, error: valsErr } = await supabase
          .from('kpi_values')
          .select(KPI_VALUE_FIELDS)
          .in('kpi_id', allKpiIds)
          .order('reference_date', { ascending: false });
        if (valsErr) throw valsErr;
        allValues = valsData || [];
      }

      const team = teamKpisRaw
        .map((k) => hydrateKpi(k, allValues))
        .sort((a, b) => a.name.localeCompare(b.name));
      const members = memberKpisRaw
        .map((k) => hydrateKpi(k, allValues))
        .sort((a, b) => a.name.localeCompare(b.name));

      return { team, members, memberCount: memberIds.length };
    },
    enabled:
      !!teamId &&
      !!currentBu?.id &&
      isReady &&
      !!supabase &&
      resolvedTeamIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });
}
