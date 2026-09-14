import { defineTool } from "@lovable.dev/mcp-js";
import { resolveScope } from "../lib/context";
import { assertNoError, jsonResult } from "../lib/result";
import { buArg } from "../lib/args";

export default defineTool({
  name: "list_org_structure",
  title: "Estrutura da unidade",
  description:
    "Lista times, áreas, squads e cargos da unidade, com líderes e situação. Use para entender a estrutura antes de consultar pessoas ou OKRs.",
  inputSchema: { bu: buArg },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ bu }, ctx) => {
    const scope = await resolveScope(ctx, bu);
    const { supabase, buId } = scope;

    const [teams, areas, squads, jobTitles] = await Promise.all([
      supabase
        .from("teams")
        .select("id, name, description, status, area_id, leader_user_id, parent_team_id")
        .eq("bu_id", buId)
        .is("deleted_at", null)
        .order("name"),
      supabase
        .from("areas")
        .select("id, name, description, status, leader_user_id, co_leader_user_id")
        .eq("bu_id", buId)
        .is("deleted_at", null)
        .order("name"),
      supabase
        .from("squads")
        .select("id, name, description, products, status")
        .eq("bu_id", buId)
        .is("deleted_at", null)
        .order("name"),
      supabase
        .from("job_titles")
        .select("id, name, description, is_active")
        .is("deleted_at", null)
        .order("name"),
    ]);

    assertNoError(teams.error, "times");
    assertNoError(areas.error, "áreas");

    return jsonResult({
      unidade: scope.buName,
      times: teams.data ?? [],
      areas: areas.data ?? [],
      squads: squads.data ?? [],
      cargos: (jobTitles.data ?? []).filter((j) => j.is_active),
    });
  },
});
