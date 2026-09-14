import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { resolveScope } from "../lib/context";
import { jsonResult } from "../lib/result";
import { buArg } from "../lib/args";

export default defineTool({
  name: "search_next",
  title: "Busca geral no Next",
  description:
    "Busca um termo em vários módulos ao mesmo tempo (pessoas, objetivos, KRs, KPIs, projetos, tickets, ativos e parceiros) e devolve os resultados agrupados por módulo. Use quando não souber onde o assunto está registrado.",
  inputSchema: {
    termo: z.string().min(2).describe("Texto a procurar."),
    bu: buArg,
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ termo, bu }, ctx) => {
    const scope = await resolveScope(ctx, bu);
    const { supabase, buId } = scope;
    const like = `%${termo}%`;

    const [people, orgObj, teamObj, teamKr, kpis, projects, tickets, assets, partners] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name, work_email, employment_status")
        .eq("bu_id", buId)
        .is("deleted_at", null)
        .or([`display_name.ilike.${like}`, `work_email.ilike.${like}`, `email.ilike.${like}`].join(","))
        .limit(10),
      supabase
        .from("okr_org_objectives")
        .select("id, title, status")
        .eq("bu_id", buId)
        .is("deleted_at", null)
        .ilike("title", like)
        .limit(10),
      supabase
        .from("okr_team_objectives")
        .select("id, title, status, team_id")
        .eq("bu_id", buId)
        .is("deleted_at", null)
        .ilike("title", like)
        .limit(10),
      supabase
        .from("okr_team_key_results")
        .select("id, title, status, current_value, target, unit")
        .eq("bu_id", buId)
        .is("deleted_at", null)
        .ilike("title", like)
        .limit(10),
      supabase
        .from("kpi_metrics")
        .select("id, name, category, indicator_type")
        .eq("bu_id", buId)
        .is("deleted_at", null)
        .ilike("name", like)
        .limit(10),
      supabase
        .from("projects")
        .select("id, name, status")
        .eq("bu_id", buId)
        .is("deleted_at", null)
        .ilike("name", like)
        .limit(10),
      supabase
        .from("tickets")
        .select("id, title, status, type")
        .eq("bu_id", buId)
        .is("deleted_at", null)
        .ilike("title", like)
        .limit(10),
      supabase
        .from("asset_inventory")
        .select("id, internal_code, name, status")
        .eq("bu_id", buId)
        .is("deleted_at", null)
        .or([`name.ilike.${like}`, `internal_code.ilike.${like}`].join(","))
        .limit(10),
      supabase
        .from("external_companies")
        .select("id, name, status")
        .is("deleted_at", null)
        .ilike("name", like)
        .limit(10),
    ]);

    return jsonResult({
      unidade: scope.buName,
      termo,
      pessoas: people.data ?? [],
      objetivos_org: orgObj.data ?? [],
      objetivos_time: teamObj.data ?? [],
      key_results: teamKr.data ?? [],
      kpis: kpis.data ?? [],
      projetos: projects.data ?? [],
      tickets: tickets.data ?? [],
      ativos: assets.data ?? [],
      parceiros: partners.data ?? [],
    });
  },
});
