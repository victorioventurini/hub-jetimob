/**
 * useRitualPreparationStatus
 *
 * Hook canônico de consulta ao status de preparação que alimenta um rito.
 *
 * Para cada `ritualType`, descobre quem deveria ter preparado e quem fez,
 * retornando dados prontos para o `PreparationStatusCard`.
 *
 * Mapeamento canônico (Ondas 1–3):
 *  - team-checkin: 1 fonte (líder do time fez `leader-prep`?) → modo 'compact'
 *  - mbr-pre:      1 fonte (líder do time fez `team-checkin` no mês?) → 'compact'
 *  - mbr:          N times (`mbr-pre` no mês) → 'list'
 *  - qbr-pre:      1 fonte (líder fez `team-checkin` recente?) → 'compact'
 *  - qbr-meeting:  N líderes (`qbr-pre`) + C-Level (`qbr-pre-clevel`) → 'sectioned'
 *  - qbr-post:     rito-fonte é o próprio `qbr-meeting` desta janela → 'source-ritual'
 *
 * NÃO altera regra de negócio. Apenas observa `okr_wizard_sessions` filtrando
 * por (wizard_type, cycle_id, status='completed') dentro do BU corrente.
 *
 * SSOT consultada: tabela `okr_wizard_sessions`. Sem novas tabelas.
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, subDays } from 'date-fns';
import { useBu } from '@/contexts/BuContext';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import type {
  PreparationParticipant,
  PreparationSection,
  PreparationStatusMode,
  SourceRitualSummary,
} from '@/modules/okrs/components/wizards/shared/PreparationStatusCard';

// ============================================================
// TYPES
// ============================================================

export type SupportedRitualType =
  | 'team-checkin'
  | 'mbr-pre'
  | 'mbr'
  | 'qbr-pre'
  | 'qbr-meeting'
  | 'qbr-post'
  | 'weekly';

export interface UseRitualPreparationStatusArgs {
  ritualType: SupportedRitualType;
  /** Time corrente — obrigatório para ritos de escopo de time */
  teamId?: string | null;
  /** Ciclo corrente (Q1–Q4) — obrigatório para ritos quarterly */
  cycleId?: string | null;
  /** Mês de referência (YYYY-MM) — usado por MBR / MBR-pre */
  referenceMonth?: string | null;
  /** Permitir desligar a query */
  enabled?: boolean;
}

export interface UseRitualPreparationStatusReturn {
  mode: PreparationStatusMode;
  title: string;
  description?: string;
  participants?: PreparationParticipant[];
  sections?: PreparationSection[];
  sourceRitual?: SourceRitualSummary;
  isLoading: boolean;
  /** True quando não há nada útil a mostrar (oculta o card) */
  isEmpty: boolean;
}

// ============================================================
// HELPERS
// ============================================================

/** Janela mensal no formato (YYYY-MM-01, último dia do mês) */
function monthWindow(refMonth?: string | null): { start: string; end: string } | null {
  if (!refMonth) {
    const now = new Date();
    return {
      start: startOfMonth(now).toISOString(),
      end: endOfMonth(now).toISOString(),
    };
  }
  // refMonth = "YYYY-MM"
  const [y, m] = refMonth.split('-').map(Number);
  if (!y || !m) return null;
  const date = new Date(Date.UTC(y, m - 1, 1));
  return {
    start: startOfMonth(date).toISOString(),
    end: endOfMonth(date).toISOString(),
  };
}

/** Janela "últimos 7 dias" para qbr-pre (avaliando team-checkin recente do líder) */
function recentWeekWindow(): { start: string; end: string } {
  const now = new Date();
  return {
    start: subDays(now, 14).toISOString(),
    end: now.toISOString(),
  };
}

// ============================================================
// HOOK
// ============================================================

export function useRitualPreparationStatus(
  args: UseRitualPreparationStatusArgs,
): UseRitualPreparationStatusReturn {
  const { ritualType, teamId, cycleId, referenceMonth, enabled = true } = args;
  const { currentBu } = useBu();
  const buSupabase = useBuScopedSupabase();
  const buId = currentBu?.id ?? null;

  const queryKey = useMemo(
    () => [
      'ritual-preparation-status',
      ritualType,
      buId,
      teamId ?? null,
      cycleId ?? null,
      referenceMonth ?? null,
    ],
    [ritualType, buId, teamId, cycleId, referenceMonth],
  );

  const { data, isLoading } = useQuery({
    queryKey,
    enabled: enabled && !!buId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      // ────────────────────────────────────────────────
      // CASO: team-checkin (compact, 1 fonte: leader-prep desta semana)
      // ────────────────────────────────────────────────
      if (ritualType === 'team-checkin' && teamId) {
        // Procura a sessão mais recente de leader-prep para este time
        const { data: prepSession } = await buSupabase
          .from('okr_wizard_sessions')
          .select('id, completed_at, started_by, status')
          .eq('wizard_type', 'leader-prep')
          .eq('team_id', teamId)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Nome do líder do time (se houver completion)
        let leaderName = 'Líder do time';
        if (prepSession?.started_by) {
          const { data: profile } = await buSupabase
            .from('profiles')
            .select('display_name')
            .eq('id', prepSession.started_by)
            .maybeSingle();
          if (profile?.display_name) leaderName = profile.display_name;
        }

        const completed = !!prepSession?.completed_at;
        return {
          mode: 'compact' as const,
          title: completed
            ? 'Pré Check-in concluído'
            : 'Pré Check-in pendente',
          participants: [
            {
              id: prepSession?.id ?? 'leader-prep-pending',
              name: leaderName,
              context: 'Pré-Check-in do Time',
              status: completed ? ('completed' as const) : ('pending-late' as const),
              timestamp: prepSession?.completed_at ?? null,
            },
          ],
        };
      }

      // ────────────────────────────────────────────────
      // CASO: mbr-pre (compact, 1 fonte: team-checkin do mês)
      // ────────────────────────────────────────────────
      if (ritualType === 'mbr-pre' && teamId) {
        const window = monthWindow(referenceMonth);
        if (!window) return null;

        const { data: latestTC } = await buSupabase
          .from('okr_wizard_sessions')
          .select('id, completed_at, started_by')
          .eq('wizard_type', 'team-checkin')
          .eq('team_id', teamId)
          .eq('status', 'completed')
          .gte('completed_at', window.start)
          .lte('completed_at', window.end)
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        let leaderName = 'Líder do time';
        if (latestTC?.started_by) {
          const { data: profile } = await buSupabase
            .from('profiles')
            .select('display_name')
            .eq('id', latestTC.started_by)
            .maybeSingle();
          if (profile?.display_name) leaderName = profile.display_name;
        }

        const completed = !!latestTC?.completed_at;
        return {
          mode: 'compact' as const,
          title: completed
            ? 'Check-in do Time desta janela já realizado'
            : 'Sem Check-in do Time nesta janela',
          participants: [
            {
              id: latestTC?.id ?? 'team-checkin-pending',
              name: leaderName,
              context: 'Check-in do Time',
              status: completed ? ('completed' as const) : ('pending-late' as const),
              timestamp: latestTC?.completed_at ?? null,
            },
          ],
        };
      }

      // ────────────────────────────────────────────────
      // CASO: mbr (list, N times com mbr-pre no mês)
      // ────────────────────────────────────────────────
      if (ritualType === 'mbr') {
        const window = monthWindow(referenceMonth);
        if (!window) return null;

        // Times ativos da BU
        const { data: teamsData } = await buSupabase
          .from('teams')
          .select('id, name')
          .eq('bu_id', buId!)
          .eq('status', 'active')
          .is('deleted_at', null)
          .order('name');

        const teams = teamsData ?? [];
        if (teams.length === 0) return null;

        // Elegibilidade: time só entra no card de Pré-MBR se tiver insumo
        // (KPI próprio, KR no ciclo, ou contribuição em KR no ciclo).
        const eligibleTeamIds = new Set<string>();

        const [kpiRes, ownerObjRes, contribObjRes] = await Promise.all([
          buSupabase
            .from('kpi_metrics')
            .select('responsible_team_id')
            .eq('lifecycle_status', 'active')
            .is('deleted_at', null)
            .neq('indicator_type', 'metric')
            .not('responsible_team_id', 'is', null),
          cycleId
            ? buSupabase
                .from('okr_team_objectives')
                .select('team_id, key_results:okr_team_key_results(id, deleted_at, cancelled_at)')
                .eq('cycle_id', cycleId)
                .is('deleted_at', null)
                .is('cancelled_at', null)
                .not('status', 'in', '(cancelled,discarded)')
            : Promise.resolve({ data: [] as Array<{ team_id: string | null; key_results: Array<{ id: string; deleted_at: string | null; cancelled_at: string | null }> }> }),
          cycleId
            ? buSupabase
                .from('okr_team_objectives')
                .select('contributor_team_id, key_results:okr_team_key_results(id, deleted_at, cancelled_at)')
                .eq('cycle_id', cycleId)
                .is('deleted_at', null)
                .is('cancelled_at', null)
                .not('status', 'in', '(cancelled,discarded)')
                .not('contributor_team_id', 'is', null)
            : Promise.resolve({ data: [] as Array<{ contributor_team_id: string | null; key_results: Array<{ id: string; deleted_at: string | null; cancelled_at: string | null }> }> }),
        ]);

        for (const k of kpiRes.data ?? []) {
          if (k.responsible_team_id) eligibleTeamIds.add(k.responsible_team_id);
        }
        const hasActiveKr = (krs: Array<{ deleted_at: string | null; cancelled_at: string | null }> | null | undefined) =>
          (krs ?? []).some((kr) => !kr.deleted_at && !kr.cancelled_at);
        for (const o of (ownerObjRes.data ?? []) as Array<{ team_id: string | null; key_results: Array<{ id: string; deleted_at: string | null; cancelled_at: string | null }> }>) {
          if (o.team_id && hasActiveKr(o.key_results)) eligibleTeamIds.add(o.team_id);
        }
        for (const o of (contribObjRes.data ?? []) as Array<{ contributor_team_id: string | null; key_results: Array<{ id: string; deleted_at: string | null; cancelled_at: string | null }> }>) {
          if (o.contributor_team_id && hasActiveKr(o.key_results)) eligibleTeamIds.add(o.contributor_team_id);
        }

        const eligibleTeams = teams.filter((t) => eligibleTeamIds.has(t.id));
        if (eligibleTeams.length === 0) return null;

        // mbr-pre do mês
        const { data: prepSessions } = await buSupabase
          .from('okr_wizard_sessions')
          .select('id, team_id, completed_at, started_by')
          .eq('wizard_type', 'mbr-pre')
          .eq('status', 'completed')
          .gte('completed_at', window.start)
          .lte('completed_at', window.end);

        const byTeam = new Map<
          string,
          { id: string; completed_at: string | null; started_by: string | null }
        >();
        for (const s of prepSessions ?? []) {
          if (s.team_id && !byTeam.has(s.team_id)) {
            byTeam.set(s.team_id, {
              id: s.id,
              completed_at: s.completed_at,
              started_by: s.started_by,
            });
          }
        }

        // Resolver nomes dos started_by
        const profileIds = Array.from(byTeam.values())
          .map(v => v.started_by)
          .filter(Boolean) as string[];
        const namesById = new Map<string, string>();
        if (profileIds.length > 0) {
          const { data: profiles } = await buSupabase
            .from('profiles')
            .select('id, display_name')
            .in('id', profileIds);
          for (const p of profiles ?? []) {
            if (p.display_name) namesById.set(p.id, p.display_name);
          }
        }

        const participants: PreparationParticipant[] = eligibleTeams.map(t => {
          const session = byTeam.get(t.id);
          const completed = !!session?.completed_at;
          return {
            id: t.id,
            name: namesById.get(session?.started_by ?? '') ?? t.name,
            context: t.name,
            status: completed ? 'completed' : 'pending-late',
            timestamp: session?.completed_at ?? null,
          };
        });

        return {
          mode: 'list' as const,
          title: 'Pré-MBR dos times',
          description:
            'Cobertura dos preparatórios mensais entre os times com KPI ou KR neste ciclo.',
          participants,
        };
      }

      // ────────────────────────────────────────────────
      // CASO: qbr-pre (compact, 1 fonte: team-checkin recente do líder)
      // ────────────────────────────────────────────────
      if (ritualType === 'qbr-pre' && teamId) {
        const window = recentWeekWindow();
        const { data: latestTC } = await buSupabase
          .from('okr_wizard_sessions')
          .select('id, completed_at, started_by')
          .eq('wizard_type', 'team-checkin')
          .eq('team_id', teamId)
          .eq('status', 'completed')
          .gte('completed_at', window.start)
          .lte('completed_at', window.end)
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        let leaderName = 'Líder do time';
        if (latestTC?.started_by) {
          const { data: profile } = await buSupabase
            .from('profiles')
            .select('display_name')
            .eq('id', latestTC.started_by)
            .maybeSingle();
          if (profile?.display_name) leaderName = profile.display_name;
        }

        const completed = !!latestTC?.completed_at;
        return {
          mode: 'compact' as const,
          title: completed
            ? 'Check-in do Time recente disponível'
            : 'Sem Check-in do Time nas últimas 2 semanas',
          participants: [
            {
              id: latestTC?.id ?? 'team-checkin-recent-pending',
              name: leaderName,
              context: 'Check-in do Time (insumo recomendado)',
              status: completed ? ('completed' as const) : ('pending-in-window' as const),
              timestamp: latestTC?.completed_at ?? null,
            },
          ],
        };
      }

      // ────────────────────────────────────────────────
      // CASO: qbr-meeting (sectioned: líderes + C-Level)
      // ────────────────────────────────────────────────
      if (ritualType === 'qbr-meeting' && cycleId) {
        // Times ativos
        const { data: teamsData } = await buSupabase
          .from('teams')
          .select('id, name')
          .eq('bu_id', buId!)
          .eq('status', 'active')
          .is('deleted_at', null)
          .order('name');

        const teams = teamsData ?? [];

        // qbr-pre do ciclo
        const { data: preSessions } = await buSupabase
          .from('okr_wizard_sessions')
          .select('id, team_id, completed_at, started_by')
          .eq('wizard_type', 'qbr-pre')
          .eq('cycle_id', cycleId)
          .eq('status', 'completed');

        // qbr-pre-clevel do ciclo
        const { data: cLevelSessions } = await buSupabase
          .from('okr_wizard_sessions')
          .select('id, completed_at, started_by')
          .eq('wizard_type', 'qbr-pre-clevel')
          .eq('cycle_id', cycleId)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(1);

        const byTeam = new Map<
          string,
          { id: string; completed_at: string | null; started_by: string | null }
        >();
        for (const s of preSessions ?? []) {
          if (s.team_id && !byTeam.has(s.team_id)) {
            byTeam.set(s.team_id, {
              id: s.id,
              completed_at: s.completed_at,
              started_by: s.started_by,
            });
          }
        }

        // Resolver nomes
        const profileIds = [
          ...Array.from(byTeam.values()).map(v => v.started_by),
          ...(cLevelSessions ?? []).map(s => s.started_by),
        ].filter(Boolean) as string[];
        const namesById = new Map<string, string>();
        if (profileIds.length > 0) {
          const { data: profiles } = await buSupabase
            .from('profiles')
            .select('id, display_name')
            .in('id', profileIds);
          for (const p of profiles ?? []) {
            if (p.display_name) namesById.set(p.id, p.display_name);
          }
        }

        const leadersSection: PreparationSection = {
          label: 'Líderes de Time (Pré-QBR)',
          participants: teams.map(t => {
            const session = byTeam.get(t.id);
            const completed = !!session?.completed_at;
            return {
              id: t.id,
              name: namesById.get(session?.started_by ?? '') ?? t.name,
              context: t.name,
              status: completed ? 'completed' : 'pending-late',
              timestamp: session?.completed_at ?? null,
            };
          }),
        };

        const cLevel = (cLevelSessions ?? [])[0];
        const cLevelSection: PreparationSection = {
          label: 'C-Level (Pré-QBR Estratégico)',
          participants: [
            {
              id: cLevel?.id ?? 'clevel-pending',
              name: namesById.get(cLevel?.started_by ?? '') ?? 'C-Level',
              context: 'Análise estratégica',
              status: cLevel ? 'completed' : 'pending-late',
              timestamp: cLevel?.completed_at ?? null,
            },
          ],
        };

        return {
          mode: 'sectioned' as const,
          title: 'Cobertura do preparatório',
          description:
            'Status de quem entregou o material que alimenta esta QBR.',
          sections: [leadersSection, cLevelSection],
        };
      }

      // ────────────────────────────────────────────────
      // CASO: qbr-post (source-ritual: QBR-meeting deste ciclo)
      // ────────────────────────────────────────────────
      if (ritualType === 'qbr-post' && cycleId) {
        const { data: meeting } = await buSupabase
          .from('okr_wizard_sessions')
          .select('id, completed_at, decisions, reflection_data')
          .eq('wizard_type', 'qbr-meeting')
          .eq('cycle_id', cycleId)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!meeting) return null;

        const decisionsCount = Array.isArray(meeting.decisions)
          ? meeting.decisions.length
          : 0;

        return {
          mode: 'source-ritual' as const,
          title: 'Origem deste rito',
          sourceRitual: {
            label: meeting.completed_at
              ? `QBR concluído em ${new Date(meeting.completed_at).toLocaleDateString('pt-BR')}`
              : 'QBR Meeting deste ciclo',
            highlights: [
              { label: `${decisionsCount} decisões registradas` },
              { label: 'Snapshot completo disponível para consulta' },
            ],
          },
        };
      }

      // ────────────────────────────────────────────────
      // CASO: weekly (list, N líderes com pre-weekly da semana)
      // ────────────────────────────────────────────────
      if (ritualType === 'weekly') {
        const now = new Date();
        const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString();

        const { data: teamsData } = await buSupabase
          .from('teams')
          .select('id, name')
          .eq('bu_id', buId!)
          .eq('status', 'active')
          .is('deleted_at', null)
          .order('name');

        const teams = teamsData ?? [];
        if (teams.length === 0) return null;

        // NOTA: okr_wizard_sessions NÃO possui coluna `deleted_at` — não filtrar.
        const { data: preWeeklySessions } = await buSupabase
          .from('okr_wizard_sessions')
          .select('id, team_id, completed_at, started_by')
          .eq('bu_id', buId!)
          .eq('wizard_type', 'pre-weekly')
          .eq('status', 'completed')
          .gte('completed_at', weekStart)
          .lte('completed_at', weekEnd);

        const byTeam = new Map<
          string,
          { id: string; completed_at: string | null; started_by: string | null }
        >();
        for (const s of preWeeklySessions ?? []) {
          if (s.team_id && !byTeam.has(s.team_id)) {
            byTeam.set(s.team_id, {
              id: s.id,
              completed_at: s.completed_at,
              started_by: s.started_by,
            });
          }
        }

        const profileIds = Array.from(byTeam.values())
          .map(v => v.started_by)
          .filter(Boolean) as string[];
        const namesById = new Map<string, string>();
        if (profileIds.length > 0) {
          const { data: profiles } = await buSupabase
            .from('profiles')
            .select('id, display_name')
            .in('id', profileIds);
          for (const p of profiles ?? []) {
            if (p.display_name) namesById.set(p.id, p.display_name);
          }
        }

        const participants: PreparationParticipant[] = teams.map(t => {
          const session = byTeam.get(t.id);
          const completed = !!session?.completed_at;
          return {
            id: t.id,
            name: namesById.get(session?.started_by ?? '') ?? t.name,
            context: t.name,
            status: completed ? 'completed' : 'pending-late',
            timestamp: session?.completed_at ?? null,
          };
        });

        return {
          mode: 'list' as const,
          title: 'Pré-Weeklies da semana',
          description:
            'Cobertura dos preparatórios individuais que alimentam esta Weekly.',
          participants,
        };
      }

      return null;
    },
  });

  // Empacotar resultado
  if (!data) {
    return {
      mode: 'compact',
      title: '',
      isLoading,
      isEmpty: true,
    };
  }

  return {
    mode: data.mode,
    title: data.title,
    description: 'description' in data ? data.description : undefined,
    participants: 'participants' in data ? data.participants : undefined,
    sections: 'sections' in data ? data.sections : undefined,
    sourceRitual: 'sourceRitual' in data ? data.sourceRitual : undefined,
    isLoading,
    isEmpty: false,
  };
}
