import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { calculateProgress } from "../../../modules/okrs/utils/progressCalculation";
import type { OkrDirection } from "../../../modules/okrs/types";
import { resolveScope } from "../lib/context";
import { assertNoError, clampLimit, jsonResult } from "../lib/result";
import { buArg, limitArg, searchArg } from "../lib/args";

function progressOf(kr: Record<string, unknown>): number {
  return calculateProgress(
    Number(kr.baseline) || 0,
    Number(kr.current_value) || 0,
    Number(kr.target) || 0,
    ((kr.direction as OkrDirection | null) ?? "up") as OkrDirection,
    { unit: (kr.unit as string | null) ?? null },
  );
}

export default defineTool({
  name: "list_key_results",
  title: "Listar key results (KRs)",
  description:
    "Lista KRs de time e organizacionais com baseline, resultado, meta, orientação, progresso calculado, farol e data do último check-in. Permite filtrar por objetivo, time, responsável, ciclo e KRs em risco.",
  inputSchema: {
    bu: buArg,
    escopo: z.enum(["org", "team", "todos"]).optional(),
    objetivo_id: z.string().optional().describe("Id do objetivo."),
    time: z.string().optional(),
    ciclo: z.string().optional().describe("Nome do ciclo. Omita para o ciclo ativo."),
    em_risco: z
      .boolean()
      .optional()
      .describe("Se verdadeiro, retorna apenas KRs ativos com progresso abaixo de 70%."),
    busca: searchArg,
    limite: limitArg,
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ bu, escopo, objetivo_id, time, ciclo, em_risco, busca, limite }, ctx) => {
    const scope = await resolveScope(ctx, bu);
    const { supabase, buId } = scope;
    const limit = clampLimit(limite, 100);

    const { data: cycles } = await supabase
      .from("cycles")
      .select("id, name, status")
      .eq("bu_id", buId)
      .order("start_date", { ascending: false })
      .limit(60);
    const chosenCycle = ciclo
      ? (cycles ?? []).find((c) => (c.name as string).toLowerCase().includes(ciclo.toLowerCase()))
      : (cycles ?? []).find((c) => c.status === "active");
    const cycleId = (chosenCycle?.id as string | undefined) ?? null;

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
      if (!teamId) return jsonResult({ aviso: `Time "${time}" não encontrado.`, key_results: [] });
    }

    const wantTeam = !escopo || escopo === "todos" || escopo === "team";
    const wantOrg = !escopo || escopo === "todos" || escopo === "org";

    const teamPromise = wantTeam
      ? (() => {
          let q = supabase
            .from("okr_team_key_results")
            .select(
              "id, title, type, baseline, current_value, target, direction, unit, status, team_id, team_objective_id, owner_user_id, last_checkin_at, linked_org_kr_id, okr_team_objectives!inner(id, title, cycle_id, team_id), teams(name)",
            )
            .eq("bu_id", buId)
            .is("deleted_at", null)
            .is("cancelled_at", null)
            .limit(limit);
          if (objetivo_id) q = q.eq("team_objective_id", objetivo_id);
          if (teamId) q = q.eq("team_id", teamId);
          if (cycleId && !objetivo_id) q = q.eq("okr_team_objectives.cycle_id", cycleId);
          if (busca) q = q.ilike("title", `%${busca}%`);
          return q;
        })()
      : Promise.resolve({ data: [], error: null });

    const orgPromise = wantOrg
      ? (() => {
          let q = supabase
            .from("okr_org_key_results")
            .select(
              "id, title, baseline, current_value, target, direction, unit, status, org_objective_id, owner_user_id, okr_org_objectives!inner(id, title, cycle_id)",
            )
            .eq("bu_id", buId)
            .is("deleted_at", null)
            .is("cancelled_at", null)
            .limit(limit);
          if (objetivo_id) q = q.eq("org_objective_id", objetivo_id);
          if (cycleId && !objetivo_id) q = q.eq("okr_org_objectives.cycle_id", cycleId);
          if (busca) q = q.ilike("title", `%${busca}%`);
          return q;
        })()
      : Promise.resolve({ data: [], error: null });

    const [teamRes, orgRes] = await Promise.all([teamPromise, orgPromise]);
    assertNoError(teamRes.error, "KRs de time");
    assertNoError(orgRes.error, "KRs organizacionais");

    const map = (row: Record<string, unknown>, escopoLabel: "team" | "org") => {
      const parent = escopoLabel === "team" ? row.okr_team_objectives : row.okr_org_objectives;
      const objetivo = Array.isArray(parent) ? parent[0] : parent;
      return {
        id: row.id,
        escopo: escopoLabel,
        titulo: row.title,
        tipo: row.type ?? null,
        objetivo: (objetivo as { title?: string } | null)?.title ?? null,
        objetivo_id: (objetivo as { id?: string } | null)?.id ?? null,
        time: (Array.isArray(row.teams) ? row.teams[0] : (row.teams as { name?: string } | null))?.name ?? null,
        responsavel_id: row.owner_user_id,
        baseline: row.baseline,
        resultado: row.current_value,
        meta: row.target,
        orientacao: row.direction,
        unidade: row.unit,
        status: row.status,
        progresso_pct: Math.round(progressOf(row)),
        ultimo_checkin: row.last_checkin_at ?? null,
      };
    };

    let krs = [
      ...(teamRes.data ?? []).map((r) => map(r as Record<string, unknown>, "team")),
      ...(orgRes.data ?? []).map((r) => map(r as Record<string, unknown>, "org")),
    ];
    if (em_risco) krs = krs.filter((k) => k.status === "active" && k.progresso_pct < 70);

    return jsonResult({
      unidade: scope.buName,
      ciclo: (chosenCycle?.name as string | undefined) ?? null,
      total: krs.length,
      key_results: krs,
    });
  },
});
