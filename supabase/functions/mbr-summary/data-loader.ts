// MBR session data loader (snapshot + BU + leaders)
import type { EdgeSupabaseClient, Json } from "../_shared/types/common.ts";

export async function loadMbrSessionData(
  serviceClient: EdgeSupabaseClient,
  sessionId: string,
  buId: string,
): Promise<{
  snapshot: Json | null;
  buName: string;
  leaderAuthIds: string[];
}> {
  const [sessionResult, buResult, teamsResult] = await Promise.all([
    serviceClient
      .from('okr_wizard_sessions')
      .select('id, reflection_data, summary_sent_at, status')
      .eq('id', sessionId)
      .single(),
    serviceClient
      .from('bu_units')
      .select('name')
      .eq('id', buId)
      .single(),
    serviceClient
      .from('teams')
      .select('leader_user_id')
      .eq('bu_id', buId)
      .eq('status', 'active')
      .is('deleted_at', null)
      .is('parent_team_id', null),
  ]);

  const session = sessionResult.data;
  const buName = buResult.data?.name || 'Empresa';

  const leaderProfileIds = (teamsResult.data || [])
    .map((t: { leader_user_id: string | null }) => t.leader_user_id)
    .filter((v): v is string => Boolean(v));

  let leaderAuthIds: string[] = [];
  if (leaderProfileIds.length > 0) {
    const { data: profiles } = await serviceClient
      .from('profiles')
      .select('user_id')
      .in('id', leaderProfileIds)
      .not('user_id', 'is', null);

    leaderAuthIds = (profiles || [])
      .map((p: { user_id: string | null }) => p.user_id)
      .filter((v): v is string => Boolean(v));
  }

  leaderAuthIds = [...new Set(leaderAuthIds)];

  return {
    snapshot: session?.reflection_data,
    buName,
    leaderAuthIds,
  };
}
