import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { resolveScope } from "../lib/context";
import { assertNoError, clampLimit, jsonResult } from "../lib/result";
import { buArg, limitArg } from "../lib/args";

export default defineTool({
  name: "kpi_history",
  title: "Histórico de um KPI",
  description:
    "Retorna a série histórica de um KPI da unidade (valores consolidados e parciais), com período, farol, origem e observações.",
  inputSchema: {
    kpi: z.string().describe("Nome ou id do KPI."),
    bu: buArg,
    desde: z.string().optional().describe("Data inicial (AAAA-MM-DD)."),
    apenas_consolidados: z.boolean().optional().describe("Padrão: falso (traz parciais também)."),
    limite: limitArg,
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ kpi, bu, desde, apenas_consolidados, limite }, ctx) => {
    const scope = await resolveScope(ctx, bu);

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(kpi);
    let metricQuery = scope.supabase
      .from("kpi_metrics")
      .select("id, name, unit, direction, target_value, frequency, consolidation_frequency")
      .eq("bu_id", scope.buId)
      .is("deleted_at", null)
      .limit(5);
    metricQuery = isUuid ? metricQuery.eq("id", kpi) : metricQuery.ilike("name", `%${kpi}%`);

    const { data: metrics, error: metricError } = await metricQuery;
    assertNoError(metricError, "KPIs");
    const metric = metrics?.[0];
    if (!metric) return jsonResult({ aviso: `KPI "${kpi}" não encontrado na unidade ${scope.buName}.` });

    let query = scope.supabase
      .from("kpi_values")
      .select("value, reference_date, period_start, period_end, period_label, input_type, rag_status, source, notes")
      .eq("kpi_id", metric.id as string)
      .order("reference_date", { ascending: false })
      .limit(clampLimit(limite, 60, 200));
    if (desde) query = query.gte("reference_date", desde);
    if (apenas_consolidados) query = query.neq("input_type", "partial");

    const { data, error } = await query;
    assertNoError(error, "valores de KPI");

    return jsonResult({
      unidade: scope.buName,
      kpi: {
        id: metric.id,
        nome: metric.name,
        unidade_medida: metric.unit,
        orientacao: metric.direction,
        meta: metric.target_value,
        frequencia: metric.frequency ?? metric.consolidation_frequency,
      },
      alternativas: (metrics ?? []).slice(1).map((m) => m.name),
      valores: data ?? [],
    });
  },
});
