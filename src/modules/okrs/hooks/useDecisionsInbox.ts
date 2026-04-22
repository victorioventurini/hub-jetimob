/**
 * useDecisionsInbox — consome `rpc_decisions_inbox` para listar decisões
 * registradas em rituais com escopo (self/team/area/all), filtros e paginação.
 *
 * O resolvedor de escopo (`useDecisionsScopeContext`) calcula os times e
 * áreas que o usuário lidera para alimentar a RPC sem expor regras no DB.
 */
import { useQuery } from '@tanstack/react-query';
import { useBu } from '@/contexts/BuContext';
import { useIdentity } from '@/hooks/useIdentity';
import { usePermissions } from '@/hooks/usePermissions';
import { useOptionalBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { okrsKeys } from '@/lib/queryKeys/okrs';
import type { TeamCheckinDecision, WizardPersona } from '../types/wizard';

type TeamRow = { id: string };
type AreaRow = { id: string };

export type DecisionsInboxScope = 'self' | 'team' | 'area' | 'all';

export interface DecisionsInboxFilters {
  status?: 'pending' | 'done' | 'all';
  category?: TeamCheckinDecision['category'];
  wizardType?: WizardPersona | 'all';
  ownerProfileId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  search?: string;
}

export interface DecisionsInboxItem {
  decision: TeamCheckinDecision & { followUpStatus?: string };
  sessionId: string;
  wizardType: WizardPersona;
  structureVersion: string;
  completedAt: string | null;
  teamId: string | null;
  teamName: string | null;
  cycleId: string | null;
  startedBy: string | null;
}

export interface DecisionsInboxResult {
  items: DecisionsInboxItem[];
  totalCount: number;
}

export interface DecisionsScopeContext {
  availableScopes: DecisionsInboxScope[];
  /** Times liderados diretamente + descendentes (escopo `team`). */
  directLeaderTeamIds: string[];
  /** Áreas lideradas pelo usuário (escopo `area`). */
  managedAreaIds: string[];
  isWildcard: boolean;
}

const PAGE_SIZE = 25;

// ────────────────────────────────────────────────────────────────
// Resolver: descobre os escopos disponíveis para o usuário corrente.
// ────────────────────────────────────────────────────────────────
export function useDecisionsScopeContext() {
  const { profileId } = useIdentity();
  const { isWildcard, isLoading: isPermissionsLoading } = usePermissions();
  const { currentBu } = useBu();
  const buSupabase = useOptionalBuScopedSupabase();

  return useQuery<DecisionsScopeContext>({
    queryKey: okrsKeys.decisionsScopeContext(currentBu?.id ?? null, profileId ?? null, isWildcard),
    queryFn: async (): Promise<DecisionsScopeContext> => {
      const empty: DecisionsScopeContext = {
        availableScopes: ['self'],
        directLeaderTeamIds: [],
        managedAreaIds: [],
        isWildcard: !!isWildcard,
      };

      if (!buSupabase || !profileId) return empty;

      const [{ data: areas, error: areasError }, { data: leaderTeams, error: leaderTeamsError }] = await Promise.all([
        (buSupabase as any)
          .from('areas')
          .select('id')
          .eq('leader_user_id', profileId)
          .is('deleted_at', null),
        (buSupabase as any)
          .from('teams')
          .select('id')
          .eq('leader_user_id', profileId)
          .is('deleted_at', null),
      ]);

      if (areasError) throw areasError;
      if (leaderTeamsError) throw leaderTeamsError;

      const managedAreaIds = ((areas ?? []) as AreaRow[]).map((area) => area.id);
      const directIds = ((leaderTeams ?? []) as TeamRow[]).map((team) => team.id);

      // Expansão recursiva: usa get_descendant_team_ids p/ cada time liderado
      const directLeaderTeamIds = new Set<string>(directIds);
      if (directIds.length > 0) {
        const descendantsResults = await Promise.all(
          directIds.map((tid) =>
            (buSupabase as any).rpc('get_descendant_team_ids', {
              p_team_id: tid,
            }),
          ),
        );

        for (const { data: descendants, error } of descendantsResults) {
          if (error) throw error;
          for (const d of (descendants ?? []) as Array<{ get_descendant_team_ids?: string } | string>) {
            const id = typeof d === 'string' ? d : d?.get_descendant_team_ids;
            if (id) directLeaderTeamIds.add(id);
          }
        }
      }

      const availableScopes: DecisionsInboxScope[] = ['self'];
      if (directLeaderTeamIds.size > 0) availableScopes.push('team');
      if (managedAreaIds.length > 0) availableScopes.push('area');
      if (isWildcard) availableScopes.push('all');

      return {
        availableScopes,
        directLeaderTeamIds: Array.from(directLeaderTeamIds),
        managedAreaIds,
        isWildcard: !!isWildcard,
      };
    },
    enabled: !!buSupabase && !!profileId && !isPermissionsLoading,
    staleTime: 5 * 60 * 1000,
  });
}

// ────────────────────────────────────────────────────────────────
// Inbox: chama a RPC com escopo + filtros + paginação.
// ────────────────────────────────────────────────────────────────
export interface UseDecisionsInboxParams {
  scope: DecisionsInboxScope;
  filters?: DecisionsInboxFilters;
  page?: number;
  pageSize?: number;
  /**
   * Override de times pelo client (ex.: filtro `TeamSelect` arbitrário).
   * Quando informado e não-vazio, força `scope='team'` e ignora `managedTeamIds`
   * do `scopeCtx`. Mantém o padrão `team-filter-includes-subteams` (cabe ao
   * caller expandir os descendentes).
   */
  overrideTeamIds?: string[];
}

export function useDecisionsInbox({
  scope,
  filters = {},
  page = 1,
  pageSize = PAGE_SIZE,
  overrideTeamIds,
}: UseDecisionsInboxParams) {
  const { profileId } = useIdentity();
  const { currentBu } = useBu();
  const buSupabase = useOptionalBuScopedSupabase();
  const { data: scopeCtx, isLoading: isScopeLoading } = useDecisionsScopeContext();

  const hasOverride = !!overrideTeamIds && overrideTeamIds.length > 0;
  const effectiveScope: DecisionsInboxScope = hasOverride ? 'team' : scope;

  return useQuery<DecisionsInboxResult>({
    queryKey: okrsKeys.decisionsInbox(
      currentBu?.id ?? null,
      profileId ?? null,
      effectiveScope,
      filters as unknown as Record<string, unknown>,
      page,
      hasOverride ? overrideTeamIds : null,
      hasOverride ? null : effectiveScope === 'team' ? scopeCtx?.directLeaderTeamIds ?? null : null,
      hasOverride ? null : effectiveScope === 'area' ? scopeCtx?.managedAreaIds ?? null : null,
    ),
    queryFn: async (): Promise<DecisionsInboxResult> => {
      if (!buSupabase || !currentBu?.id || !profileId) {
        return { items: [], totalCount: 0 };
      }

      const rpcFilters: Record<string, unknown> = {};
      if (filters.status && filters.status !== 'all') rpcFilters.status = filters.status;
      else rpcFilters.status = 'all';
      if (filters.category) rpcFilters.category = filters.category;
      if (filters.wizardType && filters.wizardType !== 'all') rpcFilters.wizard_type = filters.wizardType;
      if (filters.ownerProfileId) rpcFilters.owner_profile_id = filters.ownerProfileId;
      if (filters.dateFrom) rpcFilters.date_from = filters.dateFrom;
      if (filters.dateTo) rpcFilters.date_to = filters.dateTo;
      if (filters.search) rpcFilters.search = filters.search;

      // Payload por escopo:
      //  - override (TeamSelect manual) → força 'team' com IDs já expandidos no client
      //  - 'team'  → directLeaderTeamIds (com descendentes)
      //  - 'area'  → área é resolvida via p_area_ids (RPC expande para times)
      //  - 'self' / 'all' → sem times/áreas
      const teamIdsForRpc = hasOverride
        ? overrideTeamIds
        : effectiveScope === 'team'
          ? scopeCtx?.directLeaderTeamIds ?? []
          : [];

      const areaIdsForRpc = !hasOverride && effectiveScope === 'area'
        ? scopeCtx?.managedAreaIds ?? []
        : [];

      const { data, error } = await (buSupabase as any).rpc('rpc_decisions_inbox', {
        p_bu_id: currentBu.id,
        p_user_profile_id: profileId,
        p_scope: effectiveScope,
        p_team_ids: teamIdsForRpc,
        p_area_ids: areaIdsForRpc,
        p_filters: rpcFilters,
        p_limit: pageSize,
        p_offset: (page - 1) * pageSize,
      });

      if (error) throw error;

      const rows = (data ?? []) as Array<{
        decision: TeamCheckinDecision & { followUpStatus?: string };
        session_id: string;
        wizard_type: WizardPersona;
        structure_version: string;
        completed_at: string | null;
        team_id: string | null;
        team_name: string | null;
        cycle_id: string | null;
        started_by: string | null;
        total_count: number;
      }>;

      return {
        items: rows.map((r) => ({
          decision: r.decision,
          sessionId: r.session_id,
          wizardType: r.wizard_type,
          structureVersion: r.structure_version,
          completedAt: r.completed_at,
          teamId: r.team_id,
          teamName: r.team_name,
          cycleId: r.cycle_id,
          startedBy: r.started_by,
        })),
        totalCount: rows[0]?.total_count ?? 0,
      };
    },
    enabled: !!buSupabase && !!currentBu?.id && !!profileId && !isScopeLoading,
    staleTime: 60 * 1000,
  });
}
