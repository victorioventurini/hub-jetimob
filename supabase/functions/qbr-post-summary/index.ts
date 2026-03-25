/**
 * qbr-post-summary - Orchestrates AI agents to send QBR Post summary email
 * 
 * Flow:
 * 1. Validates BU via middleware
 * 2. Checks idempotency via summary_sent_at
 * 3. Loads QBR Post session snapshot (promoted OKRs, decisions, minutes)
 * 4. Orchestrates 3 AI agents in parallel via direct LLM calls
 * 5. Emits notification to area leaders + co-leaders + BU admins
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

interface QbrPostSummaryRequest {
  cycleId: string;
  sessionId: string;
  bu_id: string;
}

interface QbrPostAgentContext {
  buName: string;
  cycleName: string;
  promotedOkrCount: number;
  decisions: Array<{
    text: string;
    category: string;
    owner?: string;
    deadline?: string;
  }>;
  crossCommitments: Array<{
    fromTeamId: string;
    toTeamId: string;
    description: string;
    deadline: string;
  }>;
  executiveMinutes: string;
  governanceChecklist: {
    strategicFocusClear: boolean;
    decisionsHaveOwners: boolean;
    dependenciesFormalized: boolean;
    nextCycleOkrsActive: boolean;
  };
  followUpCadence: {
    mbrReviewScheduled: boolean;
    followUpMeetingDate?: string;
  };
}

interface QbrPostSections {
  opening_text: string;
  promoted_okrs_summary: string;
  decisions_and_commitments: string;
  executive_minutes_review: string;
  next_steps: string;
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

async function loadQbrPostData(
  serviceClient: any,
  sessionId: string,
  buId: string
): Promise<{
  snapshot: any;
  buName: string;
  recipientAuthIds: string[];
}> {
  const [sessionResult, buResult, areasResult, adminsResult] = await Promise.all([
    serviceClient.from('okr_wizard_sessions').select('id, reflection_data, summary_sent_at, status').eq('id', sessionId).single(),
    serviceClient.from('bu_units').select('name').eq('id', buId).single(),
    serviceClient.from('areas').select('leader_user_id, co_leader_user_id').eq('bu_id', buId).eq('status', 'active').is('deleted_at', null),
    serviceClient.from('bu_members').select('user_id').eq('bu_id', buId).in('role_in_bu', ['admin', 'super_admin']),
  ]);

  const buName = buResult.data?.name || 'Empresa';

  const profileIds = new Set<string>();
  for (const area of areasResult.data || []) {
    if (area.leader_user_id) profileIds.add(area.leader_user_id);
    if (area.co_leader_user_id) profileIds.add(area.co_leader_user_id);
  }

  const adminAuthIds = (adminsResult.data || []).map((a: any) => a.user_id).filter(Boolean);

  let leaderAuthIds: string[] = [];
  const profileIdArray = [...profileIds];
  if (profileIdArray.length > 0) {
    const { data: profiles } = await serviceClient
      .from('profiles').select('user_id')
      .in('id', profileIdArray)
      .not('user_id', 'is', null);
    leaderAuthIds = (profiles || []).map((p: any) => p.user_id).filter(Boolean);
  }

  return {
    snapshot: sessionResult.data?.reflection_data,
    buName,
    recipientAuthIds: [...new Set([...leaderAuthIds, ...adminAuthIds])],
  };
}

// ============================================================================
// Agent Orchestration
// ============================================================================

async function orchestrateAgents(
  serviceClient: any,
  buId: string,
  ctx: QbrPostAgentContext,
  requestId: string
): Promise<QbrPostSections> {
  const contextJson = JSON.stringify(ctx);

  const [analistaResult, facilitadorResult, revisorResult] = await Promise.allSettled([
    invokeAgentDirect(serviceClient, 'analista-kpis',
      `Contexto do encerramento Pós-QBR da empresa "${ctx.buName}":\n${contextJson}\n\nGere um resumo executivo focando em:
1. OKRs promovidos para o novo ciclo (${ctx.promotedOkrCount} OKRs)
2. Status da governança (checklist de encerramento)
Retorne em formato JSON com as chaves:
- promoted_okrs_summary: resumo dos OKRs promovidos e status geral (parágrafo)
- next_steps: próximos passos baseados no follow-up definido (lista markdown)
Linguagem executiva, objetiva.`,
      buId, requestId),

    invokeAgentDirect(serviceClient, 'facilitador-decisoes',
      `Contexto do encerramento Pós-QBR da empresa "${ctx.buName}":\n${contextJson}\n\nConsolide decisões, compromissos e ata executiva.
Retorne em formato JSON com as chaves:
- decisions_and_commitments: decisões e compromissos cross-área (lista markdown)
- executive_minutes_review: resumo conciso da ata executiva (parágrafo)
Linguagem executiva e orientada a ação.`,
      buId, requestId),

    invokeAgentDirect(serviceClient, 'revisor-comunicacao',
      `Contexto: abertura e encerramento do e-mail de resumo do encerramento QBR
BU: "${ctx.buName}", Ciclo: "${ctx.cycleName}"

Crie abertura e encerramento para o e-mail de encerramento do QBR.
Retorne em formato JSON com as chaves:
- opening_text: 2-3 frases contextualizando o encerramento do ciclo QBR
- closing_text: 1-2 frases de encerramento orientadas à execução do novo ciclo
Linguagem executiva, sem burocracia.`,
      buId, requestId),
  ]);

  const sections: QbrPostSections = {
    opening_text: 'Este é o resumo do encerramento do QBR.',
    promoted_okrs_summary: 'Sem OKRs promovidos.',
    decisions_and_commitments: 'Sem decisões registradas.',
    executive_minutes_review: 'Ata executiva não disponível.',
    next_steps: '- Aguardar início do novo ciclo',
    closing_text: 'QBR encerrado com sucesso.',
  };

  try {
    const content = sanitizeJsonResponse(extractOrFallback(analistaResult, '{}'));
    const json = JSON.parse(content);
    if (json.promoted_okrs_summary) sections.promoted_okrs_summary = json.promoted_okrs_summary;
    if (json.next_steps) sections.next_steps = json.next_steps;
  } catch (e) { console.warn('Failed to parse analista response:', e); }

  try {
    const content = sanitizeJsonResponse(extractOrFallback(facilitadorResult, '{}'));
    const json = JSON.parse(content);
    if (json.decisions_and_commitments) sections.decisions_and_commitments = json.decisions_and_commitments;
    if (json.executive_minutes_review) sections.executive_minutes_review = json.executive_minutes_review;
  } catch (e) { console.warn('Failed to parse facilitador response:', e); }

  try {
    const content = sanitizeJsonResponse(extractOrFallback(revisorResult, '{}'));
    const json = JSON.parse(content);
    if (json.opening_text) sections.opening_text = json.opening_text;
    if (json.closing_text) sections.closing_text = json.closing_text;
  } catch (e) { console.warn('Failed to parse revisor response:', e); }

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
    const body: QbrPostSummaryRequest = await req.json();
    const { cycleId, sessionId } = body;

    if (!cycleId || !sessionId) {
      return errorResponse('Missing required fields: cycleId, sessionId', 400, { requestId, error: 'MISSING_FIELDS' });
    }

    console.log(`[${requestId}] QBR Post summary: cycle=${cycleId}, session=${sessionId}`);

    // Idempotency
    const { data: session } = await serviceClient
      .from('okr_wizard_sessions').select('id, summary_sent_at, status')
      .eq('id', sessionId).single();

    if (!session) return successResponse({ skipped: true, reason: 'session_not_found' });
    if (session.summary_sent_at) {
      console.log(`[${requestId}] Summary already sent at ${session.summary_sent_at}`);
      return successResponse({ skipped: true, reason: 'already_sent' });
    }

    const { snapshot, buName, recipientAuthIds } = await loadQbrPostData(serviceClient, sessionId, buId);
    if (!snapshot) return successResponse({ skipped: true, reason: 'no_snapshot' });
    if (recipientAuthIds.length === 0) return successResponse({ skipped: true, reason: 'no_recipients' });

    const snapshotData = snapshot?.data || snapshot;

    const { data: cycleInfo } = await serviceClient.from('cycles').select('name').eq('id', cycleId).single();
    const cycleName = cycleInfo?.name || 'Ciclo';

    const agentContext: QbrPostAgentContext = {
      buName,
      cycleName,
      promotedOkrCount: (snapshotData?.promotedOkrIds || []).length,
      decisions: (snapshotData?.decisions || []).map((d: any) => ({
        text: d.text, category: d.category,
        owner: d.owner?.name, deadline: d.deadline,
      })),
      crossCommitments: snapshotData?.crossCommitments || [],
      executiveMinutes: snapshotData?.executiveMinutes || '',
      governanceChecklist: snapshotData?.governanceChecklist || {},
      followUpCadence: snapshotData?.followUpCadence || {},
    };

    console.log(`[${requestId}] Orchestrating AI agents for QBR Post summary...`);
    const sections = await orchestrateAgents(serviceClient, buId, agentContext, requestId);

    const contextUrl = `/okrs/ritual-history?session=${sessionId}`;
    const metadata = {
      bu_name: buName,
      cycle_name: cycleName,
      current_datetime: formatDate(new Date()),
      ...sections,
      context_url: contextUrl,
    };

    console.log(`[${requestId}] Emitting QBR Post notification to ${recipientAuthIds.length} recipients`);
    const { error: notifyError } = await serviceClient.rpc('emit_notification_event', {
      p_event_slug: 'qbr_post.summary',
      p_bu_id: buId,
      p_recipient_user_ids: recipientAuthIds,
      p_actor_id: null,
      p_title: `Encerramento QBR — ${cycleName}`,
      p_message: `Resumo do encerramento do Quarterly Business Review — ${cycleName}`,
      p_context_type: 'qbr_post',
      p_context_id: sessionId,
      p_context_url: contextUrl,
      p_metadata: metadata,
    });

    if (notifyError) console.error(`[${requestId}] Notification emit failed:`, notifyError);

    await serviceClient.from('okr_wizard_sessions')
      .update({ summary_sent_at: new Date().toISOString() })
      .eq('id', sessionId);

    logRequestCompletion(ctx, 'success');
    return successResponse({ success: true, recipientCount: recipientAuthIds.length, sessionId });

  } catch (error) {
    console.error(`[${requestId}] QBR Post summary error:`, error);
    logRequestCompletion(ctx, 'error', error instanceof Error ? error.message : 'Unknown error');
    return errorResponse('Failed to send QBR Post summary', 500, { requestId, error: 'QBR_POST_SUMMARY_FAILED' });
  }
});
