import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { resolveScope } from "../lib/context";
import { assertNoError, clampLimit, jsonResult } from "../lib/result";
import { buArg, limitArg, searchArg } from "../lib/args";

export default defineTool({
  name: "list_tickets",
  title: "Listar tickets",
  description:
    "Lista os tickets visíveis para o usuário na unidade, com tipo, situação, prazo, responsável, categoria e empresa parceira. Respeita as regras de visibilidade do Next.",
  inputSchema: {
    bu: buArg,
    status: z.enum(["waiting", "paused", "in_progress", "done", "discarded"]).optional(),
    tipo: z.enum(["internal", "external"]).optional(),
    atrasados: z.boolean().optional().describe("Somente tickets em aberto com prazo vencido."),
    busca: searchArg,
    limite: limitArg,
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ bu, status, tipo, atrasados, busca, limite }, ctx) => {
    const scope = await resolveScope(ctx, bu);

    let query = scope.supabase
      .from("tickets")
      .select(
        "id, title, type, status, expected_due_at, owner_user_id, created_by_user_id, visibility, external_company_id, category_id, subcategory_id, created_at, updated_at, ticket_categories(name), external_companies(name)",
      )
      .eq("bu_id", scope.buId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(clampLimit(limite, 50));

    if (status) query = query.eq("status", status);
    if (tipo) query = query.eq("type", tipo);
    if (busca) query = query.ilike("title", `%${busca}%`);
    if (atrasados) {
      query = query.lt("expected_due_at", new Date().toISOString()).in("status", ["waiting", "paused", "in_progress"]);
    }

    const { data, error } = await query;
    assertNoError(error, "tickets");

    return jsonResult({
      unidade: scope.buName,
      total: (data ?? []).length,
      tickets: (data ?? []).map((t) => ({
        id: t.id,
        titulo: t.title,
        tipo: t.type,
        status: t.status,
        prazo: t.expected_due_at,
        responsavel_id: t.owner_user_id,
        autor_id: t.created_by_user_id,
        visibilidade: t.visibility,
        categoria:
          (Array.isArray(t.ticket_categories) ? t.ticket_categories[0] : t.ticket_categories)?.name ?? null,
        empresa:
          (Array.isArray(t.external_companies) ? t.external_companies[0] : t.external_companies)?.name ?? null,
        criado_em: t.created_at,
        atualizado_em: t.updated_at,
      })),
    });
  },
});
