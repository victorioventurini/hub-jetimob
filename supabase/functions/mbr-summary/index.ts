/**
 * mbr-summary - Orchestrates AI agents to send MBR summary email
 * 
 * Flow:
 * 1. Validates BU via middleware (no auth required for admin re-trigger)
 * 2. Checks idempotency via summary_sent_at
 * 3. Loads MBR session snapshot (KPIs, OKRs, decisions)
 * 4. Orchestrates 3 AI agents in parallel via direct LLM calls
 * 5. Emits notification to team leaders only (not sub-teams)
 * 6. Marks session as summary sent
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  withMiddleware,
  createServiceClient,
  logRequestCompletion,
  type RequestContext,
} from "../_shared/middleware.ts";
import {
  successResponse,
  errorResponse,
} from "../_shared/response.ts";
import { loadAgent, buildSystemPrompt } from "../_shared/agent-loader.ts";
import { resolveLLMConfig, llmComplete, type LLMMessage } from "../_shared/llm-client.ts";

// ============================================================================
// Types
// ============================================================================

interface MbrSummaryRequest {
  cycleId: string;
  sessionId: string;
  bu_id: string;
}

interface MbrAgentContext {
  buName: string;
  referenceMonth: string;
  criticalKpis: Array<{
    name: string;
    currentValue: number | null;
    target: number | null;
    ragStatus: string;
    variationVsLastMonth: number | null;
    impactAssessment?: string;
  }>;
  orgOkrsSummary: Array<{
    title: string;
    progress: number;
    trend: string;
    remainsStrategicPriority: boolean;
  }>;
  decisions: Array<{
    text: string;
    category: string;
  }>;
  checklist: {
    strategicFocusClear: boolean;
    nextStepsHaveOwners: boolean;
    nonPrioritiesClear: boolean;
    communicateInAllHands: boolean;
  };
}

interface MbrSections {
  opening_text: string;
  critical_kpis_summary: string;
  strategic_decisions: string;
  focus_adjustments: string;
  next_steps: string;
  monthly_directives: string;
  closing_text: string;
}

// ============================================================================
// Helpers
// ============================================================================

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function sanitizeJsonResponse(raw: string): string {
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
  return cleaned.trim();
}

function extractOrFallback(
  result: PromiseSettledResult<string>,
  fallback: string
): string {
  if (result.status === 'fulfilled' && result.value) {
    return result.value;
  }
  return fallback;
}

// ============================================================================
// Agent Invocation — Direct LLM (no HTTP invoke-vic dependency)
// ============================================================================

async function invokeAgentDirect(
  serviceClient: any,
  agentSlug: string,
  userPromptContent: string,
  buId: string,
  requestId: string
): Promise<string> {
  const loaded = await loadAgent(serviceClient, agentSlug, buId, requestId);
  if (!loaded) {
    console.warn(`[${requestId}] Agent ${agentSlug} not found or disabled, using fallback`);
    return '';
  }

  if (!loaded.isEnabledInBu) {
    console.warn(`[${requestId}] Agent ${agentSlug} disabled for BU ${buId}`);
    return '';
  }

  const llmConfig = await resolveLLMConfig(serviceClient, loaded.agent.model_name);
  if (!llmConfig) {
    console.error(`[${requestId}] No LLM config resolved for agent ${agentSlug}`);
    throw new Error(`NO_LLM_CONFIG for ${agentSlug}`);
  }

  const systemPrompt = await buildSystemPrompt(
    serviceClient,
    loaded.agent,
    loaded.effectiveSystemPrompt,
    buId,
    requestId
  );

  const messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPromptContent },
  ];

  const maxTokens = loaded.agent.max_tokens || llmConfig.maxTokens;
  const temperature = loaded.agent.temperature ?? llmConfig.temperature;

  console.log(`[${requestId}] Calling LLM for agent ${agentSlug} (model: ${llmConfig.model})`);
  const response = await llmComplete(llmConfig, messages, { maxTokens, temperature });

  return response.content || '';
}

// ============================================================================
// Data Loading
// ============================================================================

async function loadMbrSessionData(
  serviceClient: any,
  sessionId: string,
  buId: string
): Promise<{
  snapshot: any;
  buName: string;
  leaderAuthIds: string[];
}> {
  // Load session + BU + team leaders in parallel
  const [sessionResult, buResult, teamsResult] = await Promise.all([
    serviceClient
      .from('okr_wizard_sessions')
      .select('id, reflection_data, summary_sent_at, status')
      .eq('id', sessionId)
      .single(),
    serviceClient
      .from('bu_units')
      .select('name')
      .eq('id', buId)
      .single(),
    // Team leaders: only direct teams (not sub-teams)
    serviceClient
      .from('teams')
      .select('leader_user_id')
      .eq('bu_id', buId)
      .eq('status', 'active')
      .is('deleted_at', null)
      .is('parent_team_id', null),
  ]);

  const session = sessionResult.data;
  const buName = buResult.data?.name || 'Empresa';

  // Resolve leader profile IDs → auth user IDs
  const leaderProfileIds = (teamsResult.data || [])
    .map((t: any) => t.leader_user_id)
    .filter(Boolean);

  let leaderAuthIds: string[] = [];
  if (leaderProfileIds.length > 0) {
    const { data: profiles } = await serviceClient
      .from('profiles')
      .select('user_id')
      .in('id', leaderProfileIds)
      .not('user_id', 'is', null);

    leaderAuthIds = (profiles || []).map((p: any) => p.user_id).filter(Boolean);
  }

  // Deduplicate
  leaderAuthIds = [...new Set(leaderAuthIds)];

  return {
    snapshot: session?.reflection_data,
    buName,
    leaderAuthIds,
  };
}

// ============================================================================
// Agent Orchestration
// ============================================================================

async function orchestrateAgents(
  serviceClient: any,
  buId: string,
  agentContext: MbrAgentContext,
  requestId: string
): Promise<MbrSections> {
  const contextJson = JSON.stringify(agentContext);

  const [analistaResult, facilitadorResult, revisorResult] = await Promise.allSettled([
    // Analista de KPIs - KPIs críticos + OKRs
    invokeAgentDirect(serviceClient, 'analista-kpis',
      `Contexto do MBR (Monthly Business Review):\n${contextJson}\n\nGere um resumo executivo do MBR focando em:
1. KPIs críticos e seu impacto estratégico
2. Estado das OKRs organizacionais
Retorne em formato JSON com as chaves:
- critical_kpis_summary: resumo dos KPIs em risco com impacto (lista markdown)
- monthly_directives: diretrizes estratégicas para o próximo mês (2-4 pontos, lista markdown)
Linguagem executiva, objetiva. Foque no que importa.`,
      buId, requestId),

    // Facilitador de Decisões - Consolidação
    invokeAgentDirect(serviceClient, 'facilitador-decisoes',
      `Contexto do MBR (Monthly Business Review):\n${contextJson}\n\nConsolide as decisões estratégicas do MBR.
Retorne em formato JSON com as chaves:
- strategic_decisions: decisões tomadas formatadas como lista markdown
- focus_adjustments: ajustes de foco formatados como lista markdown
- next_steps: próximos passos com responsabilização formatados como lista markdown
Linguagem executiva e orientada a ação.`,
      buId, requestId),

    // Revisor de Comunicação - Abertura e encerramento
    invokeAgentDirect(serviceClient, 'revisor-comunicacao',
      `Contexto: abertura e encerramento do e-mail de MBR mensal
BU: ${agentContext.buName}, Mês de referência: ${agentContext.referenceMonth}

Crie abertura e encerramento para o e-mail de resumo do MBR.
Retorne em formato JSON com as chaves:
- opening_text: 2-3 frases de abertura contextualizando o fechamento do MBR mensal
- closing_text: 1-2 frases de encerramento com tom positivo e orientado à execução
Linguagem executiva, sem burocracia.`,
      buId, requestId),
  ]);

  let sections: MbrSections = {
    opening_text: 'Este é o resumo do Monthly Business Review mais recente.',
    critical_kpis_summary: 'Sem KPIs críticos identificados.',
    strategic_decisions: 'Sem decisões registradas.',
    focus_adjustments: 'Sem ajustes de foco.',
    next_steps: '- Manter o foco na execução estratégica',
    monthly_directives: '- Manter as prioridades definidas',
    closing_text: 'Bom trabalho, liderança!',
  };

  // Parse Analista
  try {
    const content = sanitizeJsonResponse(extractOrFallback(analistaResult, '{}'));
    const json = JSON.parse(content);
    if (json.critical_kpis_summary) sections.critical_kpis_summary = json.critical_kpis_summary;
    if (json.monthly_directives) sections.monthly_directives = json.monthly_directives;
  } catch (e) {
    console.warn('Failed to parse analista response:', e);
    const raw = extractOrFallback(analistaResult, '');
    if (raw && !raw.startsWith('{')) sections.critical_kpis_summary = raw;
  }

  // Parse Facilitador
  try {
    const content = sanitizeJsonResponse(extractOrFallback(facilitadorResult, '{}'));
    const json = JSON.parse(content);
    if (json.strategic_decisions) sections.strategic_decisions = json.strategic_decisions;
    if (json.focus_adjustments) sections.focus_adjustments = json.focus_adjustments;
    if (json.next_steps) sections.next_steps = json.next_steps;
  } catch (e) {
    console.warn('Failed to parse facilitador response:', e);
  }

  // Parse Revisor
  try {
    const content = sanitizeJsonResponse(extractOrFallback(revisorResult, '{}'));
    const json = JSON.parse(content);
    if (json.opening_text) sections.opening_text = json.opening_text;
    if (json.closing_text) sections.closing_text = json.closing_text;
  } catch (e) {
    console.warn('Failed to parse revisor response:', e);
  }

  return sections;
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  const mw = await withMiddleware(req, {
    requireAuth: false,
    requireBu: true,
    validateBuAccess: false,
    logRequest: true,
  });

  if (!mw.success) {
    return mw.error!;
  }

  const ctx = mw.context as RequestContext;
  const requestId = ctx.requestId;
  const buId = ctx.buId!;
  const serviceClient = ctx.serviceClient;

  try {
    const body: MbrSummaryRequest = await req.json();
    const { cycleId, sessionId } = body;

    if (!cycleId || !sessionId) {
      return errorResponse('Missing required fields: cycleId, sessionId', 400, {
        requestId,
        error: 'MISSING_FIELDS',
      });
    }

    console.log(`[${requestId}] MBR summary: cycle=${cycleId}, session=${sessionId}`);

    // Check idempotency
    const { data: session, error: sessionError } = await serviceClient
      .from('okr_wizard_sessions')
      .select('id, summary_sent_at, status')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      console.warn(`[${requestId}] Session not found: ${sessionId}`);
      return successResponse({ skipped: true, reason: 'session_not_found' });
    }

    if (session.summary_sent_at) {
      console.log(`[${requestId}] Summary already sent at ${session.summary_sent_at}`);
      return successResponse({ skipped: true, reason: 'already_sent' });
    }

    // Load MBR data
    const { snapshot, buName, leaderAuthIds } = await loadMbrSessionData(
      serviceClient, sessionId, buId
    );

    if (!snapshot) {
      console.warn(`[${requestId}] No snapshot found for session ${sessionId}`);
      return successResponse({ skipped: true, reason: 'no_snapshot' });
    }

    if (leaderAuthIds.length === 0) {
      console.warn(`[${requestId}] No team leaders found`);
      return successResponse({ skipped: true, reason: 'no_leaders' });
    }

    // Extract snapshot data
    const snapshotData = (snapshot as any)?.data || snapshot;
    const kpiSnapshots = snapshotData?.kpiSnapshots || [];
    const orgOkrSnapshots = snapshotData?.orgOkrSnapshots || [];
    const decisions = snapshotData?.decisions || [];
    const checklist = snapshotData?.checklist || {};
    const referenceMonth = snapshotData?.referenceMonth || '';

    // Build agent context from snapshot (immutable data)
    const agentContext: MbrAgentContext = {
      buName,
      referenceMonth,
      criticalKpis: kpiSnapshots
        .filter((k: any) => k.ragStatus === 'red' || k.ragStatus === 'yellow')
        .map((k: any) => ({
          name: k.name,
          currentValue: k.currentValue,
          target: k.target,
          ragStatus: k.ragStatus,
          variationVsLastMonth: k.variationVsLastMonth,
          impactAssessment: k.impactAssessment,
        })),
      orgOkrsSummary: orgOkrSnapshots.map((o: any) => ({
        title: o.title,
        progress: o.progress,
        trend: o.trend,
        remainsStrategicPriority: o.remainsStrategicPriority,
      })),
      decisions: decisions.map((d: any) => ({
        text: d.text,
        category: d.category,
      })),
      checklist,
    };

    // Orchestrate AI agents
    console.log(`[${requestId}] Orchestrating AI agents for MBR summary...`);
    const sections = await orchestrateAgents(serviceClient, buId, agentContext, requestId);

    // Build notification metadata
    const currentDatetime = formatDate(new Date());
    const contextUrl = `/go/wizard-session/${sessionId}`;

    const metadata = {
      bu_name: buName,
      reference_month: referenceMonth,
      current_datetime: currentDatetime,
      opening_text: sections.opening_text,
      critical_kpis_summary: sections.critical_kpis_summary,
      strategic_decisions: sections.strategic_decisions,
      focus_adjustments: sections.focus_adjustments,
      next_steps: sections.next_steps,
      monthly_directives: sections.monthly_directives,
      closing_text: sections.closing_text,
      context_url: contextUrl,
    };

    // Emit notification to team leaders only
    console.log(`[${requestId}] Emitting MBR notification to ${leaderAuthIds.length} leaders`);
    const { error: notifyError } = await serviceClient.rpc('emit_notification_event', {
      p_event_slug: 'mbr.summary',
      p_bu_id: buId,
      p_recipient_user_ids: leaderAuthIds,
      p_actor_id: null,
      p_title: `MBR — ${referenceMonth}`,
      p_message: `Resumo do Monthly Business Review — ${referenceMonth}`,
      p_context_type: 'mbr',
      p_context_id: sessionId,
      p_context_url: contextUrl,
      p_metadata: metadata,
    });

    if (notifyError) {
      console.error(`[${requestId}] Notification emit failed:`, notifyError);
    }

    // Mark session as summary sent (idempotency)
    const { error: updateError } = await serviceClient
      .from('okr_wizard_sessions')
      .update({ summary_sent_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (updateError) {
      console.error(`[${requestId}] Failed to mark summary sent:`, updateError);
    }

    logRequestCompletion(ctx, 'success');
    return successResponse({
      success: true,
      recipientCount: leaderAuthIds.length,
      sessionId,
    });

  } catch (error) {
    console.error(`[${requestId}] MBR summary error:`, error);
    logRequestCompletion(ctx, 'error', error instanceof Error ? error.message : 'Unknown error');

    return errorResponse(
      'Failed to send MBR summary',
      500,
      { requestId, error: 'MBR_SUMMARY_FAILED' }
    );
  }
});
