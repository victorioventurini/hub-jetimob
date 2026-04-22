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
  managedTeamIds: string[];
  managedAreaIds: string[];
  isWildcard: boolean;
}

const PAGE_SIZE = 25;

// ────────────────────────────────────────────────────────────────
// Resolver: descobre os escopos disponíveis para o usuário corrente.
// ────────────────────────────────────────────────────────────────
export function useDecisionsScopeContext() {
  const { profileId } = useIdentity();
  const { isWildcard } = usePermissions();
  const { currentBu } = useBu();
  const buSupabase = useOptionalBuScopedSupabase();

  return useQuery<DecisionsScopeContext>({
    queryKey: okrsKeys.decisionsScopeContext(currentBu?.id ?? null, profileId ?? null),
    queryFn: async (): Promise<DecisionsScopeContext> => {
      const empty: DecisionsScopeContext = {
        availableScopes: ['self'],
        managedTeamIds: [],
        managedAreaIds: [],
        isWildcard: !!isWildcard,
      };

      if (!buSupabase || !profileId) return empty;

      // Áreas lideradas
      const { data: areas } = await (buSupabase as any)
        .from('areas')
        .select('id')
        .eq('leader_user_id', profileId)
        .is('deleted_at', null);

      const managedAreaIds: string[] = (areas ?? []).map((a: { id: string }) => a.id);

      // Times liderados (incluindo expansão para sub-times via parent_team_id)
      const { data: leaderTeams } = await (buSupabase as any)
        .from('teams')
        .select('id, parent_team_id, area_id')
        .eq('leader_user_id', profileId)
        .is('deleted_at', null);

      const directIds: string[] = (leaderTeams ?? []).map((t: { id: string }) => t.id);
      const allTeamIds = new Set<string>(directIds);

      // Expansão: times cujos pais o usuário lidera
      if (directIds.length > 0) {
        const { data: childTeams } = await (buSupabase as any)
          .from('teams')
          .select('id, parent_team_id')
          .in('parent_team_id', directIds)
          .is('deleted_at', null);
        for (const t of childTeams ?? []) allTeamIds.add(t.id);
      }

      // Times de áreas lideradas (escopo área)
      if (managedAreaIds.length > 0) {
        const { data: areaTeams } = await (buSupabase as any)
          .from('teams')
          .select('id')
          .in('area_id', managedAreaIds)
          .is('deleted_at', null);
        for (const t of areaTeams ?? []) allTeamIds.add(t.id);
      }

      const availableScopes: DecisionsInboxScope[] = ['self'];
      if (directIds.length > 0) availableScopes.push('team');
      if (managedAreaIds.length > 0) availableScopes.push('area');
      if (isWildcard) availableScopes.push('all');

      return {
        availableScopes,
        managedTeamIds: Array.from(allTeamIds),
        managedAreaIds,
        isWildcard: !!isWildcard,
      };
    },
    enabled: !!buSupabase && !!profileId,
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
}

export function useDecisionsInbox({
  scope,
  filters = {},
  page = 1,
  pageSize = PAGE_SIZE,
}: UseDecisionsInboxParams) {
  const { profileId } = useIdentity();
  const { currentBu } = useBu();
  const buSupabase = useOptionalBuScopedSupabase();
  const { data: scopeCtx } = useDecisionsScopeContext();

  return useQuery<DecisionsInboxResult>({
    queryKey: okrsKeys.decisionsInbox(
      currentBu?.id ?? null,
      profileId ?? null,
      scope,
      filters as unknown as Record<string, unknown>,
      page,
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

      const { data, error } = await (buSupabase as any).rpc('rpc_decisions_inbox', {
        p_bu_id: currentBu.id,
        p_user_profile_id: profileId,
        p_scope: scope,
        p_team_ids: scope === 'team' || scope === 'area' ? scopeCtx?.managedTeamIds ?? [] : [],
        p_area_ids: scope === 'area' ? scopeCtx?.managedAreaIds ?? [] : [],
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
    enabled: !!buSupabase && !!currentBu?.id && !!profileId,
    staleTime: 60 * 1000,
  });
}
