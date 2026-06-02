/**
 * analysis-generate — Strategic Analysis Orchestrator
 *
 * Modular layout:
 *  - types.ts             domain types
 *  - data-collectors.ts   per-module collectors + period window + sources
 *  - prompts.ts           prompt builders
 *  - index.ts             handler + report lifecycle + background orchestration
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  withMiddleware,
  logRequestCompletion,
  type RequestContext,
} from "../_shared/middleware.ts";
import { successResponse, errorResponse } from "../_shared/response.ts";
import { invokeAgentDirect } from "../_shared/invoke-agent.ts";
import { tryParseAiJson } from "../_shared/ai-json.ts";
import {
  buildSources,
  collectAll,
  periodWindow,
} from "./data-collectors.ts";
import {
  buildActionsPrompt,
  buildAnalysisPrompt,
  buildModuleSuggestionPrompt,
} from "./prompts.ts";
import type {
  ActionItem,
  AnalysisDepth,
  AnalysisMode,
  GenerateRequest,
  StrategicJSON,
} from "./types.ts";

function safeParseJSON<T = unknown>(raw: string, fallback: T): T {
  // Fast path via shared helper (handles fences). Fallback to regex extraction.
  const parsed = tryParseAiJson<T | null>(raw, null as unknown as T);
  if (parsed && typeof parsed === "object") return parsed as T;
  const match = raw?.match?.(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

serve(async (req) => {
  const mw = await withMiddleware(req, {
    requireAuth: true,
    requireBu: true,
    validateBuAccess: true,
    logRequest: true,
  });
  if (!mw.success) return mw.error!;

  const ctx = mw.context as RequestContext;
  const { requestId, serviceClient } = ctx;
  const buId = ctx.buId!;
  const userId = ctx.user!.id;

  let reportId: string | null = null;

  try {
    const body: GenerateRequest = await req.json();

    if (!body.premise || !body.premise.trim()) {
      return errorResponse("Premise is required", 400, { requestId, error: "PREMISE_REQUIRED" });
    }

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

    const { data: profile } = await serviceClient
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!profile?.id) {
      return errorResponse("Profile not found", 403, { requestId, error: "PROFILE_NOT_FOUND" });
    }

    const mode: AnalysisMode = body.mode || "auto";
    const depth: AnalysisDepth = body.depth || "auto";
    const initialModules = body.modules?.length
      ? body.modules
      : ["kpis", "okrs", "projects", "checkins", "wizards"];
    const scope = body.scope || { type: "bu" };
    const period = body.period || { type: "current_cycle" };

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

    const work = (async () => {
      try {
        // Phase 1: module suggestion
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

        const strategicRaw = strategicRes.status === "fulfilled" ? strategicRes.value : "";
        const actionsRaw = actionsRes.status === "fulfilled" ? actionsRes.value : "";

        // Se ambos os agentes principais voltaram vazio (cadeia de modelos
        // exaurida ou rejeição), marcamos o relatório como `failed` com
        // mensagem clara, em vez de salvar um "complete" inútil.
        const strategicOk = strategicRes.status === "fulfilled" && strategicRaw.trim().length > 0;
        const actionsOk = actionsRes.status === "fulfilled" && actionsRaw.trim().length > 0;
        if (!strategicOk && !actionsOk) {
          await serviceClient
            .from("analysis_reports")
            .update({
              status: "failed",
              error_message:
                "Todos os modelos de IA estão indisponíveis no momento. Tente novamente em alguns minutos.",
            })
            .eq("id", reportId);
          console.warn(`[${requestId}] Report ${reportId} failed — all LLM fallbacks exhausted`);
          return;
        }

        const strategicJSON = safeParseJSON<StrategicJSON>(strategicRaw || "{}", {
          title: body.premise.slice(0, 80),
          key_metrics: [],
          insights: [],
          body: "Não foi possível gerar a análise. Tente novamente.",
          sources: [],
        });

        const actionsJSON = safeParseJSON<{ actions?: ActionItem[] }>(actionsRaw || "{}", {
          actions: [],
        });

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

    // @ts-expect-error EdgeRuntime is provided in Supabase Edge runtime
    if (typeof EdgeRuntime !== "undefined" && (EdgeRuntime as { waitUntil?: (p: Promise<unknown>) => void }).waitUntil) {
      // @ts-expect-error EdgeRuntime is provided in Supabase Edge runtime
      (EdgeRuntime as { waitUntil: (p: Promise<unknown>) => void }).waitUntil(work);
    } else {
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
