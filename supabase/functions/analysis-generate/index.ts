/**
 * analysis-generate — Strategic Analysis Orchestrator
 *
 * Flow:
 * 1) Validates auth + BU + access via shared middleware
 * 2) Verifies bu_ia_config.ia_enabled (403 IA_DISABLED)
 * 3) Creates analysis_reports row (status='generating')
 * 4) Phase 1 (auto/mixed): asks analista-estrategico for module suggestion JSON
 * 5) Phase 2: parallel data collection per module respecting period × depth
 * 6) Phase 3: parallel orchestration of analista-estrategico + facilitador-decisoes
 * 7) Persists result/sources/suggested_actions, status='complete'
 * 8) Returns { reportId } so client can poll
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  withMiddleware,
  logRequestCompletion,
  type RequestContext,
} from "../_shared/middleware.ts";
import { successResponse, errorResponse } from "../_shared/response.ts";
import {
  loadAgent,
  buildSystemPrompt,
  CANONICAL_PROGRESS_INTERPRETATION_RULES,
} from "../_shared/agent-loader.ts";
import { resolveLLMConfig, llmComplete, type LLMMessage } from "../_shared/llm-client.ts";
import type { EdgeSupabaseClient } from "../_shared/types/common.ts";

// ============================================================================
// Internal row/aggregate types for collected modules
// ============================================================================

interface KpiRow { id: string; name: string; unit?: string | null; target_value?: number | null; direction?: string | null; scope?: string | null; created_at?: string }
interface KpiValueRow { kpi_id: string; reference_date: string; value: number | null; rag_status?: string | null; confidence?: number | null }
interface KpisModule { kpis: KpiRow[]; values: KpiValueRow[] }

interface OkrObjRow { id: string; title: string; description?: string | null; team_id?: string | null; cycle_id?: string | null; status?: string | null; progress?: number | null }
interface OkrKrRow { id: string; title: string; team_objective_id: string; baseline?: number | null; target?: number | null; current_value?: number | null; unit?: string | null; status?: string | null }
interface OkrsModule { teamObjectives: OkrObjRow[]; teamKrs: OkrKrRow[]; orgObjectives: OkrObjRow[] }

interface ProjectRow { id: string; name: string; description?: string | null; status?: string | null; start_date?: string | null; due_date?: string | null; owner_id?: string | null }
interface InitiativeRow { id: string; name: string; status?: string | null; owner_user_id?: string | null; kr_id?: string | null; expected_end_date?: string | null; progress?: number | null }
interface ProjectsModule { projects: ProjectRow[]; initiatives: InitiativeRow[] }

interface CheckinRow { id: string; kr_id?: string | null; current_value?: number | null; previous_value?: number | null; confidence?: number | null; blockers?: string | null; comments?: string | null; created_at: string; user_id?: string | null; team_id?: string | null }
interface WizardRow { id: string; wizard_type: string; team_id?: string | null; cycle_id?: string | null; status?: string | null; reflection_data?: unknown; created_at: string; completed_at?: string | null }

interface StrategicJSON {
  title?: string;
  key_metrics?: unknown[];
  insights?: unknown[];
  body?: string;
  sources?: Array<{ module: string; entityType: string; entityId?: string; label: string }>;
}

interface ActionItem {
  type?: string;
  label?: string;
  entity?: string;
  entityId?: string | null;
  [key: string]: unknown;
}

// ============================================================================
// Types
// ============================================================================

type AnalysisMode = "auto" | "manual" | "mixed";
type AnalysisDepth = "auto" | "minimal" | "standard" | "full";

interface GenerateRequest {
  bu_id: string;
  premise: string;
  additional_context?: string | null;
  mode: AnalysisMode;
  modules: string[];
  scope: { type: "bu" | "team"; team_id?: string | null };
  period: { type: "current_cycle" | "last_30d" | "previous_cycle" | "compare_cycles"; cycle_id?: string | null };
  depth: AnalysisDepth;
  template_id?: string | null;
}

interface CollectedData {
  kpis?: KpisModule;
  okrs?: OkrsModule;
  projects?: ProjectsModule;
  initiatives?: InitiativeRow[];
  checkins?: CheckinRow[];
  wizards?: WizardRow[];
}

// ============================================================================
// Helpers
// ============================================================================

function sanitizeJsonResponse(raw: string): string {
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
  return cleaned.trim();
}

function safeParseJSON<T = unknown>(raw: string, fallback: T): T {
  try {
    return JSON.parse(sanitizeJsonResponse(raw)) as T;
  } catch {
    // Attempt regex extraction
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        return fallback;
      }
    }
    return fallback;
  }
}

function periodWindow(period: GenerateRequest["period"], depth: AnalysisDepth): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString();
  let fromDate = new Date(now);

  switch (period.type) {
    case "last_30d":
      fromDate.setDate(now.getDate() - 30);
      break;
    case "previous_cycle":
      fromDate.setMonth(now.getMonth() - 6);
      break;
    case "compare_cycles":
      fromDate.setMonth(now.getMonth() - 12);
      break;
    case "current_cycle":
    default:
      fromDate.setMonth(now.getMonth() - 3);
      break;
  }

  // Depth modifier
  if (depth === "minimal") {
    fromDate = new Date(now);
    fromDate.setDate(now.getDate() - 7);
  } else if (depth === "full") {
    fromDate = new Date(fromDate);
    fromDate.setMonth(fromDate.getMonth() - 3);
  }

  return { from: fromDate.toISOString(), to };
}

// ============================================================================
// Agent invocation (mirror qbr-pre-summary pattern)
// ============================================================================

async function invokeAgentDirect(
  serviceClient: EdgeSupabaseClient,
  agentSlug: string,
  userPromptContent: string,
  buId: string,
  requestId: string,
): Promise<string> {
  const loaded = await loadAgent(serviceClient, agentSlug, buId, requestId);
  if (!loaded || !loaded.isEnabledInBu) {
    console.warn(`[${requestId}] Agent ${agentSlug} not available`);
    return "";
  }

  const llmConfig = await resolveLLMConfig(serviceClient, loaded.agent.model_name);
  if (!llmConfig) throw new Error(`NO_LLM_CONFIG for ${agentSlug}`);

  const systemPrompt = await buildSystemPrompt(
    serviceClient,
    loaded.agent,
    loaded.effectiveSystemPrompt,
    buId,
    requestId,
  );

  const messages: LLMMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPromptContent },
  ];

  const maxTokens = loaded.agent.max_tokens || llmConfig.maxTokens;
  const temperature = loaded.agent.temperature ?? llmConfig.temperature;

  console.log(`[${requestId}] Calling LLM for agent ${agentSlug} (model: ${llmConfig.model})`);
  const response = await llmComplete(llmConfig, messages, { maxTokens, temperature });
  return response.content || "";
}

// ============================================================================
// Data collection per module (respects period × depth)
// ============================================================================

async function collectKpis(svc: EdgeSupabaseClient, buId: string, win: { from: string; to: string }): Promise<KpisModule> {
  const { data: kpis } = await svc
    .from("kpi_metrics")
    .select("id, name, unit, target_value, direction, scope, created_at")
    .eq("bu_id", buId)
    .is("deleted_at", null)
    .limit(50);

  const ids = ((kpis || []) as KpiRow[]).map((k) => k.id);
  let values: KpiValueRow[] = [];
  if (ids.length > 0) {
    const { data } = await svc
      .from("kpi_values")
      .select("kpi_id, reference_date, value, rag_status, confidence")
      .in("kpi_id", ids)
      .gte("reference_date", win.from.slice(0, 10))
      .lte("reference_date", win.to.slice(0, 10))
      .order("reference_date", { ascending: false });
    values = (data || []) as KpiValueRow[];
  }
  return { kpis: (kpis || []) as KpiRow[], values };
}

async function collectOkrs(svc: EdgeSupabaseClient, buId: string, scope: GenerateRequest["scope"]): Promise<OkrsModule> {
  let teamObjQuery = svc
    .from("okr_team_objectives")
    .select("id, title, description, team_id, cycle_id, status, progress")
    .eq("bu_id", buId)
    .is("deleted_at", null);
  if (scope.type === "team" && scope.team_id) {
    teamObjQuery = teamObjQuery.eq("team_id", scope.team_id);
  }
  const { data: teamObjectives } = await teamObjQuery.limit(80);

  const objIds = ((teamObjectives || []) as OkrObjRow[]).map((o) => o.id);
  let teamKrs: OkrKrRow[] = [];
  if (objIds.length > 0) {
    const { data } = await svc
      .from("okr_team_key_results")
      .select("id, title, team_objective_id, baseline, target, current_value, unit, status")
      .in("team_objective_id", objIds)
      .is("deleted_at", null);
    teamKrs = (data || []) as OkrKrRow[];
  }

  const { data: orgObjectives } = await svc
    .from("okr_org_objectives")
    .select("id, title, description, cycle_id, status")
    .eq("bu_id", buId)
    .is("deleted_at", null)
    .limit(40);

  return { teamObjectives: (teamObjectives || []) as OkrObjRow[], teamKrs, orgObjectives: (orgObjectives || []) as OkrObjRow[] };
}

async function collectProjects(svc: EdgeSupabaseClient, buId: string, win: { from: string; to: string }, _scope: GenerateRequest["scope"]): Promise<ProjectsModule> {
  const q = svc
    .from("projects")
    .select("id, name, description, status, start_date, due_date, owner_id")
    .eq("bu_id", buId)
    .is("deleted_at", null)
    .gte("created_at", win.from);
  const { data: projects } = await q.limit(80);

  const initiativesQ = svc
    .from("okr_initiatives")
    .select("id, name, status, owner_user_id, kr_id, expected_end_date, progress")
    .eq("bu_id", buId)
    .is("deleted_at", null)
    .limit(80);
  const { data: initiatives } = await initiativesQ;

  return { projects: (projects || []) as ProjectRow[], initiatives: (initiatives || []) as InitiativeRow[] };
}

async function collectCheckins(svc: EdgeSupabaseClient, buId: string, win: { from: string; to: string }, _scope: GenerateRequest["scope"]): Promise<CheckinRow[]> {
  const q = svc
    .from("okr_checkins")
    .select("id, kr_id, current_value, previous_value, confidence, blockers, comments, created_at, user_id, team_id")
    .eq("bu_id", buId)
    .gte("created_at", win.from)
    .lte("created_at", win.to)
    .order("created_at", { ascending: false })
    .limit(200);
  const { data } = await q;
  return data || [];
}

async function collectWizards(svc: EdgeSupabaseClient, buId: string, win: { from: string; to: string }) {
  const { data } = await svc
    .from("okr_wizard_sessions")
    .select("id, wizard_type, team_id, cycle_id, status, reflection_data, created_at, completed_at")
    .eq("bu_id", buId)
    .gte("created_at", win.from)
    .lte("created_at", win.to)
    .order("created_at", { ascending: false })
    .limit(40);
  return data || [];
}

async function collectAll(
  svc: EdgeSupabaseClient,
  buId: string,
  modules: string[],
  scope: GenerateRequest["scope"],
  win: { from: string; to: string },
): Promise<CollectedData> {
  const tasks: Promise<unknown>[] = [];
  const keys: string[] = [];

  if (modules.includes("kpis")) {
    keys.push("kpis");
    tasks.push(collectKpis(svc, buId, win));
  }
  if (modules.includes("okrs")) {
    keys.push("okrs");
    tasks.push(collectOkrs(svc, buId, scope));
  }
  if (modules.includes("projects") || modules.includes("initiatives")) {
    keys.push("projects");
    tasks.push(collectProjects(svc, buId, win, scope));
  }
  if (modules.includes("checkins")) {
    keys.push("checkins");
    tasks.push(collectCheckins(svc, buId, win, scope));
  }
  if (modules.includes("wizards")) {
    keys.push("wizards");
    tasks.push(collectWizards(svc, buId, win));
  }

  const results = await Promise.allSettled(tasks);
  const out: CollectedData = {};
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      (out as Record<string, unknown>)[keys[i]] = r.value;
    } else {
      console.warn(`[collect] failed ${keys[i]}:`, r.reason);
    }
  });
  return out;
}

// ============================================================================
// Sources extraction
// ============================================================================

function buildSources(modules: string[], data: CollectedData) {
  const sources: Array<{ module: string; entityType: string; entityId?: string; label: string }> = [];

  if (modules.includes("kpis") && data.kpis) {
    const kpis = data.kpis as KpisModule | undefined;
    (kpis?.kpis || []).slice(0, 10).forEach((k) =>
      sources.push({ module: "kpis", entityType: "kpi", entityId: k.id, label: `KPI: ${k.name}` }),
    );
  }
  if (modules.includes("okrs") && data.okrs) {
    const okrs = data.okrs as OkrsModule | undefined;
    (okrs?.teamKrs || []).slice(0, 10).forEach((kr) =>
      sources.push({ module: "okrs", entityType: "kr", entityId: kr.id, label: `KR: ${kr.title}` }),
    );
  }
  if (data.projects) {
    const proj = data.projects as ProjectsModule | undefined;
    (proj?.projects || []).slice(0, 6).forEach((p) =>
      sources.push({ module: "projects", entityType: "project", entityId: p.id, label: `Projeto: ${p.name}` }),
    );
  }
  if (data.checkins) {
    const ch = data.checkins as CheckinRow[];
    if (ch.length > 0) {
      sources.push({ module: "checkins", entityType: "count", label: `${ch.length} check-ins` });
    }
  }
  if (data.wizards) {
    const w = data.wizards as WizardRow[];
    if (w.length > 0) {
      sources.push({ module: "wizards", entityType: "count", label: `${w.length} sessões de ritual` });
    }
  }
  return sources;
}

// ============================================================================
// Prompts
// ============================================================================

function buildModuleSuggestionPrompt(premise: string): string {
  return `Premissa: ${premise}

Liste os módulos do hub que devem ser cruzados para responder essa premissa estrategicamente.
Módulos possíveis: kpis, okrs, projects, initiatives, checkins, wizards.

Retorne APENAS JSON no formato:
{"modules": ["kpis","okrs"], "rationale": "..."}`;
}

function buildAnalysisPrompt(req: GenerateRequest, data: CollectedData, win: { from: string; to: string }): string {
  const ctxBlock = req.additional_context?.trim()
    ? `=== CONTEXTO ADICIONAL FORNECIDO PELO USUÁRIO (PRIORITÁRIO) ===\n${req.additional_context.trim()}\n\nUse este contexto ANTES de qualquer dado estruturado para interpretar a situação.\n\n`
    : "";

  return `${ctxBlock}=== PREMISSA ===
${req.premise}

=== JANELA TEMPORAL ===
${win.from} → ${win.to}  (depth=${req.depth})

=== DADOS ESTRUTURADOS COLETADOS ===
${JSON.stringify(data, null, 2)}

${CANONICAL_PROGRESS_INTERPRETATION_RULES}

TAREFA:
Gere uma análise estratégica considerando o contexto de SaaS para o mercado imobiliário brasileiro (sazonalidade trimestral de transações).
Seja específico, acionável, identifique causas-raiz e correlações cross-módulo.

Retorne APENAS JSON no formato:
{
  "title": "string curta (até 80 chars)",
  "key_metrics": [{"label":"string","value":"string","reference":"string","delta":"string"}],
  "insights": [{"type":"info|warning|positive","title":"string","body":"string"}],
  "body": "texto corrido conectando insights, tom consultivo (até 4 parágrafos)",
  "sources": [{"module":"string","label":"string"}]
}
Máximo 5 insights. Métricas-chave apenas as 3 mais relevantes.`;
}

function buildActionsPrompt(req: GenerateRequest, data: CollectedData): string {
  return `Premissa estratégica: ${req.premise}

Contexto (resumo):
${JSON.stringify({
    modules: req.modules,
    scope: req.scope,
    period: req.period,
    depth: req.depth,
    sample: {
      kpis_count: (data.kpis as KpisModule | undefined)?.kpis?.length ?? 0,
      okrs_count: (data.okrs as OkrsModule | undefined)?.teamObjectives?.length ?? 0,
      projects_count: (data.projects as ProjectsModule | undefined)?.projects?.length ?? 0,
      checkins_count: Array.isArray(data.checkins) ? data.checkins.length : 0,
    },
  })}

TAREFA: Gere 3 a 5 ações sugeridas, acionáveis e específicas, para destravar/avançar nessa premissa.
Cada ação pode ser:
- "open_resource": navegar para entidade existente (project, kr, kpi)
- "register_decision": registrar uma decisão formal

Retorne APENAS JSON:
{
  "actions": [
    {"type":"open_resource","label":"Ver projeto X","entity":"project","entityId":"<uuid ou null>"},
    {"type":"register_decision","label":"Definir dono do KR Y","suggestedCategory":"decision","suggestedText":"..."}
  ]
}`;
}

// ============================================================================
// Main
// ============================================================================

serve(async (req) => {
  const mw = await withMiddleware(req, {
    requireAuth: true,
    requireBu: true,
    validateBuAccess: true,
    logRequest: true,
  });
  if (!mw.success) return mw.error!;

  const ctx = mw.context as RequestContext;
  const requestId = ctx.requestId;
  const buId = ctx.buId!;
  const serviceClient = ctx.serviceClient;
  const userId = ctx.user!.id;

  let reportId: string | null = null;

  try {
    const body: GenerateRequest = await req.json();

    if (!body.premise || !body.premise.trim()) {
      return errorResponse("Premise is required", 400, { requestId, error: "PREMISE_REQUIRED" });
    }

    // Check BU IA config
    const { data: iaConfig } = await serviceClient
      .from("bu_ia_config")
      .select("ia_enabled")
      .eq("bu_id", buId)
      .maybeSingle();

    if (iaConfig && iaConfig.ia_enabled === false) {
      return errorResponse("IA is disabled for this BU", 403, {
        requestId,
        error: "IA_DISABLED",
        code: "IA_DISABLED",
      });
    }

    // Resolve creator profile
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!profile?.id) {
      return errorResponse("Profile not found", 403, { requestId, error: "PROFILE_NOT_FOUND" });
    }

    // Defaults
    const mode: AnalysisMode = body.mode || "auto";
    const depth: AnalysisDepth = body.depth || "auto";
    const initialModules = body.modules?.length
      ? body.modules
      : ["kpis", "okrs", "projects", "checkins", "wizards"];
    const scope = body.scope || { type: "bu" };
    const period = body.period || { type: "current_cycle" };

    // Phase 0: create report row
    const { data: created, error: createErr } = await serviceClient
      .from("analysis_reports")
      .insert({
        bu_id: buId,
        created_by: profile.id,
        premise: body.premise,
        additional_context: body.additional_context ?? null,
        mode,
        modules: initialModules,
        scope,
        period,
        depth,
        template_id: body.template_id ?? null,
        status: "generating",
      })
      .select("id")
      .single();

    if (createErr || !created) {
      console.error(`[${requestId}] Failed to create report:`, createErr);
      return errorResponse("Failed to create report", 500, { requestId, error: "CREATE_FAILED" });
    }

    reportId = created.id as string;

    // Fire-and-forget orchestration in background using EdgeRuntime.waitUntil if available,
    // otherwise process synchronously.
    const work = (async () => {
      try {
        // Phase 1: module suggestion (auto/mixed only)
        let modulesFinal = initialModules;
        if (mode === "auto" || mode === "mixed") {
          try {
            const raw = await invokeAgentDirect(
              serviceClient,
              "analista-estrategico",
              buildModuleSuggestionPrompt(body.premise),
              buId,
              requestId,
            );
            const parsed = safeParseJSON<{ modules?: string[] }>(raw, {});
            if (Array.isArray(parsed.modules) && parsed.modules.length > 0) {
              modulesFinal = parsed.modules.filter((m) =>
                ["kpis", "okrs", "projects", "initiatives", "checkins", "wizards"].includes(m),
              );
              if (modulesFinal.length === 0) modulesFinal = initialModules;
            }
          } catch (e) {
            console.warn(`[${requestId}] module suggestion failed:`, e);
          }
        }

        // Phase 2: data collection
        const win = periodWindow(period, depth);
        const data = await collectAll(serviceClient, buId, modulesFinal, scope, win);

        // Phase 3: parallel orchestration
        const [strategicRes, actionsRes] = await Promise.allSettled([
          invokeAgentDirect(
            serviceClient,
            "analista-estrategico",
            buildAnalysisPrompt({ ...body, modules: modulesFinal, mode, depth, scope, period }, data, win),
            buId,
            requestId,
          ),
          invokeAgentDirect(
            serviceClient,
            "facilitador-decisoes",
            buildActionsPrompt({ ...body, modules: modulesFinal, mode, depth, scope, period }, data),
            buId,
            requestId,
          ),
        ]);

        // Parse results
        const strategicJSON = safeParseJSON<StrategicJSON>(
          strategicRes.status === "fulfilled" ? strategicRes.value : "{}",
          {
            title: body.premise.slice(0, 80),
            key_metrics: [],
            insights: [],
            body: "Não foi possível gerar a análise. Tente novamente.",
            sources: [],
          },
        );

        const actionsJSON = safeParseJSON<{ actions?: ActionItem[] }>(
          actionsRes.status === "fulfilled" ? actionsRes.value : "{}",
          { actions: [] },
        );

        const sources = strategicJSON.sources?.length
          ? strategicJSON.sources
          : buildSources(modulesFinal, data);

        await serviceClient
          .from("analysis_reports")
          .update({
            status: "complete",
            title: strategicJSON.title || body.premise.slice(0, 80),
            modules: modulesFinal,
            result: strategicJSON,
            sources,
            suggested_actions: actionsJSON.actions || [],
            generated_at: new Date().toISOString(),
          })
          .eq("id", reportId);

        console.log(`[${requestId}] Report ${reportId} completed`);
      } catch (err) {
        console.error(`[${requestId}] Generation failed:`, err);
        await serviceClient
          .from("analysis_reports")
          .update({
            status: "failed",
            error_message: err instanceof Error ? err.message : "Unknown error",
          })
          .eq("id", reportId);
      }
    })();

    // Try background processing
    // @ts-expect-error EdgeRuntime is provided in Supabase Edge runtime
    if (typeof EdgeRuntime !== "undefined" && (EdgeRuntime as { waitUntil?: (p: Promise<unknown>) => void }).waitUntil) {
      // @ts-expect-error EdgeRuntime is provided in Supabase Edge runtime
      (EdgeRuntime as { waitUntil: (p: Promise<unknown>) => void }).waitUntil(work);
    } else {
      // Fallback: don't await — fire-and-forget (avoid blocking response)
      work.catch((e) => console.error(`[${requestId}] background error:`, e));
    }

    logRequestCompletion(ctx, "success", `report=${reportId}`);
    return successResponse({ reportId, status: "generating" });
  } catch (error) {
    console.error(`[${requestId}] analysis-generate error:`, error);
    if (reportId) {
      await serviceClient
        .from("analysis_reports")
        .update({
          status: "failed",
          error_message: error instanceof Error ? error.message : "Unknown error",
        })
        .eq("id", reportId);
    }
    logRequestCompletion(ctx, "error", error instanceof Error ? error.message : "Unknown");
    return errorResponse("Failed to generate analysis", 500, {
      requestId,
      error: "ANALYSIS_GENERATE_FAILED",
    });
  }
});
