import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { resolveScope } from "../lib/context";
import { assertNoError, clampLimit, jsonResult } from "../lib/result";
import { buArg, limitArg, searchArg } from "../lib/args";

export default defineTool({
  name: "list_projects",
  title: "Listar projetos",
  description:
    "Lista os projetos da unidade com responsável, status, datas e marcos (com prazo e situação de cada marco). Use para saber o andamento e o que está atrasado.",
  inputSchema: {
    bu: buArg,
    status: z.enum(["planned", "in_progress", "paused", "done", "cancelled"]).optional(),
    busca: searchArg,
    incluir_marcos: z.boolean().optional().describe("Padrão: verdadeiro."),
    limite: limitArg,
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ bu, status, busca, incluir_marcos, limite }, ctx) => {
    const scope = await resolveScope(ctx, bu);

    let query = scope.supabase
      .from("projects")
      .select("id, name, description, status, owner_id, start_date, due_date, external_url")
      .eq("bu_id", scope.buId)
      .is("deleted_at", null)
      .order("due_date", { ascending: true })
      .limit(clampLimit(limite, 100));
    if (status) query = query.eq("status", status);
    if (busca) query = query.ilike("name", `%${busca}%`);

    const { data: projects, error } = await query;
    assertNoError(error, "projetos");

    const ids = (projects ?? []).map((p) => p.id as string);
    const withMilestones = incluir_marcos !== false && ids.length > 0;
    const { data: milestones } = withMilestones
      ? await scope.supabase
          .from("project_milestones")
          .select("id, project_id, name, status, start_date, due_date, owner_id, sort_order")
          .in("project_id", ids)
          .is("deleted_at", null)
          .order("sort_order")
          .limit(500)
      : { data: [] };

    const today = new Date().toISOString().slice(0, 10);

    return jsonResult({
      unidade: scope.buName,
      projetos: (projects ?? []).map((p) => {
        const marcos = (milestones ?? []).filter((m) => m.project_id === p.id);
        return {
          id: p.id,
          nome: p.name,
          descricao: p.description,
          status: p.status,
          responsavel_id: p.owner_id,
          inicio: p.start_date,
          prazo: p.due_date,
          link: p.external_url,
          marcos_total: marcos.length,
          marcos_concluidos: marcos.filter((m) => m.status === "done").length,
          marcos_atrasados: marcos.filter(
            (m) => m.status !== "done" && m.due_date && String(m.due_date) < today,
          ).length,
          marcos: withMilestones
            ? marcos.map((m) => ({
                id: m.id,
                nome: m.name,
                status: m.status,
                inicio: m.start_date,
                prazo: m.due_date,
                responsavel_id: m.owner_id,
              }))
            : undefined,
        };
      }),
    });
  },
});
