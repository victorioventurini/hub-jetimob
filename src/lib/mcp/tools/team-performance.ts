import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { resolveScope } from "../lib/context";
import { buildPersonPerformance } from "../lib/person-performance";
import { assertNoError, jsonResult } from "../lib/result";
import { buArg } from "../lib/args";

export default defineTool({
  name: "team_performance",
  title: "Performance de um time",
  description:
    "Panorama de performance de todas as pessoas ativas de um time: objetivos, KRs com progresso, KPIs e alertas por pessoa. Use para comparar o time.",
  inputSchema: {
    time: z.string().describe("Nome do time."),
    bu: buArg,
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ time, bu }, ctx) => {
    const scope = await resolveScope(ctx, bu);

    const { data: teams, error: teamError } = await scope.supabase
      .from("teams")
      .select("id, name")
      .eq("bu_id", scope.buId)
      .is("deleted_at", null)
      .ilike("name", `%${time}%`)
      .limit(1);
    assertNoError(teamError, "times");
    const team = teams?.[0];
    if (!team) return jsonResult({ aviso: `Time "${time}" não encontrado na unidade ${scope.buName}.` });

    const { data: people, error: peopleError } = await scope.supabase
      .from("profiles")
      .select("id, display_name")
      .eq("bu_id", scope.buId)
      .eq("team_id", team.id)
      .eq("employment_status", "active")
      .is("deleted_at", null)
      .order("display_name")
      .limit(40);
    assertNoError(peopleError, "pessoas do time");

    const results = await Promise.all(
      (people ?? []).map(async (p) => {
        const performance = await buildPersonPerformance(scope, p.id as string);
        return {
          pessoa: p.display_name,
          objetivos: performance.okrs.objetivos.length,
          key_results: performance.okrs.key_results,
          kpis: performance.kpis,
          projetos: performance.projetos.projetos.length,
          alertas: performance.alertas,
        };
      }),
    );

    return jsonResult({ unidade: scope.buName, time: team.name, pessoas: results });
  },
});
