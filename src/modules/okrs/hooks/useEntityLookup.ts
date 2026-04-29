/**
 * useEntityLookup — Onda 4 Fase 2 (Denormalização de snapshots de ritos)
 *
 * Hook canônico para resolver `id → nome/título` em runtime nos renderers de
 * ritos (TeamCheckinReport, LeaderPrepReport, QbrMeetingReport, etc.). Substitui
 * a leitura direta dos campos `@deprecated` em snapshots (`teamName`, `krTitle`,
 * `objectiveTitle`, `ownerName`, `kpiName`).
 *
 * Padrão de leitura defensiva (consumidores devem aplicar):
 *   const teamName = lookups.teams.get(snap.teamId)?.name ?? snap.teamName ?? '(removido)';
 *
 * Características:
 * - Batch fetch único por entidade (in.(...))
 * - BU-scoped (usa client BU-scoped quando disponível)
 * - Tolerante: ids vazios → query desabilitada; entidade não encontrada → undefined
 * - Cache 5min (staleTime) — nomes mudam pouco
 *
 * Ver:
 * - `mem://standards/wizard-snapshot-denormalized-fields-deprecation`
 * - `.lovable/plan.md` — Onda 4 Fase 2
 */

import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { okrsKeys } from '@/lib/queryKeys/okrs';

const STALE_5MIN = 5 * 60 * 1000;

export interface EntityLookupRecord {
  id: string;
  name: string;
}

export type EntityMap = Map<string, EntityLookupRecord>;

export interface UseEntityLookupArgs {
  teamIds?: string[];
  teamKrIds?: string[];
  orgKrIds?: string[];
  teamObjectiveIds?: string[];
  orgObjectiveIds?: string[];
  profileIds?: string[];
  kpiIds?: string[];
}

export interface UseEntityLookupResult {
  teams: EntityMap;
  teamKrs: EntityMap;
  orgKrs: EntityMap;
  teamObjectives: EntityMap;
  orgObjectives: EntityMap;
  profiles: EntityMap;
  kpis: EntityMap;
  isLoading: boolean;
}

const EMPTY_MAP: EntityMap = new Map();

function dedupe(ids: string[] | undefined): string[] {
  if (!ids || ids.length === 0) return [];
  return Array.from(new Set(ids.filter((id): id is string => typeof id === 'string' && id.length > 0))).sort();
}

function toMap(rows: { id: string; name: string }[] | null | undefined): EntityMap {
  const map: EntityMap = new Map();
  rows?.forEach((r) => {
    if (r?.id) map.set(r.id, { id: r.id, name: r.name ?? '' });
  });
  return map;
}

export function useEntityLookup(args: UseEntityLookupArgs): UseEntityLookupResult {
  const { client: supabase, buId } = useOptionalBuClient();

  const teamIds = dedupe(args.teamIds);
  const teamKrIds = dedupe(args.teamKrIds);
  const orgKrIds = dedupe(args.orgKrIds);
  const teamObjectiveIds = dedupe(args.teamObjectiveIds);
  const orgObjectiveIds = dedupe(args.orgObjectiveIds);
  const profileIds = dedupe(args.profileIds);
  const kpiIds = dedupe(args.kpiIds);

  const ready = !!supabase && !!buId;

  const teamsQ = useQuery({
    queryKey: okrsKeys.entityLookup('teams', buId, teamIds),
    queryFn: async () => {
      const { data, error } = await supabase!
        .from('teams')
        .select('id, name')
        .in('id', teamIds);
      if (error) throw error;
      return toMap(data);
    },
    enabled: ready && teamIds.length > 0,
    staleTime: STALE_5MIN,
  });

  const teamKrsQ = useQuery({
    queryKey: okrsKeys.entityLookup('team_krs', buId, teamKrIds),
    queryFn: async () => {
      const { data, error } = await supabase!
        .from('okr_team_key_results')
        .select('id, title')
        .in('id', teamKrIds);
      if (error) throw error;
      return toMap(data?.map((r) => ({ id: r.id, name: r.title })));
    },
    enabled: ready && teamKrIds.length > 0,
    staleTime: STALE_5MIN,
  });

  const orgKrsQ = useQuery({
    queryKey: okrsKeys.entityLookup('org_krs', buId, orgKrIds),
    queryFn: async () => {
      const { data, error } = await supabase!
        .from('okr_org_key_results')
        .select('id, title')
        .in('id', orgKrIds);
      if (error) throw error;
      return toMap(data?.map((r) => ({ id: r.id, name: r.title })));
    },
    enabled: ready && orgKrIds.length > 0,
    staleTime: STALE_5MIN,
  });

  const teamObjectivesQ = useQuery({
    queryKey: okrsKeys.entityLookup('team_objectives', buId, teamObjectiveIds),
    queryFn: async () => {
      const { data, error } = await supabase!
        .from('okr_team_objectives')
        .select('id, title')
        .in('id', teamObjectiveIds);
      if (error) throw error;
      return toMap(data?.map((r) => ({ id: r.id, name: r.title })));
    },
    enabled: ready && teamObjectiveIds.length > 0,
    staleTime: STALE_5MIN,
  });

  const orgObjectivesQ = useQuery({
    queryKey: okrsKeys.entityLookup('org_objectives', buId, orgObjectiveIds),
    queryFn: async () => {
      const { data, error } = await supabase!
        .from('okr_org_objectives')
        .select('id, title')
        .in('id', orgObjectiveIds);
      if (error) throw error;
      return toMap(data?.map((r) => ({ id: r.id, name: r.title })));
    },
    enabled: ready && orgObjectiveIds.length > 0,
    staleTime: STALE_5MIN,
  });

  const profilesQ = useQuery({
    queryKey: okrsKeys.entityLookup('profiles', buId, profileIds),
    queryFn: async () => {
      const { data, error } = await supabase!
        .from('profiles')
        .select('id, full_name')
        .in('id', profileIds);
      if (error) throw error;
      return toMap(data?.map((r) => ({ id: r.id, name: r.full_name ?? '' })));
    },
    enabled: ready && profileIds.length > 0,
    staleTime: STALE_5MIN,
  });

  const kpisQ = useQuery({
    queryKey: okrsKeys.entityLookup('kpis', buId, kpiIds),
    queryFn: async () => {
      const { data, error } = await supabase!
        .from('kpi_metrics')
        .select('id, name')
        .in('id', kpiIds);
      if (error) throw error;
      return toMap(data);
    },
    enabled: ready && kpiIds.length > 0,
    staleTime: STALE_5MIN,
  });

  return {
    teams: teamsQ.data ?? EMPTY_MAP,
    teamKrs: teamKrsQ.data ?? EMPTY_MAP,
    orgKrs: orgKrsQ.data ?? EMPTY_MAP,
    teamObjectives: teamObjectivesQ.data ?? EMPTY_MAP,
    orgObjectives: orgObjectivesQ.data ?? EMPTY_MAP,
    profiles: profilesQ.data ?? EMPTY_MAP,
    kpis: kpisQ.data ?? EMPTY_MAP,
    isLoading:
      teamsQ.isLoading ||
      teamKrsQ.isLoading ||
      orgKrsQ.isLoading ||
      teamObjectivesQ.isLoading ||
      orgObjectivesQ.isLoading ||
      profilesQ.isLoading ||
      kpisQ.isLoading,
  };
}

/**
 * Helper de leitura defensiva: lookup → fallback ao campo legado → '(removido)'.
 */
export function resolveName(
  map: EntityMap,
  id: string | null | undefined,
  legacyName?: string | null,
  fallback = '(removido)',
): string {
  if (!id) return legacyName ?? fallback;
  const found = map.get(id);
  if (found?.name) return found.name;
  return legacyName ?? fallback;
}
