// Loader for collaborator session snapshot, recipients and entity name lookups
import type { EdgeSupabaseClient, Json } from "../_shared/types/common.ts";

export async function loadCollaboratorSessionData(
  serviceClient: EdgeSupabaseClient,
  sessionId: string,
  buId: string,
): Promise<{
  snapshot: Json | null;
  buName: string;
  userName: string;
  cycleName: string;
  recipientAuthIds: string[];
}> {
  const { data: session, error: sessionError } = await serviceClient
    .from('okr_wizard_sessions')
    .select('id, reflection_data, summary_sent_at, status, started_by, cycle_id')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) throw new Error(`Session not found: ${sessionId}`);

  const [buResult, profileResult, cycleResult] = await Promise.all([
    serviceClient.from('bu_units').select('name').eq('id', buId).single(),
    serviceClient
      .from('profiles')
      .select('id, user_id, display_name, team_id')
      .eq('id', session.started_by)
      .single(),
    session.cycle_id
      ? serviceClient.from('cycles').select('name').eq('id', session.cycle_id).single()
      : Promise.resolve({ data: null }),
  ]);

  const buName = buResult.data?.name || 'Empresa';
  const profile = profileResult.data;
  const userName = profile?.display_name || 'Colaborador';
  const cycleName = cycleResult.data?.name || 'Ciclo';

  let recipientAuthIds: string[] = [];
  if (profile?.user_id) recipientAuthIds.push(profile.user_id);

  if (profile?.team_id) {
    const { data: team } = await serviceClient
      .from('teams')
      .select('leader_user_id')
      .eq('id', profile.team_id)
      .single();
    if (team?.leader_user_id) {
      const { data: leaderProfile } = await serviceClient
        .from('profiles')
        .select('user_id')
        .eq('id', team.leader_user_id)
        .single();
      if (leaderProfile?.user_id) recipientAuthIds.push(leaderProfile.user_id);
    }
  }

  recipientAuthIds = [...new Set(recipientAuthIds)];

  return {
    snapshot: session.reflection_data,
    buName,
    userName,
    cycleName,
    recipientAuthIds,
  };
}

/** Resolve KR titles + KPI names by id in parallel. */
export async function resolveEntityNames(
  serviceClient: EdgeSupabaseClient,
  krIds: string[],
  kpiIds: string[],
): Promise<{ krTitleById: Map<string, string>; kpiNameById: Map<string, string> }> {
  const krTitleById = new Map<string, string>();
  const kpiNameById = new Map<string, string>();
  await Promise.all([
    krIds.length > 0
      ? serviceClient
          .from('okr_team_key_results')
          .select('id, title')
          .in('id', krIds)
          .then(({ data }) => {
            for (const row of data || []) if (row.id && row.title) krTitleById.set(row.id, row.title);
          })
      : Promise.resolve(),
    kpiIds.length > 0
      ? serviceClient
          .from('kpi_metrics')
          .select('id, name')
          .in('id', kpiIds)
          .then(({ data }) => {
            for (const row of data || []) if (row.id && row.name) kpiNameById.set(row.id, row.name);
          })
      : Promise.resolve(),
  ]);
  return { krTitleById, kpiNameById };
}
