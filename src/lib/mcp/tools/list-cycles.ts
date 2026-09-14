import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { resolveScope } from "../lib/context";
import { assertNoError, jsonResult } from "../lib/result";
import { buArg } from "../lib/args";

export default defineTool({
  name: "list_cycles",
  title: "Listar ciclos",
  description:
    "Lista os ciclos de OKR da unidade (ano, trimestre, mês) com datas, tipo e situação. Use para descobrir o ciclo ativo antes de consultar OKRs.",
  inputSchema: {
    bu: buArg,
    status: z.enum(["planning", "active", "closed"]).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ bu, status }, ctx) => {
    const scope = await resolveScope(ctx, bu);
    let query = scope.supabase
      .from("cycles")
      .select("id, name, type, status, start_date, end_date, parent_cycle_id, review_date, retro_date")
      .eq("bu_id", scope.buId)
      .order("start_date", { ascending: false })
      .limit(60);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    assertNoError(error, "ciclos");
    return jsonResult({ unidade: scope.buName, ciclos: data ?? [] });
  },
});
