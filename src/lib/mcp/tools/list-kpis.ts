import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { classifyKpiTrendSeries } from "../../../modules/kpis/utils/trendClassification";
import type { KpiDirection } from "../../../modules/kpis/types";
import { resolveScope } from "../lib/context";
import { assertNoError, clampLimit, jsonResult } from "../lib/result";
import { buArg, limitArg, searchArg } from "../lib/args";

const TREND_LABEL: Record<string, string> = {
  growth: "crescimento",
  stable: "estabilidade",
  decline: "queda",
};

export default defineTool({
  name: "list_kpis",
  title: "Listar KPIs e métricas",
  description:
    "Lista os KPIs e métricas da unidade com meta, orientação, frequência, último valor consolidado, farol e tendência (crescimento, estabilidade ou queda) calculada sobre a série consolidada.",
  inputSchema: {
    bu: buArg,
    categoria: z
      .enum(["financeiro", "growth", "cs", "produto", "operacoes", "pessoas"])
      .optional(),
    tipo: z.enum(["kpi", "metric"]).optional(),
    janela_meses: z
      .number()
      .int()
      .optional()
      .describe("Janela para a tendência: 3, 6 ou 12 meses (padrão 6)."),
    busca: searchArg,
    limite: limitArg,
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ bu, categoria, tipo, janela_meses, busca, limite }, ctx) => {
    const scope = await resolveScope(ctx, bu);
    const window = [3, 6, 12].includes(janela_meses ?? 6) ? (janela_meses ?? 6) : 6;

    let query = scope.supabase
      .from("kpi_metrics")
      .select(
        "id, name, description, category, indicator_type, unit, direction, target_value, status, lifecycle_status, scope, frequency, consolidation_frequency, update_frequency, owner_user_id, team_id, area_id",
      )
      .eq("bu_id", scope.buId)
      .is("deleted_at", null)
      .eq("status", "active")
      .order("name")
      .limit(clampLimit(limite, 100));

    if (categoria) query = query.eq("category", categoria);
    if (tipo) query = query.eq("indicator_type", tipo);
    if (busca) query = query.ilike("name", `%${busca}%`);

    const { data: metrics, error } = await query;
    assertNoError(error, "KPIs");

    const ids = (metrics ?? []).map((m) => m.id as string);
    const since = new Date();
    since.setMonth(since.getMonth() - window - 1);

    const { data: values, error: valuesError } = ids.length
      ? await scope.supabase
          .from("kpi_values")
          .select("kpi_id, value, reference_date, input_type, rag_status, period_label")
          .in("kpi_id", ids)
          .gte("reference_date", since.toISOString().slice(0, 10))
          .order("reference_date", { ascending: false })
          .limit(1200)
      : { data: [], error: null };
    assertNoError(valuesError, "valores de KPI");

    const byKpi = new Map<string, Array<Record<string, unknown>>>();
    for (const v of values ?? []) {
      const list = byKpi.get(v.kpi_id as string) ?? [];
      list.push(v as Record<string, unknown>);
      byKpi.set(v.kpi_id as string, list);
    }

    const kpis = (metrics ?? []).map((m) => {
      const all = byKpi.get(m.id as string) ?? [];
      const consolidated = all.filter((v) => v.input_type !== "partial");
      const latest = consolidated[0] ?? all[0] ?? null;
      const trend = classifyKpiTrendSeries(
        consolidated.map((v) => ({
          value: Number(v.value),
          reference_date: String(v.reference_date),
        })),
        (m.direction as KpiDirection | null) ?? "up",
      );
      return {
        id: m.id,
        nome: m.name,
        descricao: m.description,
        categoria: m.category,
        tipo: m.indicator_type,
        unidade: m.unit,
        orientacao: m.direction,
        meta: m.target_value,
        frequencia: m.frequency ?? m.consolidation_frequency,
        escopo: m.scope,
        ciclo_de_vida: m.lifecycle_status,
        responsavel_id: m.owner_user_id,
        ultimo_valor: latest ? Number(latest.value) : null,
        ultimo_periodo: latest ? (latest.period_label ?? latest.reference_date) : null,
        farol: latest?.rag_status ?? null,
        tendencia: trend ? TREND_LABEL[trend.trend] : "sem dados suficientes",
        tendencia_pct: trend ? Math.round(trend.orientedPct * 10) / 10 : null,
        tendencia_pontos: trend?.points ?? consolidated.length,
      };
    });

    return jsonResult({ unidade: scope.buName, janela_meses: window, total: kpis.length, kpis });
  },
});
