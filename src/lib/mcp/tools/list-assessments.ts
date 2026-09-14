import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { resolveScope } from "../lib/context";
import { assertNoError, clampLimit, jsonResult } from "../lib/result";
import { buArg, limitArg, searchArg } from "../lib/args";

export default defineTool({
  name: "list_assessments",
  title: "Listar avaliações",
  description:
    "Lista as avaliações da unidade com situação, janela de disponibilidade e um resumo das aplicações (respostas iniciadas, enviadas e nota objetiva média). Não retorna respostas individuais nem CPF.",
  inputSchema: {
    bu: buArg,
    status: z.enum(["draft", "active", "archived"]).optional(),
    busca: searchArg,
    limite: limitArg,
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ bu, status, busca, limite }, ctx) => {
    const scope = await resolveScope(ctx, bu);

    let query = scope.supabase
      .from("assessments")
      .select("id, title, description, status, available_from, available_until, default_total_time_seconds, created_at")
      .eq("bu_id", scope.buId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(clampLimit(limite, 50));
    if (status) query = query.eq("status", status);
    if (busca) query = query.ilike("title", `%${busca}%`);

    const { data: assessments, error } = await query;
    assertNoError(error, "avaliações");

    const ids = (assessments ?? []).map((a) => a.id as string);
    const { data: runs } = ids.length
      ? await scope.supabase
          .from("assessment_runs")
          .select("assessment_id, status, objective_score, submitted_at")
          .in("assessment_id", ids)
          .is("deleted_at", null)
          .limit(1000)
      : { data: [] };

    return jsonResult({
      unidade: scope.buName,
      avaliacoes: (assessments ?? []).map((a) => {
        const mine = (runs ?? []).filter((r) => r.assessment_id === a.id);
        const submitted = mine.filter((r) => r.status === "submitted");
        const scores = submitted
          .map((r) => Number(r.objective_score))
          .filter((n) => Number.isFinite(n));
        return {
          id: a.id,
          titulo: a.title,
          descricao: a.description,
          status: a.status,
          disponivel_de: a.available_from,
          disponivel_ate: a.available_until,
          tempo_total_segundos: a.default_total_time_seconds,
          aplicacoes: mine.length,
          enviadas: submitted.length,
          nota_objetiva_media: scores.length
            ? Math.round((scores.reduce((s, n) => s + n, 0) / scores.length) * 10) / 10
            : null,
        };
      }),
    });
  },
});
