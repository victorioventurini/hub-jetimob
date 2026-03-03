/**
 * collaborator-checkin-summary - Orchestrates AI agents to send collaborator check-in summary email
 * 
 * Flow:
 * 1. Validates BU via middleware (no auth required for admin re-trigger)
 * 2. Checks idempotency via summary_sent_at
 * 3. Loads collaborator session snapshot (KRs, KPIs, reflection)
 * 4. Orchestrates 2 AI agents in parallel via direct LLM calls
 * 5. Emits notification to the collaborator + their team leader
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

interface CollaboratorSummaryRequest {
  sessionId: string;
  bu_id: string;
}

interface CollaboratorAgentContext {
  buName: string;
  userName: string;
  cycleName: string;
  krResults: Array<{
    title: string;
    previousValue: number | null;
    newValue: number | null;
    targetValue: number | null;
    progress: number;
    comment: string;
  }>;
  kpiResults: Array<{
    name: string;
    value: number | null;
    target: number | null;
  }>;
  reflection: {
    wins?: string;
    blockers?: string;
    learnings?: string;
    needsHelp?: string;
  };
}

interface CollaboratorSections {
  opening_text: string;
  kr_summary: string;
  kpi_summary: string;
  reflection_insights: string;
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
// Agent Invocation — Direct LLM
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

async function loadCollaboratorSessionData(
  serviceClient: any,
  sessionId: string,
  buId: string
): Promise<{
  snapshot: any;
  buName: string;
  userName: string;
  cycleName: string;
  recipientAuthIds: string[];
}> {
  // Load session
  const { data: session, error: sessionError } = await serviceClient
    .from('okr_wizard_sessions')
    .select('id, reflection_data, summary_sent_at, status, started_by, cycle_id')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  // Load BU name, user profile, and cycle in parallel
  const [buResult, profileResult, cycleResult] = await Promise.all([
    serviceClient
      .from('bu_units')
      .select('name')
      .eq('id', buId)
      .single(),
    serviceClient
      .from('profiles')
      .select('id, user_id, display_name, team_id')
      .eq('id', session.started_by)
      .single(),
    session.cycle_id
      ? serviceClient
          .from('cycles')
          .select('name')
          .eq('id', session.cycle_id)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  const buName = buResult.data?.name || 'Empresa';
  const profile = profileResult.data;
  const userName = profile?.display_name || 'Colaborador';
  const cycleName = cycleResult.data?.name || 'Ciclo';

  // Recipients: collaborator themselves + their team leader
  let recipientAuthIds: string[] = [];

  // Add the collaborator
  if (profile?.user_id) {
    recipientAuthIds.push(profile.user_id);
  }

  // Add team leader
  if (profile?.team_id) {
    const { data: team } = await serviceClient
      .from('teams')
      .select('leader_user_id')
      .eq('id', profile.team_id)
      .single();

    if (team?.leader_user_id) {
      const { data: leaderProfile } = await serviceClient
        .from('profiles')
        .select('user_id')
        .eq('id', team.leader_user_id)
        .single();

      if (leaderProfile?.user_id) {
        recipientAuthIds.push(leaderProfile.user_id);
      }
    }
  }

  // Deduplicate
  recipientAuthIds = [...new Set(recipientAuthIds)];

  return {
    snapshot: session.reflection_data,
    buName,
    userName,
    cycleName,
    recipientAuthIds,
  };
}

// ============================================================================
// Agent Orchestration
// ============================================================================

async function orchestrateAgents(
  serviceClient: any,
  buId: string,
  agentContext: CollaboratorAgentContext,
  requestId: string
): Promise<CollaboratorSections> {
  const contextJson = JSON.stringify(agentContext);

  const [analistaResult, revisorResult] = await Promise.allSettled([
    // Analista de KPIs — KR + KPI summary
    invokeAgentDirect(serviceClient, 'analista-kpis',
      `Contexto do check-in individual do colaborador ${agentContext.userName}:\n${contextJson}\n\nGere um resumo do check-in focando em:
1. Progresso dos KRs (destaques positivos e pontos de atenção)
2. Indicadores KPIs relevantes
3. Reflexões e aprendizados do colaborador
Retorne em formato JSON com as chaves:
- kr_summary: resumo dos KRs atualizados (lista markdown, 2-4 itens)
- kpi_summary: indicadores relevantes (lista markdown, se houver)
- reflection_insights: insights das reflexões do colaborador (2-3 frases)
Tom construtivo e encorajador. Foque no progresso, não em críticas.`,
      buId, requestId),

    // Revisor de Comunicação — Abertura e encerramento
    invokeAgentDirect(serviceClient, 'revisor-comunicacao',
      `Contexto: abertura e encerramento do e-mail de check-in individual
Colaborador: ${agentContext.userName}, Ciclo: ${agentContext.cycleName}, BU: ${agentContext.buName}

Crie abertura e encerramento para o e-mail de resumo do check-in individual.
Retorne em formato JSON com as chaves:
- opening_text: 2-3 frases de abertura contextualizando a conclusão do check-in semanal
- closing_text: 1-2 frases de encerramento com tom positivo e motivacional
Linguagem humana, sem burocracia. Personalize com o nome "{{user_name}}".`,
      buId, requestId),
  ]);

  let sections: CollaboratorSections = {
    opening_text: 'Este é o resumo do seu check-in semanal.',
    kr_summary: 'Sem KRs atualizados neste check-in.',
    kpi_summary: '',
    reflection_insights: '',
    closing_text: 'Continue com o bom trabalho!',
  };

  // Parse Analista
  try {
    const content = sanitizeJsonResponse(extractOrFallback(analistaResult, '{}'));
    const json = JSON.parse(content);
    if (json.kr_summary) sections.kr_summary = json.kr_summary;
    if (json.kpi_summary) sections.kpi_summary = json.kpi_summary;
    if (json.reflection_insights) sections.reflection_insights = json.reflection_insights;
  } catch (e) {
    console.warn('Failed to parse analista response:', e);
    const raw = extractOrFallback(analistaResult, '');
    if (raw && !raw.startsWith('{')) sections.kr_summary = raw;
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
    const body: CollaboratorSummaryRequest = await req.json();
    const { sessionId } = body;

    if (!sessionId) {
      return errorResponse('Missing required field: sessionId', 400, {
        requestId,
        error: 'MISSING_FIELDS',
      });
    }

    console.log(`[${requestId}] Collaborator checkin summary: session=${sessionId}`);

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

    // Load data
    const { snapshot, buName, userName, cycleName, recipientAuthIds } = 
      await loadCollaboratorSessionData(serviceClient, sessionId, buId);

    if (!snapshot) {
      console.warn(`[${requestId}] No snapshot found for session ${sessionId}`);
      return successResponse({ skipped: true, reason: 'no_snapshot' });
    }

    if (recipientAuthIds.length === 0) {
      console.warn(`[${requestId}] No recipients found`);
      return successResponse({ skipped: true, reason: 'no_recipients' });
    }

    // Extract snapshot data
    const snapshotData = (snapshot as any)?.data || snapshot;

    // Build agent context
    const agentContext: CollaboratorAgentContext = {
      buName,
      userName,
      cycleName,
      krResults: (snapshotData?.results || []).map((r: any) => ({
        title: r.krTitle || r.title || '',
        previousValue: r.previousValue ?? null,
        newValue: r.newValue ?? null,
        targetValue: r.targetValue ?? null,
        progress: r.progress ?? 0,
        comment: r.comment || '',
      })),
      kpiResults: (snapshotData?.kpiResults || []).map((k: any) => ({
        name: k.name || k.kpiName || '',
        value: k.value ?? null,
        target: k.target ?? null,
      })),
      reflection: snapshotData?.reflection || {},
    };

    // Orchestrate AI agents
    console.log(`[${requestId}] Orchestrating AI agents for collaborator summary...`);
    const sections = await orchestrateAgents(serviceClient, buId, agentContext, requestId);

    // Build notification metadata
    const currentDatetime = formatDate(new Date());
    const contextUrl = `/okrs/ritual-history?session=${sessionId}`;

    const metadata = {
      bu_name: buName,
      user_name: userName,
      cycle_name: cycleName,
      current_datetime: currentDatetime,
      opening_text: sections.opening_text,
      kr_summary: sections.kr_summary,
      kpi_summary: sections.kpi_summary,
      reflection_insights: sections.reflection_insights,
      closing_text: sections.closing_text,
      context_url: contextUrl,
    };

    // Emit notification
    console.log(`[${requestId}] Emitting collaborator notification to ${recipientAuthIds.length} recipients`);
    const { error: notifyError } = await serviceClient.rpc('emit_notification_event', {
      p_event_slug: 'collaborator.checkin.summary',
      p_bu_id: buId,
      p_recipient_user_ids: recipientAuthIds,
      p_actor_id: null,
      p_title: `Check-in de ${userName}`,
      p_message: `Resumo do check-in semanal — ${cycleName}`,
      p_context_type: 'collaborator_checkin',
      p_context_id: sessionId,
      p_context_url: contextUrl,
      p_metadata: metadata,
    });

    if (notifyError) {
      console.error(`[${requestId}] Notification emit failed:`, notifyError);
    }

    // Mark session as summary sent
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
      recipientCount: recipientAuthIds.length,
      sessionId,
    });

  } catch (error) {
    console.error(`[${requestId}] Collaborator checkin summary error:`, error);
    logRequestCompletion(ctx, 'error', error instanceof Error ? error.message : 'Unknown error');

    return errorResponse(
      'Failed to send collaborator checkin summary',
      500,
      { requestId, error: 'COLLABORATOR_SUMMARY_FAILED' }
    );
  }
});
