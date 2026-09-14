import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { resolveScope } from "../lib/context";
import { assertNoError, clampLimit, jsonResult } from "../lib/result";
import { buArg, limitArg, searchArg } from "../lib/args";

export default defineTool({
  name: "list_objectives",
  title: "Listar objetivos (OKRs)",
  description:
    "Lista objetivos organizacionais e/ou de time da unidade, com ciclo, responsável, saúde, progresso médio e quantidade de KRs.",
  inputSchema: {
    bu: buArg,
    escopo: z.enum(["org", "team", "todos"]).optional().describe("Padrão: todos."),
    ciclo: z.string().optional().describe("Nome do ciclo (ex.: 2026-Q3). Omita para o ciclo ativo."),
    time: z.string().optional().describe("Nome do time."),
    status: z.enum(["draft", "active", "completed", "cancelled", "discarded"]).optional(),
    busca: searchArg,
    limite: limitArg,
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ bu, escopo, ciclo, time, status, busca, limite }, ctx) => {
    const scope = await resolveScope(ctx, bu);
    const { supabase, buId } = scope;
    const limit = clampLimit(limite, 100);

    let cycleId: string | null = null;
    let cycleName: string | null = null;
    const { data: cycles, error: cyclesError } = await supabase
      .from("cycles")
      .select("id, name, status")
      .eq("bu_id", buId)
      .order("start_date", { ascending: false })
      .limit(60);
    assertNoError(cyclesError, "ciclos");
    const chosenCycle = ciclo
      ? (cycles ?? []).find((c) => (c.name as string).toLowerCase().includes(ciclo.toLowerCase()))
      : (cycles ?? []).find((c) => c.status === "active");
    if (chosenCycle) {
      cycleId = chosenCycle.id as string;
      cycleName = chosenCycle.name as string;
    }

    let teamId: string | null = null;
    if (time) {
      const { data: teams } = await supabase
        .from("teams")
        .select("id, name")
        .eq("bu_id", buId)
        .is("deleted_at", null)
        .ilike("name", `%${time}%`)
        .limit(1);
      teamId = (teams?.[0]?.id as string | undefined) ?? null;
      if (!teamId) return jsonResult({ aviso: `Time "${time}" não encontrado.`, objetivos: [] });
    }

    const wantOrg = !escopo || escopo === "todos" || escopo === "org";
    const wantTeam = !escopo || escopo === "todos" || escopo === "team";

    const orgPromise = wantOrg
      ? (() => {
          let q = supabase
            .from("okr_org_objectives")
            .select(
              "id, title, description, status, owner_user_id, cycle_id, year, health_status, health_score, start_date, end_date",
            )
            .eq("bu_id", buId)
            .is("deleted_at", null)
            .is("cancelled_at", null)
            .limit(limit);
          if (cycleId) q = q.eq("cycle_id", cycleId);
          if (status) q = q.eq("status", status);
          if (busca) q = q.ilike("title", `%${busca}%`);
          return q;
        })()
      : Promise.resolve({ data: [], error: null });

    const teamPromise = wantTeam
      ? (() => {
          let q = supabase
            .from("okr_team_objectives")
            .select(
              "id, title, description, status, owner_user_id, team_id, cycle_id, is_shared, responsibility_model, health_status, health_score, avg_progress, kr_count, teams(name)",
            )
            .eq("bu_id", buId)
            .is("deleted_at", null)
            .is("cancelled_at", null)
            .limit(limit);
          if (cycleId) q = q.eq("cycle_id", cycleId);
          if (teamId) q = q.eq("team_id", teamId);
          if (status) q = q.eq("status", status);
          if (busca) q = q.ilike("title", `%${busca}%`);
          return q;
        })()
      : Promise.resolve({ data: [], error: null });

    const [org, team] = await Promise.all([orgPromise, teamPromise]);
    assertNoError(org.error, "objetivos organizacionais");
    assertNoError(team.error, "objetivos de time");

    return jsonResult({
      unidade: scope.buName,
      ciclo: cycleName,
      objetivos_org: org.data ?? [],
      objetivos_time: (team.data ?? []).map((o) => ({
        ...o,
        time: (Array.isArray(o.teams) ? o.teams[0] : o.teams)?.name ?? null,
        teams: undefined,
      })),
    });
  },
});
