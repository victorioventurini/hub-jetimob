import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { resolveScope } from "../lib/context";
import { assertNoError, clampLimit, jsonResult } from "../lib/result";
import { buArg, limitArg, searchArg } from "../lib/args";

export default defineTool({
  name: "list_initiatives",
  title: "Listar iniciativas de OKR",
  description:
    "Lista as iniciativas (ações) vinculadas aos KRs da unidade, com status, prioridade, progresso, responsável e prazo. Use para ver o que está bloqueado ou atrasado.",
  inputSchema: {
    bu: buArg,
    kr_id: z.string().optional(),
    status: z.enum(["planned", "in_progress", "blocked", "completed", "cancelled"]).optional(),
    busca: searchArg,
    limite: limitArg,
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ bu, kr_id, status, busca, limite }, ctx) => {
    const scope = await resolveScope(ctx, bu);
    let query = scope.supabase
      .from("okr_initiatives")
      .select(
        "id, name, description, status, priority, progress, start_date, expected_end_date, owner_user_id, kr_id, contributors, okr_team_key_results(title)",
      )
      .eq("bu_id", scope.buId)
      .is("deleted_at", null)
      .order("expected_end_date", { ascending: true })
      .limit(clampLimit(limite, 100));

    if (kr_id) query = query.eq("kr_id", kr_id);
    if (status) query = query.eq("status", status);
    if (busca) query = query.ilike("name", `%${busca}%`);

    const { data, error } = await query;
    assertNoError(error, "iniciativas");

    return jsonResult({
      unidade: scope.buName,
      iniciativas: (data ?? []).map((i) => ({
        id: i.id,
        nome: i.name,
        descricao: i.description,
        status: i.status,
        prioridade: i.priority,
        progresso_pct: i.progress,
        inicio: i.start_date,
        prazo: i.expected_end_date,
        responsavel_id: i.owner_user_id,
        kr_id: i.kr_id,
        kr: (Array.isArray(i.okr_team_key_results) ? i.okr_team_key_results[0] : i.okr_team_key_results)
          ?.title ?? null,
      })),
    });
  },
});
