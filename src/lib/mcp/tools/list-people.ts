import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { resolveScope } from "../lib/context";
import { assertNoError, clampLimit, jsonResult } from "../lib/result";
import { buArg, limitArg, searchArg } from "../lib/args";

export default defineTool({
  name: "list_people",
  title: "Listar pessoas",
  description:
    "Lista as pessoas (jetimobers) da unidade com time, cargo, modelo de trabalho e situação. Aceita busca por nome ou e-mail. Não retorna dados pessoais sensíveis.",
  inputSchema: {
    bu: buArg,
    busca: searchArg,
    situacao: z
      .enum(["active", "vacation", "terminated", "external"])
      .optional()
      .describe("Filtra pela situação (padrão: apenas ativos)."),
    modelo_trabalho: z.enum(["onsite", "hybrid", "remote"]).optional(),
    time: z.string().optional().describe("Nome do time para filtrar."),
    limite: limitArg,
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ bu, busca, situacao, modelo_trabalho, time, limite }, ctx) => {
    const scope = await resolveScope(ctx, bu);

    let teamId: string | null = null;
    if (time) {
      const { data: teams, error } = await scope.supabase
        .from("teams")
        .select("id, name")
        .eq("bu_id", scope.buId)
        .is("deleted_at", null)
        .ilike("name", `%${time}%`)
        .limit(1);
      assertNoError(error, "times");
      teamId = (teams?.[0]?.id as string | undefined) ?? null;
      if (!teamId) return jsonResult({ unidade: scope.buName, aviso: `Time "${time}" não encontrado.`, pessoas: [] });
    }

    let query = scope.supabase
      .from("profiles")
      .select(
        "id, display_name, work_email, email, employment_status, work_mode, city, state, start_date, team_id, job_title_id, manager_user_id, user_type, teams(name), job_titles(name)",
      )
      .eq("bu_id", scope.buId)
      .is("deleted_at", null)
      .order("display_name")
      .limit(clampLimit(limite, 100));

    query = query.eq("employment_status", situacao ?? "active");
    if (modelo_trabalho) query = query.eq("work_mode", modelo_trabalho);
    if (teamId) query = query.eq("team_id", teamId);
    if (busca) {
      query = query.or(
        [
          `display_name.ilike.%${busca}%`,
          `first_name.ilike.%${busca}%`,
          `last_name.ilike.%${busca}%`,
          `work_email.ilike.%${busca}%`,
          `email.ilike.%${busca}%`,
        ].join(","),
      );
    }

    const { data, error } = await query;
    assertNoError(error, "pessoas");

    const pessoas = (data ?? []).map((p) => ({
      id: p.id,
      nome: p.display_name,
      email: p.work_email ?? p.email,
      situacao: p.employment_status,
      modelo_trabalho: p.work_mode,
      cidade: p.city,
      estado: p.state,
      inicio: p.start_date,
      tipo: p.user_type,
      time: (Array.isArray(p.teams) ? p.teams[0] : p.teams)?.name ?? null,
      cargo: (Array.isArray(p.job_titles) ? p.job_titles[0] : p.job_titles)?.name ?? null,
      gestor_id: p.manager_user_id,
    }));

    return jsonResult({ unidade: scope.buName, total: pessoas.length, pessoas });
  },
});
