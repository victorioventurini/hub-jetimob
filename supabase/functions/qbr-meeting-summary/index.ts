/**
 * qbr-meeting-summary - Orchestrates AI agents to send QBR Meeting summary email
 * 
 * Flow:
 * 1. Validates BU via middleware
 * 2. Checks idempotency via summary_sent_at
 * 3. Loads QBR Meeting session snapshot (approvals, decisions, commitments)
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

interface QbrMeetingSummaryRequest {
  cycleId: string;
  sessionId: string;
  bu_id: string;
}

interface QbrMeetingAgentContext {
  buName: string;
  cycleName: string;
  approvals: Array<{
    teamId: string;
    status: string;
    changes?: string;
    discardReason?: string;
  }>;
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
  governanceChecklist: {
    allTeamsReviewed: boolean;
    decisionsHaveOwners: boolean;
    dependenciesFormalized: boolean;
    feedbackLinkSent: boolean;
  };
}

interface QbrMeetingSections {
  opening_text: string;
  okr_approvals_summary: string;
  strategic_decisions: string;
  cross_commitments_summary: string;
  governance_status: string;
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

async function loadQbrMeetingData(
  serviceClient: any,
  sessionId: string,
  buId: string
): Promise<{
  snapshot: any;
  buName: string;
  recipientAuthIds: string[];
}> {
  // Load session + BU + area leaders/co-leaders + BU admins
  const [sessionResult, buResult, areasResult, adminsResult] = await Promise.all([
    serviceClient.from('okr_wizard_sessions').select('id, reflection_data, summary_sent_at, status').eq('id', sessionId).single(),
    serviceClient.from('bu_units').select('name').eq('id', buId).single(),
    serviceClient.from('areas').select('leader_user_id, co_leader_user_id').eq('bu_id', buId).eq('status', 'active').is('deleted_at', null),
    serviceClient.from('bu_members').select('user_id').eq('bu_id', buId).in('role_in_bu', ['admin', 'super_admin']),
  ]);

  const buName = buResult.data?.name || 'Empresa';

  // Collect profile IDs
  const profileIds = new Set<string>();
  for (const area of areasResult.data || []) {
    if (area.leader_user_id) profileIds.add(area.leader_user_id);
    if (area.co_leader_user_id) profileIds.add(area.co_leader_user_id);
  }

  // Admins already have user_id (auth)
  const adminAuthIds = (adminsResult.data || []).map((a: any) => a.user_id).filter(Boolean);

  // Resolve profile IDs → auth user IDs
  let leaderAuthIds: string[] = [];
  const profileIdArray = [...profileIds];
  if (profileIdArray.length > 0) {
    const { data: profiles } = await serviceClient
      .from('profiles').select('user_id')
      .in('id', profileIdArray)
      .not('user_id', 'is', null);
    leaderAuthIds = (profiles || []).map((p: any) => p.user_id).filter(Boolean);
  }

  const recipientAuthIds = [...new Set([...leaderAuthIds, ...adminAuthIds])];

  return {
    snapshot: sessionResult.data?.reflection_data,
    buName,
    recipientAuthIds,
  };
}

// ============================================================================
// Agent Orchestration
// ============================================================================

async function orchestrateAgents(
  serviceClient: any,
  buId: string,
  ctx: QbrMeetingAgentContext,
  requestId: string
): Promise<QbrMeetingSections> {
  const contextJson = JSON.stringify(ctx);

  const [analistaResult, facilitadorResult, revisorResult] = await Promise.allSettled([
    invokeAgentDirect(serviceClient, 'analista-kpis',
      `Contexto da Reunião de QBR (Quarterly Business Review) da empresa "${ctx.buName}":\n${contextJson}\n\nGere um resumo executivo focando em:
1. Status das aprovações de OKRs por time (aprovados, com mudanças, descartados, adiados)
2. Análise de governança (checklist)
Retorne em formato JSON com as chaves:
- okr_approvals_summary: resumo das aprovações por time (lista markdown)
- governance_status: análise do checklist de governança (parágrafo)
Linguagem executiva, objetiva.`,
      buId, requestId),

    invokeAgentDirect(serviceClient, 'facilitador-decisoes',
      `Contexto da Reunião de QBR da empresa "${ctx.buName}":\n${contextJson}\n\nConsolide decisões e compromissos cross-área.
Retorne em formato JSON com as chaves:
- strategic_decisions: decisões tomadas com responsáveis e prazos (lista markdown)
- cross_commitments_summary: compromissos cross-área formalizados (lista markdown)
Linguagem executiva e orientada a ação.`,
      buId, requestId),

    invokeAgentDirect(serviceClient, 'revisor-comunicacao',
      `Contexto: abertura e encerramento do e-mail de resumo do QBR Meeting
BU: "${ctx.buName}", Ciclo: "${ctx.cycleName}"

Crie abertura e encerramento para o e-mail de resumo da reunião de QBR.
Retorne em formato JSON com as chaves:
- opening_text: 2-3 frases contextualizando a reunião trimestral
- closing_text: 1-2 frases de encerramento com foco na execução
Linguagem executiva, sem burocracia.`,
      buId, requestId),
  ]);

  const sections: QbrMeetingSections = {
    opening_text: 'Este é o resumo da reunião de QBR.',
    okr_approvals_summary: 'Sem aprovações registradas.',
    strategic_decisions: 'Sem decisões registradas.',
    cross_commitments_summary: 'Sem compromissos cross-área.',
    governance_status: 'Checklist de governança não disponível.',
    closing_text: 'QBR concluído com sucesso.',
  };

  try {
    const content = sanitizeJsonResponse(extractOrFallback(analistaResult, '{}'));
    const json = JSON.parse(content);
    if (json.okr_approvals_summary) sections.okr_approvals_summary = json.okr_approvals_summary;
    if (json.governance_status) sections.governance_status = json.governance_status;
  } catch (e) { console.warn('Failed to parse analista response:', e); }

  try {
    const content = sanitizeJsonResponse(extractOrFallback(facilitadorResult, '{}'));
    const json = JSON.parse(content);
    if (json.strategic_decisions) sections.strategic_decisions = json.strategic_decisions;
    if (json.cross_commitments_summary) sections.cross_commitments_summary = json.cross_commitments_summary;
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
    const body: QbrMeetingSummaryRequest = await req.json();
    const { cycleId, sessionId } = body;

    if (!cycleId || !sessionId) {
      return errorResponse('Missing required fields: cycleId, sessionId', 400, { requestId, error: 'MISSING_FIELDS' });
    }

    console.log(`[${requestId}] QBR Meeting summary: cycle=${cycleId}, session=${sessionId}`);

    // Idempotency
    const { data: session } = await serviceClient
      .from('okr_wizard_sessions').select('id, summary_sent_at, status')
      .eq('id', sessionId).single();

    if (!session) return successResponse({ skipped: true, reason: 'session_not_found' });
    if (session.summary_sent_at) {
      console.log(`[${requestId}] Summary already sent at ${session.summary_sent_at}`);
      return successResponse({ skipped: true, reason: 'already_sent' });
    }

    const { snapshot, buName, recipientAuthIds } = await loadQbrMeetingData(serviceClient, sessionId, buId);
    if (!snapshot) return successResponse({ skipped: true, reason: 'no_snapshot' });
    if (recipientAuthIds.length === 0) return successResponse({ skipped: true, reason: 'no_recipients' });

    const snapshotData = snapshot?.data || snapshot;

    // Cycle name
    const { data: cycleInfo } = await serviceClient.from('cycles').select('name').eq('id', cycleId).single();
    const cycleName = cycleInfo?.name || 'Ciclo';

    const agentContext: QbrMeetingAgentContext = {
      buName,
      cycleName,
      approvals: (snapshotData?.approvals || []).map((a: any) => ({
        teamId: a.teamId, status: a.status,
        changes: a.changes ? JSON.stringify(a.changes) : undefined,
        discardReason: a.discardReason,
      })),
      decisions: (snapshotData?.decisions || []).map((d: any) => ({
        text: d.text, category: d.category,
        owner: d.owner?.name, deadline: d.deadline,
      })),
      crossCommitments: snapshotData?.crossCommitments || [],
      governanceChecklist: snapshotData?.governanceChecklist || {},
    };

    console.log(`[${requestId}] Orchestrating AI agents for QBR Meeting summary...`);
    const sections = await orchestrateAgents(serviceClient, buId, agentContext, requestId);

    const contextUrl = `/okrs/ritual-history?session=${sessionId}`;
    const metadata = {
      bu_name: buName,
      cycle_name: cycleName,
      current_datetime: formatDate(new Date()),
      ...sections,
      context_url: contextUrl,
    };

    console.log(`[${requestId}] Emitting QBR Meeting notification to ${recipientAuthIds.length} recipients`);
    const { error: notifyError } = await serviceClient.rpc('emit_notification_event', {
      p_event_slug: 'qbr_meeting.summary',
      p_bu_id: buId,
      p_recipient_user_ids: recipientAuthIds,
      p_actor_id: null,
      p_title: `QBR Meeting — ${cycleName}`,
      p_message: `Resumo da reunião de Quarterly Business Review — ${cycleName}`,
      p_context_type: 'qbr_meeting',
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
    console.error(`[${requestId}] QBR Meeting summary error:`, error);
    logRequestCompletion(ctx, 'error', error instanceof Error ? error.message : 'Unknown error');
    return errorResponse('Failed to send QBR Meeting summary', 500, { requestId, error: 'QBR_MEETING_SUMMARY_FAILED' });
  }
});
