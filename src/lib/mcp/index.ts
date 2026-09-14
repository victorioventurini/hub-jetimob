/**
 * Servidor MCP do Next.
 *
 * Registro único das ferramentas expostas a assistentes (Claude, ChatGPT,
 * Cursor…). O plugin do Vite empacota este arquivo na edge function `mcp`
 * (`supabase/functions/mcp/index.ts` — gerada, nunca editar à mão).
 *
 * Regras:
 * - Somente leitura nesta etapa.
 * - Toda consulta roda com o token do usuário → RLS como a pessoa.
 *   Proibido `service_role`/`anon`.
 * - A unidade de negócio é resolvida no servidor a partir das associações
 *   do usuário, nunca aceita como identidade vinda do input.
 */
import { auth, defineMcp } from "@lovable.dev/mcp-js";

import whoami from "./tools/whoami";
import listPeople from "./tools/list-people";
import personPerformance from "./tools/person-performance";
import teamPerformance from "./tools/team-performance";
import listOrgStructure from "./tools/list-org-structure";
import listCycles from "./tools/list-cycles";
import listObjectives from "./tools/list-objectives";
import listKeyResults from "./tools/list-key-results";
import listCheckins from "./tools/list-checkins";
import listInitiatives from "./tools/list-initiatives";
import listKpis from "./tools/list-kpis";
import kpiHistory from "./tools/kpi-history";
import listProjects from "./tools/list-projects";
import listTickets from "./tools/list-tickets";
import getTicket from "./tools/get-ticket";
import listRituals from "./tools/list-rituals";
import listAssets from "./tools/list-assets";
import listAssessments from "./tools/list-assessments";
import listPartners from "./tools/list-partners";
import listAnalyses from "./tools/list-analyses";
import searchNext from "./tools/search-next";

// O issuer OAuth precisa ser o host direto do Supabase (o proxy publicado não
// serve para validar o token). `VITE_SUPABASE_PROJECT_ID` é inlinado no build.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "next",
  title: "Next",
  version: "1.0.0",
  instructions: [
    "Ferramentas de consulta do Next, o hub de gestão da Jetimob.",
    "Todas as consultas respeitam as permissões da pessoa conectada e ficam restritas às unidades de negócio a que ela tem acesso.",
    "Comece por `whoami` quando não souber a unidade. Use `search_next` quando não souber em qual módulo o assunto está registrado.",
    "Performance de pessoas: `person_performance` (uma pessoa) e `team_performance` (time inteiro).",
    "OKRs: `list_cycles`, `list_objectives`, `list_key_results`, `list_checkins`, `list_initiatives`.",
    "Indicadores: `list_kpis` (com tendência) e `kpi_history`.",
    "Demais módulos: `list_projects`, `list_tickets`, `get_ticket`, `list_rituals`, `list_assets`, `list_assessments`, `list_partners`, `list_analyses`, `list_org_structure`, `list_people`.",
    "Nenhuma ferramenta escreve dados: registros só podem ser criados ou alterados dentro do Next.",
  ].join(" "),
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    whoami,
    listPeople,
    personPerformance,
    teamPerformance,
    listOrgStructure,
    listCycles,
    listObjectives,
    listKeyResults,
    listCheckins,
    listInitiatives,
    listKpis,
    kpiHistory,
    listProjects,
    listTickets,
    getTicket,
    listRituals,
    listAssets,
    listAssessments,
    listPartners,
    listAnalyses,
    searchNext,
  ],
});
