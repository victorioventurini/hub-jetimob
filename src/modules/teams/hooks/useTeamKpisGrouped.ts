/**
 * useTeamKpisGrouped
 *
 * Hook agregador para a aba "Contribuição" do time.
 * Retorna KPIs agrupados por escopo canônico (KpiScope) com cascata sem duplicação:
 *
 *   1) org    — KPIs scope='org' que tocam o time (responsible_team_id, team_id legado,
 *               responsible_area_id da área do time, ou owner em member)
 *   2) area   — KPIs scope='area' (mesmos critérios), sub-agrupados por área
 *   3) team   — KPIs scope='team' (responsible_team_id IN teamIds OU team_id legado)
 *   4) owners — Restantes cujo owner é membro do time, sub-agrupados por owner
 *
 * Reaproveita os tipos de @/modules/kpis (KpiWithValues + calculateRagStatus)
 * para que o componente de UI possa renderizar com KpiCard sem alterações.
 *
 * Respeita: BU isolation, soft-delete, sem select('*'), query keys via teamsKeys.
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

export interface AreaKpiGroup {
  areaId: string | null;
  areaName: string;
  areaColor: string | null;
  kpis: KpiWithValues[];
}

export interface OwnerKpiGroup {
  ownerId: string;
  ownerName: string;
  photoUrl: string | null;
  kpis: KpiWithValues[];
}

export interface TeamKpisGroupedByScope {
  org: KpiWithValues[];
  area: AreaKpiGroup[];
  team: KpiWithValues[];
  owners: OwnerKpiGroup[];
  memberCount: number;
  totalCount: number;
}

interface Options {
  /** TeamIds expandidos (sub-times incluídos quando aplicável). */
  resolvedTeamIds: string[];
  includeSubteams: boolean;
}

const EMPTY: TeamKpisGroupedByScope = {
  org: [],
  area: [],
  team: [],
  owners: [],
  memberCount: 0,
  totalCount: 0,
};

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
    queryFn: async (): Promise<TeamKpisGroupedByScope> => {
      if (!teamId || !currentBu?.id || !supabase || resolvedTeamIds.length === 0) {
        return EMPTY;
      }

      // 1) Resolver members + areas dos times em paralelo
      const [membersRes, teamsAreasRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id')
          .in('team_id', resolvedTeamIds)
          .is('deleted_at', null)
          .neq('employment_status', 'terminated'),
        supabase
          .from('teams')
          .select('id, area_id')
          .in('id', resolvedTeamIds)
          .is('deleted_at', null),
      ]);
      if (membersRes.error) throw membersRes.error;
      if (teamsAreasRes.error) throw teamsAreasRes.error;

      const memberIds = (membersRes.data || []).map((m: any) => m.id);
      const teamAreaIds = Array.from(
        new Set(
          (teamsAreasRes.data || [])
            .map((t: any) => t.area_id)
            .filter((id: string | null): id is string => !!id)
        )
      );

      // 2) Buscar KPIs em 4 fronteiras paralelas (deduplicados por id depois)
      // Cada query filtra por scope + UM critério de vínculo, depois fazemos union.
      // Critério "owner é membro" aplica-se a todos os scopes para o bloco "Responsável".
      const buildFilters = (scope: KpiScope | null) => {
        const base = supabase
          .from('kpi_metrics')
          .select(KPI_FIELDS)
          .eq('bu_id', currentBu.id)
          .eq('status', 'active')
          .is('deleted_at', null);
        return scope ? base.eq('scope', scope) : base;
      };

      const queries: Promise<any>[] = [];

      // Para scope=org e scope=area: 4 critérios de vínculo
      const linkBy = (q: any) => [
        q.in('responsible_team_id', resolvedTeamIds),
        q.is('responsible_team_id', null).in('team_id', resolvedTeamIds),
        ...(teamAreaIds.length > 0
          ? [q.in('responsible_area_id', teamAreaIds)]
          : []),
        ...(memberIds.length > 0 ? [q.in('owner_user_id', memberIds)] : []),
      ];

      // org
      queries.push(...linkBy(buildFilters('org')));
      // area
      queries.push(...linkBy(buildFilters('area')));
      // team — apenas critérios de time
      queries.push(
        buildFilters('team').in('responsible_team_id', resolvedTeamIds),
        buildFilters('team')
          .is('responsible_team_id', null)
          .in('team_id', resolvedTeamIds)
      );
      // owners — qualquer scope, owner em members
      if (memberIds.length > 0) {
        queries.push(buildFilters(null).in('owner_user_id', memberIds));
      }

      const results = await Promise.all(queries);
      for (const r of results) {
        if (r.error) throw r.error;
      }

      // Dedup global por id
      const allKpisMap = new Map<string, any>();
      for (const r of results) {
        for (const k of r.data || []) {
          if (!allKpisMap.has(k.id)) allKpisMap.set(k.id, k);
        }
      }
      const allKpisRaw = Array.from(allKpisMap.values());

      // 3) Buscar valores em batch
      const allKpiIds = allKpisRaw.map((k) => k.id);
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

      // 4) Hidratar e classificar em cascata
      const hydrated = allKpisRaw.map((k) => ({ raw: k, kpi: hydrateKpi(k, allValues) }));

      const teamIdSet = new Set(resolvedTeamIds);
      const areaIdSet = new Set(teamAreaIds);
      const memberIdSet = new Set(memberIds);

      const isLinkedToTeam = (raw: any) =>
        teamIdSet.has(raw.responsible_team_id) ||
        (!raw.responsible_team_id && teamIdSet.has(raw.team_id)) ||
        areaIdSet.has(raw.responsible_area_id) ||
        memberIdSet.has(raw.owner_user_id);

      const isTeamScopeMatch = (raw: any) =>
        teamIdSet.has(raw.responsible_team_id) ||
        (!raw.responsible_team_id && teamIdSet.has(raw.team_id));

      const orgKpis: KpiWithValues[] = [];
      const areaBuckets = new Map<string, AreaKpiGroup>();
      const teamKpis: KpiWithValues[] = [];
      const ownerBuckets = new Map<string, OwnerKpiGroup>();

      for (const { raw, kpi } of hydrated) {
        // 1) org
        if (raw.scope === 'org' && isLinkedToTeam(raw)) {
          orgKpis.push(kpi);
          continue;
        }
        // 2) area
        if (raw.scope === 'area' && isLinkedToTeam(raw)) {
          const aid: string | null =
            raw.responsible_area_id ?? raw.area_id ?? null;
          const key = aid ?? '__no_area__';
          if (!areaBuckets.has(key)) {
            const areaInfo = raw.area;
            areaBuckets.set(key, {
              areaId: aid,
              areaName: areaInfo?.name || 'Sem área definida',
              areaColor: areaInfo?.color ?? null,
              kpis: [],
            });
          }
          areaBuckets.get(key)!.kpis.push(kpi);
          continue;
        }
        // 3) team
        if (raw.scope === 'team' && isTeamScopeMatch(raw)) {
          teamKpis.push(kpi);
          continue;
        }
        // 4) owners (fallback) — restante cujo owner é membro
        if (raw.owner_user_id && memberIdSet.has(raw.owner_user_id)) {
          const oid = raw.owner_user_id;
          if (!ownerBuckets.has(oid)) {
            ownerBuckets.set(oid, {
              ownerId: oid,
              ownerName: raw.owner?.display_name || 'Sem nome',
              photoUrl: raw.owner?.photo_url ?? null,
              kpis: [],
            });
          }
          ownerBuckets.get(oid)!.kpis.push(kpi);
        }
        // KPIs que sobrarem (improvável dado os filtros) são ignorados.
      }

      // Ordenações
      const byName = (a: KpiWithValues, b: KpiWithValues) =>
        a.name.localeCompare(b.name);
      orgKpis.sort(byName);
      teamKpis.sort(byName);

      const areaGroups = Array.from(areaBuckets.values())
        .map((g) => ({ ...g, kpis: g.kpis.sort(byName) }))
        .sort((a, b) => a.areaName.localeCompare(b.areaName));

      const ownerGroups = Array.from(ownerBuckets.values())
        .map((g) => ({ ...g, kpis: g.kpis.sort(byName) }))
        .sort((a, b) => a.ownerName.localeCompare(b.ownerName));

      const totalCount =
        orgKpis.length +
        areaGroups.reduce((acc, g) => acc + g.kpis.length, 0) +
        teamKpis.length +
        ownerGroups.reduce((acc, g) => acc + g.kpis.length, 0);

      return {
        org: orgKpis,
        area: areaGroups,
        team: teamKpis,
        owners: ownerGroups,
        memberCount: memberIds.length,
        totalCount,
      };
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
