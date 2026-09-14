import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { resolveScope } from "../lib/context";
import { assertNoError, clampLimit, jsonResult } from "../lib/result";
import { buArg, limitArg, searchArg } from "../lib/args";

export default defineTool({
  name: "list_assets",
  title: "Listar ativos (patrimônio)",
  description:
    "Lista os ativos do inventário da unidade com código interno, categoria, marca/modelo, situação, quantidade e quem/onde está no momento.",
  inputSchema: {
    bu: buArg,
    situacao: z.enum(["available", "loaned", "maintenance", "written_off"]).optional(),
    busca: searchArg,
    limite: limitArg,
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ bu, situacao, busca, limite }, ctx) => {
    const scope = await resolveScope(ctx, bu);

    let query = scope.supabase
      .from("asset_inventory")
      .select(
        "id, internal_code, name, description, status, brand, model, serial_number, quantity_total, quantity_available, current_holder_type, current_user_id, current_location_id, assigned_at, last_moved_at, acquired_at, acquisition_value, asset_categories(name)",
      )
      .eq("bu_id", scope.buId)
      .is("deleted_at", null)
      .order("name")
      .limit(clampLimit(limite, 100));
    if (situacao) query = query.eq("status", situacao);
    if (busca) {
      query = query.or(
        [`name.ilike.%${busca}%`, `internal_code.ilike.%${busca}%`, `serial_number.ilike.%${busca}%`].join(","),
      );
    }

    const { data, error } = await query;
    assertNoError(error, "ativos");

    return jsonResult({
      unidade: scope.buName,
      ativos: (data ?? []).map((a) => ({
        id: a.id,
        codigo: a.internal_code,
        nome: a.name,
        categoria: (Array.isArray(a.asset_categories) ? a.asset_categories[0] : a.asset_categories)?.name ?? null,
        situacao: a.status,
        marca: a.brand,
        modelo: a.model,
        numero_serie: a.serial_number,
        quantidade_total: a.quantity_total,
        quantidade_disponivel: a.quantity_available,
        posse: a.current_holder_type,
        com_pessoa_id: a.current_user_id,
        local_id: a.current_location_id,
        desde: a.assigned_at,
        ultima_movimentacao: a.last_moved_at,
        aquisicao: a.acquired_at,
        valor_aquisicao: a.acquisition_value,
      })),
    });
  },
});
