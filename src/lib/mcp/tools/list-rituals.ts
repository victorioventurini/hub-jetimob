import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { resolveScope } from "../lib/context";
import { assertNoError, clampLimit, jsonResult } from "../lib/result";
import { buArg, limitArg } from "../lib/args";

export default defineTool({
  name: "list_rituals",
  title: "Listar ritos",
  description:
    "Lista as ocorrências dos ritos da unidade (check-in, pré-weekly, weekly, pré-MBR, MBR, QBR) com data planejada, situação e time, além das cadências configuradas.",
  inputSchema: {
    bu: buArg,
    tipo: z.string().optional().describe("Tipo do rito (ex.: weekly, mbr, qbr, checkin)."),
    desde: z.string().optional().describe("Data inicial (AAAA-MM-DD)."),
    ate: z.string().optional().describe("Data final (AAAA-MM-DD)."),
    limite: limitArg,
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ bu, tipo, desde, ate, limite }, ctx) => {
    const scope = await resolveScope(ctx, bu);

    let occurrences = scope.supabase
      .from("ritual_occurrences")
      .select("id, wizard_type, team_id, planned_date, actual_date, status, notes, teams(name)")
      .eq("bu_id", scope.buId)
      .order("planned_date", { ascending: false })
      .limit(clampLimit(limite, 60));
    if (tipo) occurrences = occurrences.ilike("wizard_type", `%${tipo}%`);
    if (desde) occurrences = occurrences.gte("planned_date", desde);
    if (ate) occurrences = occurrences.lte("planned_date", ate);

    const [occRes, cadRes] = await Promise.all([
      occurrences,
      scope.supabase
        .from("ritual_cadences")
        .select("id, wizard_type, team_id, frequency, day_of_week, day_of_month, is_active, responsible_profile_id")
        .eq("bu_id", scope.buId)
        .eq("is_active", true)
        .limit(100),
    ]);

    assertNoError(occRes.error, "ritos");

    return jsonResult({
      unidade: scope.buName,
      ocorrencias: (occRes.data ?? []).map((o) => ({
        id: o.id,
        rito: o.wizard_type,
        time: (Array.isArray(o.teams) ? o.teams[0] : o.teams)?.name ?? null,
        data_planejada: o.planned_date,
        data_realizada: o.actual_date,
        status: o.status,
        observacoes: o.notes,
      })),
      cadencias: cadRes.data ?? [],
    });
  },
});
