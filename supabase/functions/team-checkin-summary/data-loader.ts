// Data loaders for team-checkin-summary
import type { EdgeSupabaseClient } from "../_shared/types/common.ts";
import {
  analyzePace,
  calculateExpectedProgress,
  generatePaceGuidance,
  getKrStatus,
} from "./pace.ts";
import type {
  CycleInfo,
  DecisionSummary,
  KpiSummary,
  KrHighlight,
  ObjectiveSummary,
} from "./types.ts";

export async function loadTeamData(
  serviceClient: EdgeSupabaseClient,
  teamId: string,
  cycleId: string,
  buId: string,
): Promise<{
  team: { id: string; name: string };
  cycle: CycleInfo;
  buName: string;
  members: string[];
  objectives: ObjectiveSummary[];
  krsHighlight: KrHighlight[];
  kpisRelevant: KpiSummary[];
  cycleElapsedPercent: number;
  paceGuidance: string;
}> {
  const [
    teamResult,
    cycleResult,
    buResult,
    membersResult,
    objectivesResult,
    kpisResult,
    krMetricsResult,
  ] = await Promise.all([
    serviceClient.from('teams').select('id, name').eq('id', teamId).single(),
    serviceClient.from('cycles').select('id, name, type, start_date, end_date').eq('id', cycleId).single(),
    serviceClient.from('bu_units').select('name').eq('id', buId).single(),
    serviceClient.from('user_team_memberships').select('profiles!inner(user_id)').eq('team_id', teamId),
    serviceClient
      .from('okr_team_objectives')
      .select(`
        id, title, progress,
        okr_team_key_results!inner (
          id, title, current_value, target_value, progress, updated_at
        )
      `)
      .eq('team_id', teamId)
      .eq('cycle_id', cycleId)
      .is('deleted_at', null),
    serviceClient
      .from('kpi_metrics')
      .select('id, name, target_value, updated_at, team_id, direction, kpi_values(value, reference_date, rag_status)')
      .eq('team_id', teamId)
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('reference_date', { referencedTable: 'kpi_values', ascending: false })
      .limit(1, { referencedTable: 'kpi_values' }),
    serviceClient.from('okr_kr_metrics').select('kpi_metric_id, role').eq('role', 'primary'),
  ]);

  const team = teamResult.data || { id: teamId, name: 'Time' };
  const cycleData = cycleResult.data;

  const cycle: CycleInfo = {
    id: cycleData?.id || cycleId,
    name: cycleData?.name || 'Ciclo',
    type: cycleData?.type || 'quarter',
    startDate: cycleData?.start_date ? new Date(cycleData.start_date) : new Date(),
    endDate: cycleData?.end_date ? new Date(cycleData.end_date) : new Date(),
  };

  const buName = buResult.data?.name || 'Empresa';
  const cycleElapsedPercent = calculateExpectedProgress(cycle.startDate, cycle.endDate);
  const paceGuidance = generatePaceGuidance(cycle.type, cycleElapsedPercent);

  let memberAuthIds: string[] = [];
  if (membersResult.data && membersResult.data.length > 0) {
    memberAuthIds = (membersResult.data as unknown as Array<{ profiles: { user_id: string | null } | null }>)
      .map((m) => m.profiles?.user_id)
      .filter((v): v is string => Boolean(v));
  } else {
    const { data: profileMembers } = await serviceClient
      .from('profiles')
      .select('user_id')
      .eq('team_id', teamId)
      .is('deleted_at', null)
      .not('user_id', 'is', null);
    if (profileMembers) {
      memberAuthIds = profileMembers
        .map((p: { user_id: string | null }) => p.user_id)
        .filter((v): v is string => Boolean(v));
    }
  }

  const { data: teamLeader } = await serviceClient
    .from('teams')
    .select('profiles!leader_user_id(user_id)')
    .eq('id', teamId)
    .single();
  const leaderProfile = (teamLeader as unknown as { profiles: { user_id: string | null } | null } | null)?.profiles;
  if (leaderProfile?.user_id) memberAuthIds.push(leaderProfile.user_id);

  const { data: directSubteams } = await serviceClient
    .from('teams')
    .select('id, name, leader_user_id')
    .eq('parent_team_id', teamId)
    .eq('status', 'active')
    .is('deleted_at', null);

  if (directSubteams && directSubteams.length > 0) {
    const subteamIds = directSubteams.map((s: { id: string }) => s.id);
    const { data: subteamOkrs } = await serviceClient
      .from('okr_team_objectives')
      .select('team_id')
      .in('team_id', subteamIds)
      .eq('cycle_id', cycleId)
      .is('deleted_at', null)
      .not('status', 'in', '("cancelled","discarded")');

    const subteamsWithOkrs = new Set((subteamOkrs || []).map((o: { team_id: string }) => o.team_id));
    const subteamsWithoutOkrs = directSubteams.filter((s: { id: string }) => !subteamsWithOkrs.has(s.id));

    if (subteamsWithoutOkrs.length > 0) {
      const subteamIdsWithoutOkrs = subteamsWithoutOkrs.map((s: { id: string }) => s.id);
      const { data: subMembers } = await serviceClient
        .from('user_team_memberships')
        .select('profiles!inner(user_id)')
        .in('team_id', subteamIdsWithoutOkrs);

      if (subMembers && subMembers.length > 0) {
        const subMemberIds = (subMembers as unknown as Array<{ profiles: { user_id: string | null } | null }>)
          .map((m) => m.profiles?.user_id)
          .filter((v): v is string => Boolean(v));
        memberAuthIds.push(...subMemberIds);
      } else {
        const { data: subProfileMembers } = await serviceClient
          .from('profiles')
          .select('user_id')
          .in('team_id', subteamIdsWithoutOkrs)
          .is('deleted_at', null)
          .not('user_id', 'is', null);
        if (subProfileMembers) {
          memberAuthIds.push(
            ...subProfileMembers
              .map((p: { user_id: string | null }) => p.user_id)
              .filter((v): v is string => Boolean(v)),
          );
        }
      }

      for (const sub of subteamsWithoutOkrs) {
        if (sub.leader_user_id) {
          const { data: lp } = await serviceClient
            .from('profiles')
            .select('user_id')
            .eq('id', sub.leader_user_id)
            .single();
          if (lp?.user_id) memberAuthIds.push(lp.user_id);
        }
      }
    }
  }

  memberAuthIds = [...new Set(memberAuthIds)];

  const primaryKpiIds = new Set<string>();
  if (krMetricsResult.data) {
    for (const link of krMetricsResult.data) primaryKpiIds.add(link.kpi_metric_id);
  }

  const objectives: ObjectiveSummary[] = [];
  const krsHighlight: KrHighlight[] = [];
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  for (const obj of (objectivesResult.data || [])) {
    const objPace = analyzePace(obj.progress || 0, cycle.startDate, cycle.endDate, cycle.type);
    objectives.push({
      title: obj.title,
      status: objPace.label,
      progress: obj.progress || 0,
      paceStatus: objPace.status,
      paceInterpretation: objPace.interpretation,
    });

    for (const kr of (obj.okr_team_key_results || [])) {
      const updatedAt = kr.updated_at ? new Date(kr.updated_at) : null;
      const updatedRecently = updatedAt ? updatedAt > oneWeekAgo : false;
      const progress = kr.progress || 0;
      const status = getKrStatus(progress, updatedRecently);
      const krPace = analyzePace(progress, cycle.startDate, cycle.endDate, cycle.type);

      if (status !== 'no ritmo' || progress >= 100) {
        krsHighlight.push({
          title: kr.title,
          objectiveTitle: obj.title,
          status,
          currentValue: kr.current_value,
          targetValue: kr.target_value,
          progress,
          paceStatus: krPace.status,
          paceInterpretation: krPace.interpretation,
        });
      }
    }
  }

  const kpisRelevant: KpiSummary[] = [];
  for (const kpi of (kpisResult.data || [])) {
    const latestValue = kpi.kpi_values?.[0] || null;
    const currentValue = latestValue?.value ?? null;
    const ragStatus = latestValue?.rag_status || null;
    const isPrimary = primaryKpiIds.has(kpi.id);
    const referenceDate = latestValue?.reference_date ? new Date(latestValue.reference_date) : null;
    const updatedRecently = referenceDate ? referenceDate > oneWeekAgo : false;

    let status = 'ok';
    if (!updatedRecently) status = 'desatualizado';
    else if (ragStatus === 'red' || ragStatus === 'yellow') status = 'atenção';

    if (isPrimary || status !== 'ok') {
      kpisRelevant.push({
        name: kpi.name,
        currentValue,
        targetValue: kpi.target_value,
        status,
        isPrimary,
      });
    }
  }

  return {
    team,
    cycle,
    buName,
    members: memberAuthIds,
    objectives,
    krsHighlight,
    kpisRelevant,
    cycleElapsedPercent,
    paceGuidance,
  };
}

export async function loadSessionDecisions(
  serviceClient: EdgeSupabaseClient,
  sessionId: string,
): Promise<DecisionSummary[]> {
  const { data: session } = await serviceClient
    .from('okr_wizard_sessions')
    .select('reflection_data')
    .eq('id', sessionId)
    .single();

  if (!session?.reflection_data) return [];

  const reflectionData = session.reflection_data as {
    data?: { decisions?: Array<{ text?: string; description?: string; category?: string; type?: string }> };
  } | null;
  const decisions: DecisionSummary[] = [];

  const categoryToType: Record<string, DecisionSummary['type']> = {
    decision: 'decision',
    focus_adjustment: 'decision',
    next_step: 'initiative',
  };

  if (reflectionData?.data?.decisions) {
    for (const d of reflectionData.data.decisions) {
      const rawCategory = d.category || d.type || 'decision';
      decisions.push({
        text: d.text || d.description || '',
        type: categoryToType[rawCategory] || 'decision',
      });
    }
  }
  return decisions;
}
