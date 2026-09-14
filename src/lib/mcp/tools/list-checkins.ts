import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { resolvePerson, resolveScope } from "../lib/context";
import { assertNoError, clampLimit, jsonResult } from "../lib/result";
import { buArg, limitArg } from "../lib/args";

export default defineTool({
  name: "list_checkins",
  title: "Listar check-ins de KR",
  description:
    "Lista check-ins registrados nos KRs da unidade, com valor anterior e novo, confiança, bloqueios e comentários. Permite filtrar por KR, pessoa, time e período.",
  inputSchema: {
    bu: buArg,
    kr_id: z.string().optional(),
    pessoa: z.string().optional().describe("Nome, e-mail ou id de quem registrou."),
    desde: z.string().optional().describe("Data inicial (AAAA-MM-DD)."),
    limite: limitArg,
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ bu, kr_id, pessoa, desde, limite }, ctx) => {
    const scope = await resolveScope(ctx, bu);
    let query = scope.supabase
      .from("okr_checkins")
      .select(
        "id, kr_id, date, previous_value, current_value, confidence, blockers, comments, user_id, team_id, okr_team_key_results(title)",
      )
      .eq("bu_id", scope.buId)
      .order("date", { ascending: false })
      .limit(clampLimit(limite, 50));

    if (kr_id) query = query.eq("kr_id", kr_id);
    if (desde) query = query.gte("date", desde);
    if (pessoa) {
      const person = await resolvePerson(scope, pessoa);
      query = query.eq("user_id", person.id);
    }

    const { data, error } = await query;
    assertNoError(error, "check-ins");

    return jsonResult({
      unidade: scope.buName,
      checkins: (data ?? []).map((c) => ({
        id: c.id,
        kr_id: c.kr_id,
        kr: (Array.isArray(c.okr_team_key_results) ? c.okr_team_key_results[0] : c.okr_team_key_results)
          ?.title ?? null,
        data: c.date,
        de: c.previous_value,
        para: c.current_value,
        confianca: c.confidence,
        bloqueios: c.blockers,
        comentarios: c.comments,
        autor_id: c.user_id,
      })),
    });
  },
});
