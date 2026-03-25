/**
 * qbr-pre-summary - Orchestrates AI agents to send QBR Pre summary email
 * 
 * Flow:
 * 1. Validates BU via middleware
 * 2. Checks idempotency via summary_sent_at
 * 3. Loads QBR Pre session snapshot (KR states, KPIs, learnings)
 * 4. Orchestrates 3 AI agents in parallel via direct LLM calls
 * 5. Emits notification to team leader + BU admins
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
import { loadAgent, buildSystemPrompt, CANONICAL_PROGRESS_INTERPRETATION_RULES } from "../_shared/agent-loader.ts";
import { resolveLLMConfig, llmComplete, type LLMMessage } from "../_shared/llm-client.ts";

// ============================================================================
// Types
// ============================================================================

interface QbrPreSummaryRequest {
  teamId: string;
  cycleId: string;
  sessionId: string;
  bu_id: string;
}

interface QbrPreAgentContext {
  buName: string;
  teamName: string;
  cycleName: string;
  krFinalStates: Array<{
    krTitle: string;
    state: string;
    finalProgress: number;
    paceStatus: string;
  }>;
  criticalKpis: Array<{
    name: string;
    currentValue: number | null;
    target: number | null;
    ragStatus: string;
    variationVsLastMonth: number | null;
  }>;
  zombieCandidates: string[];
  kpisToCreate: Array<{
    description: string;
    suggestedScope: string;
    relatedKrTitle: string;
  }>;
  learnings: {
    whatWorked: string;
    whatDidntWork: string;
    debts: string;
  };
  decisions: Array<{
    text: string;
    category: string;
  }>;
}

interface QbrPreSections {
  opening_text: string;
  kr_balance_summary: string;
  kpi_health_analysis: string;
  learnings_synthesis: string;
  next_cycle_recommendations: string;
  closing_text: string;
}

// ============================================================================
// Helpers
// ============================================================================

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function sanitizeJsonResponse(raw: string): string {
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
  return cleaned.trim();
}

function extractOrFallback(result: PromiseSettledResult<string>, fallback: string): string {
  if (result.status === 'fulfilled' && result.value) return result.value;
  return fallback;
}

// ============================================================================
// Agent Invocation
// ============================================================================

async function invokeAgentDirect(
  serviceClient: any,
  agentSlug: string,
  userPromptContent: string,
  buId: string,
  requestId: string
): Promise<string> {
  const loaded = await loadAgent(serviceClient, agentSlug, buId, requestId);
  if (!loaded || !loaded.isEnabledInBu) {
    console.warn(`[${requestId}] Agent ${agentSlug} not available`);
    return '';
  }

  const llmConfig = await resolveLLMConfig(serviceClient, loaded.agent.model_name);
  if (!llmConfig) throw new Error(`NO_LLM_CONFIG for ${agentSlug}`);

  const systemPrompt = await buildSystemPrompt(serviceClient, loaded.agent, loaded.effectiveSystemPrompt, buId, requestId);
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

async function loadQbrPreData(
  serviceClient: any,
  sessionId: string,
  teamId: string,
  buId: string
): Promise<{
  snapshot: any;
  buName: string;
  teamName: string;
  leaderAuthId: string | null;
}> {
  const [sessionResult, buResult, teamResult] = await Promise.all([
    serviceClient.from('okr_wizard_sessions').select('id, reflection_data, summary_sent_at, status').eq('id', sessionId).single(),
    serviceClient.from('bu_units').select('name').eq('id', buId).single(),
    serviceClient.from('teams').select('name, leader_user_id').eq('id', teamId).single(),
  ]);

  const buName = buResult.data?.name || 'Empresa';
  const teamName = teamResult.data?.name || 'Time';

  let leaderAuthId: string | null = null;
  if (teamResult.data?.leader_user_id) {
    const { data: profile } = await serviceClient
      .from('profiles').select('user_id')
      .eq('id', teamResult.data.leader_user_id)
      .not('user_id', 'is', null)
      .single();
    leaderAuthId = profile?.user_id || null;
  }

  return {
    snapshot: sessionResult.data?.reflection_data,
    buName,
    teamName,
    leaderAuthId,
  };
}

// ============================================================================
// Agent Orchestration
// ============================================================================

async function orchestrateAgents(
  serviceClient: any,
  buId: string,
  ctx: QbrPreAgentContext,
  requestId: string
): Promise<QbrPreSections> {
  const contextJson = JSON.stringify(ctx);

  const [analistaResult, facilitadorResult, revisorResult] = await Promise.allSettled([
    invokeAgentDirect(serviceClient, 'analista-kpis',
      `Contexto do Pré-QBR (Quarterly Business Review) do time "${ctx.teamName}":\n${contextJson}\n\n${CANONICAL_PROGRESS_INTERPRETATION_RULES}\n\nGere um resumo executivo focando em:
1. Balanço final das KRs (progresso, ritmo, estados finais)
2. Saúde dos KPIs (indicadores em alerta, zombie candidates)
3. Indicadores sugeridos para criação
Retorne em formato JSON com as chaves:
- kr_balance_summary: balanço das KRs do ciclo (lista markdown)
- kpi_health_analysis: saúde dos indicadores + sinalizações (lista markdown)
- next_cycle_recommendations: 2-4 recomendações para o próximo ciclo (lista markdown)
Linguagem executiva, objetiva.`,
      buId, requestId),

    invokeAgentDirect(serviceClient, 'facilitador-decisoes',
      `Contexto do Pré-QBR do time "${ctx.teamName}":\n${contextJson}\n\nConsolide os aprendizados e decisões.
Retorne em formato JSON com as chaves:
- learnings_synthesis: síntese de aprendizados (o que funcionou, o que não, dívidas)
Linguagem executiva e orientada a ação.`,
      buId, requestId),

    invokeAgentDirect(serviceClient, 'revisor-comunicacao',
      `Contexto: abertura e encerramento do e-mail de resumo do Pré-QBR
Time: "${ctx.teamName}", BU: "${ctx.buName}", Ciclo: "${ctx.cycleName}"

Crie abertura e encerramento para o e-mail de resumo do Pré-QBR.
Retorne em formato JSON com as chaves:
- opening_text: 2-3 frases contextualizando o balanço trimestral do time
- closing_text: 1-2 frases de encerramento orientadas à preparação para o QBR
Linguagem executiva, sem burocracia.`,
      buId, requestId),
  ]);

  const sections: QbrPreSections = {
    opening_text: 'Este é o resumo do balanço pré-QBR do time.',
    kr_balance_summary: 'Sem KRs para análise.',
    kpi_health_analysis: 'Sem KPIs críticos identificados.',
    learnings_synthesis: 'Sem aprendizados registrados.',
    next_cycle_recommendations: '- Manter foco na execução',
    closing_text: 'Preparação para o QBR concluída.',
  };

  try {
    const content = sanitizeJsonResponse(extractOrFallback(analistaResult, '{}'));
    const json = JSON.parse(content);
    if (json.kr_balance_summary) sections.kr_balance_summary = json.kr_balance_summary;
    if (json.kpi_health_analysis) sections.kpi_health_analysis = json.kpi_health_analysis;
    if (json.next_cycle_recommendations) sections.next_cycle_recommendations = json.next_cycle_recommendations;
  } catch (e) {
    console.warn('Failed to parse analista response:', e);
  }

  try {
    const content = sanitizeJsonResponse(extractOrFallback(facilitadorResult, '{}'));
    const json = JSON.parse(content);
    if (json.learnings_synthesis) sections.learnings_synthesis = json.learnings_synthesis;
  } catch (e) {
    console.warn('Failed to parse facilitador response:', e);
  }

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

  if (!mw.success) return mw.error!;

  const ctx = mw.context as RequestContext;
  const requestId = ctx.requestId;
  const buId = ctx.buId!;
  const serviceClient = ctx.serviceClient;

  try {
    const body: QbrPreSummaryRequest = await req.json();
    const { teamId, cycleId, sessionId } = body;

    if (!teamId || !cycleId || !sessionId) {
      return errorResponse('Missing required fields: teamId, cycleId, sessionId', 400, { requestId, error: 'MISSING_FIELDS' });
    }

    console.log(`[${requestId}] QBR Pre summary: team=${teamId}, cycle=${cycleId}, session=${sessionId}`);

    // Idempotency check
    const { data: session } = await serviceClient
      .from('okr_wizard_sessions').select('id, summary_sent_at, status')
      .eq('id', sessionId).single();

    if (!session) return successResponse({ skipped: true, reason: 'session_not_found' });
    if (session.summary_sent_at) {
      console.log(`[${requestId}] Summary already sent at ${session.summary_sent_at}`);
      return successResponse({ skipped: true, reason: 'already_sent' });
    }

    // Load data
    const { snapshot, buName, teamName, leaderAuthId } = await loadQbrPreData(serviceClient, sessionId, teamId, buId);
    if (!snapshot) return successResponse({ skipped: true, reason: 'no_snapshot' });

    const snapshotData = snapshot?.data || snapshot;

    // Load cycle name
    const { data: cycleInfo } = await serviceClient.from('cycles').select('name').eq('id', cycleId).single();
    const cycleName = cycleInfo?.name || 'Ciclo';

    // Build agent context
    const agentContext: QbrPreAgentContext = {
      buName,
      teamName,
      cycleName,
      krFinalStates: (snapshotData?.krFinalStates || []).map((kr: any) => ({
        krTitle: kr.krTitle, state: kr.state, finalProgress: kr.finalProgress, paceStatus: kr.paceStatus,
      })),
      criticalKpis: (snapshotData?.kpiSnapshot || snapshotData?.kpiSnapshots || [])
        .filter((k: any) => k.ragStatus === 'red' || k.ragStatus === 'yellow')
        .map((k: any) => ({
          name: k.name, currentValue: k.currentValue, target: k.target,
          ragStatus: k.ragStatus, variationVsLastMonth: k.variationVsLastMonth,
        })),
      zombieCandidates: snapshotData?.zombieCandidates || [],
      kpisToCreate: snapshotData?.kpisToCreate || [],
      learnings: snapshotData?.learnings || { whatWorked: '', whatDidntWork: '', debts: '' },
      decisions: (snapshotData?.decisions || []).map((d: any) => ({ text: d.text, category: d.category })),
    };

    // Orchestrate AI
    console.log(`[${requestId}] Orchestrating AI agents for QBR Pre summary...`);
    const sections = await orchestrateAgents(serviceClient, buId, agentContext, requestId);

    // Recipients: team leader
    const recipientIds = leaderAuthId ? [leaderAuthId] : [];
    if (recipientIds.length === 0) {
      console.warn(`[${requestId}] No recipients found`);
      return successResponse({ skipped: true, reason: 'no_recipients' });
    }

    const contextUrl = `/okrs/ritual-history?session=${sessionId}`;
    const metadata = {
      bu_name: buName,
      team_name: teamName,
      cycle_name: cycleName,
      current_datetime: formatDate(new Date()),
      ...sections,
      context_url: contextUrl,
    };

    // Emit notification
    console.log(`[${requestId}] Emitting QBR Pre notification to ${recipientIds.length} recipients`);
    const { error: notifyError } = await serviceClient.rpc('emit_notification_event', {
      p_event_slug: 'qbr_pre.summary',
      p_bu_id: buId,
      p_recipient_user_ids: recipientIds,
      p_actor_id: null,
      p_title: `Pré-QBR — ${teamName} — ${cycleName}`,
      p_message: `Resumo do balanço pré-QBR do time ${teamName}`,
      p_context_type: 'qbr_pre',
      p_context_id: sessionId,
      p_context_url: contextUrl,
      p_metadata: metadata,
    });

    if (notifyError) console.error(`[${requestId}] Notification emit failed:`, notifyError);

    // Mark idempotency
    await serviceClient.from('okr_wizard_sessions')
      .update({ summary_sent_at: new Date().toISOString() })
      .eq('id', sessionId);

    logRequestCompletion(ctx, 'success');
    return successResponse({ success: true, recipientCount: recipientIds.length, sessionId });

  } catch (error) {
    console.error(`[${requestId}] QBR Pre summary error:`, error);
    logRequestCompletion(ctx, 'error', error instanceof Error ? error.message : 'Unknown error');
    return errorResponse('Failed to send QBR Pre summary', 500, { requestId, error: 'QBR_PRE_SUMMARY_FAILED' });
  }
});
