import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { resolveScope } from "../lib/context";
import { assertNoError, clampLimit, jsonResult } from "../lib/result";
import { buArg, limitArg, searchArg } from "../lib/args";

export default defineTool({
  name: "list_analyses",
  title: "Listar análises e decisões",
  description:
    "Lista os relatórios de análise da unidade (premissa, módulos, período, resultado e ações sugeridas) e as decisões estratégicas registradas neles.",
  inputSchema: {
    bu: buArg,
    status: z.enum(["pending", "generating", "complete", "failed"]).optional(),
    incluir_resultado: z
      .boolean()
      .optional()
      .describe("Se verdadeiro, inclui o texto completo do resultado (pode ser longo)."),
    busca: searchArg,
    limite: limitArg,
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ bu, status, incluir_resultado, busca, limite }, ctx) => {
    const scope = await resolveScope(ctx, bu);

    let query = scope.supabase
      .from("analysis_reports")
      .select(
        "id, title, premise, modules, scope, period, depth, status, suggested_actions, generated_at, created_at, result",
      )
      .eq("bu_id", scope.buId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(clampLimit(limite, 20, 100));
    if (status) query = query.eq("status", status);
    if (busca) query = query.ilike("title", `%${busca}%`);

    const { data: reports, error } = await query;
    assertNoError(error, "análises");

    const ids = (reports ?? []).map((r) => r.id as string);
    const { data: decisions } = ids.length
      ? await scope.supabase
          .from("analysis_decisions")
          .select("id, report_id, decisions, created_at")
          .in("report_id", ids)
          .is("deleted_at", null)
          .limit(200)
      : { data: [] };

    return jsonResult({
      unidade: scope.buName,
      analises: (reports ?? []).map((r) => ({
        id: r.id,
        titulo: r.title,
        premissa: r.premise,
        modulos: r.modules,
        escopo: r.scope,
        periodo: r.period,
        profundidade: r.depth,
        status: r.status,
        acoes_sugeridas: r.suggested_actions,
        gerado_em: r.generated_at,
        resultado: incluir_resultado ? r.result : undefined,
        decisoes: (decisions ?? []).filter((d) => d.report_id === r.id).map((d) => d.decisions),
      })),
    });
  },
});
