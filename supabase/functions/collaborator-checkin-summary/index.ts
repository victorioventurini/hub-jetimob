/**
 * collaborator-checkin-summary - Orchestrates AI agents to send collaborator check-in summary email
 *
 * Modular layout:
 *  - types.ts        domain types
 *  - data-loader.ts  session + recipients + entity name resolution
 *  - agents.ts       AI agent orchestration
 *  - index.ts        request handler + idempotency + notification
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  withMiddleware,
  logRequestCompletion,
  type RequestContext,
} from "../_shared/middleware.ts";
import { successResponse, errorResponse } from "../_shared/response.ts";
import { loadCollaboratorSessionData, resolveEntityNames } from "./data-loader.ts";
import { orchestrateAgents } from "./agents.ts";
import type { CollaboratorAgentContext, CollaboratorSummaryRequest } from "./types.ts";

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

serve(async (req) => {
  const mw = await withMiddleware(req, {
    requireAuth: false,
    requireBu: true,
    validateBuAccess: false,
    logRequest: true,
  });

  if (!mw.success) return mw.error!;

  const ctx = mw.context as RequestContext;
  const { requestId, serviceClient } = ctx;
  const buId = ctx.buId!;

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

    const snapshotObj = snapshot as { data?: unknown } | null;
    const snapshotData = (snapshotObj?.data ?? snapshot) as {
      results?: Array<Record<string, unknown>>;
      kpiResults?: Array<Record<string, unknown>>;
      reflection?: Record<string, unknown>;
    } | null;

    const rawResults = snapshotData?.results || [];
    const rawKpiResults = snapshotData?.kpiResults || [];
    const krIds = rawResults.map((r) => r.krId as string | undefined).filter((v): v is string => Boolean(v));
    const kpiIds = rawKpiResults.map((k) => k.kpiId as string | undefined).filter((v): v is string => Boolean(v));

    const { krTitleById, kpiNameById } = await resolveEntityNames(serviceClient, krIds, kpiIds);

    const agentContext: CollaboratorAgentContext = {
      buName,
      userName,
      cycleName,
      krResults: rawResults.map((r) => ({
        title:
          (r.krId && krTitleById.get(r.krId as string)) ||
          (r.krTitle as string) ||
          (r.title as string) ||
          '(KR removido)',
        previousValue: (r.previousValue as number | null) ?? null,
        newValue: (r.newValue as number | null) ?? null,
        targetValue: (r.targetValue as number | null) ?? null,
        progress: (r.progress as number | null) ?? 0,
        comment: (r.comment as string) || '',
      })),
      kpiResults: rawKpiResults.map((k) => ({
        name:
          (k.kpiId && kpiNameById.get(k.kpiId as string)) ||
          (k.name as string) ||
          (k.kpiName as string) ||
          '(KPI removido)',
        value: (k.value as number | null) ?? null,
        target: (k.target as number | null) ?? null,
      })),
      reflection: (snapshotData?.reflection || {}) as CollaboratorAgentContext['reflection'],
    };

    console.log(`[${requestId}] Orchestrating AI agents for collaborator summary...`);
    const sections = await orchestrateAgents(serviceClient, buId, agentContext, requestId);

    const currentDatetime = formatDate(new Date());
    const contextUrl = `/rituals/history?session=${sessionId}`;

    const metadata = {
      bu_name: buName,
      user_name: userName,
      cycle_name: cycleName,
      current_datetime: currentDatetime,
      ...sections,
      context_url: contextUrl,
    };

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

    if (notifyError) console.error(`[${requestId}] Notification emit failed:`, notifyError);

    const { error: updateError } = await serviceClient
      .from('okr_wizard_sessions')
      .update({ summary_sent_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (updateError) console.error(`[${requestId}] Failed to mark summary sent:`, updateError);

    logRequestCompletion(ctx, 'success');
    return successResponse({
      success: true,
      recipientCount: recipientAuthIds.length,
      sessionId,
    });
  } catch (error) {
    console.error(`[${requestId}] Collaborator checkin summary error:`, error);
    logRequestCompletion(ctx, 'error', error instanceof Error ? error.message : 'Unknown error');
    return errorResponse('Failed to send collaborator checkin summary', 500, {
      requestId,
      error: 'COLLABORATOR_SUMMARY_FAILED',
    });
  }
});
