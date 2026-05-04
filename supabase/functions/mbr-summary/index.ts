/**
 * mbr-summary - Orchestrates AI agents to send MBR summary email
 *
 * Modular layout:
 *  - types.ts        domain types
 *  - data-loader.ts  session snapshot + leaders loader
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
import { loadMbrSessionData } from "./data-loader.ts";
import { orchestrateAgents } from "./agents.ts";
import type { MbrAgentContext, MbrSummaryRequest } from "./types.ts";

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
    const body: MbrSummaryRequest = await req.json();
    const { cycleId, sessionId } = body;

    if (!cycleId || !sessionId) {
      return errorResponse('Missing required fields: cycleId, sessionId', 400, {
        requestId,
        error: 'MISSING_FIELDS',
      });
    }

    console.log(`[${requestId}] MBR summary: cycle=${cycleId}, session=${sessionId}`);

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

    const { snapshot, buName, leaderAuthIds } = await loadMbrSessionData(serviceClient, sessionId, buId);

    if (!snapshot) {
      console.warn(`[${requestId}] No snapshot found for session ${sessionId}`);
      return successResponse({ skipped: true, reason: 'no_snapshot' });
    }
    if (leaderAuthIds.length === 0) {
      console.warn(`[${requestId}] No team leaders found`);
      return successResponse({ skipped: true, reason: 'no_leaders' });
    }

    const snapshotObj = snapshot as { data?: unknown } | null;
    const snapshotData = (snapshotObj?.data ?? snapshot) as {
      kpiSnapshots?: Array<Record<string, unknown>>;
      orgOkrSnapshots?: Array<Record<string, unknown>>;
      decisions?: Array<Record<string, unknown>>;
      checklist?: Record<string, unknown>;
      referenceMonth?: string;
      panoramaCuration?: {
        summary?: string;
        origin?: 'ai-curated' | 'manual';
        state?: 'draft' | 'reviewed' | 'approved';
      } | null;
    } | null;

    const kpiSnapshots = snapshotData?.kpiSnapshots || [];
    const orgOkrSnapshots = snapshotData?.orgOkrSnapshots || [];
    const decisions = snapshotData?.decisions || [];
    const checklist = snapshotData?.checklist || {};
    const referenceMonth = snapshotData?.referenceMonth || '';
    const curatedOpening = (snapshotData?.panoramaCuration?.summary || '').trim();

    const agentContext: MbrAgentContext = {
      buName,
      referenceMonth,
      criticalKpis: kpiSnapshots
        .filter((k) => k.ragStatus === 'red' || k.ragStatus === 'yellow')
        .map((k) => {
          const curr = (k.currentValue ?? null) as number | null;
          const prev = (k.previousValue ?? null) as number | null;
          const legacyVar = (k as { variationVsLastMonth?: number | null }).variationVsLastMonth;
          const derivedVar =
            curr != null && prev != null && prev !== 0 ? ((curr - prev) / prev) * 100 : null;
          return {
            name: k.name as string,
            currentValue: curr,
            target: (k.target ?? null) as number | null,
            ragStatus: k.ragStatus as string,
            variationVsLastMonth: legacyVar ?? derivedVar,
            impactAssessment: k.impactAssessment as string | undefined,
          };
        }),
      orgOkrsSummary: orgOkrSnapshots.map((o) => ({
        title: o.title as string,
        progress: o.progress as number,
        trend: (o.trend ?? '') as string,
        remainsStrategicPriority: (o.remainsStrategicPriority ?? false) as boolean,
      })),
      decisions: decisions.map((d) => ({
        text: d.text as string,
        category: d.category as string,
      })),
      checklist: checklist as MbrAgentContext['checklist'],
    };

    console.log(`[${requestId}] Orchestrating AI agents for MBR summary...`);
    const sections = await orchestrateAgents(serviceClient, buId, agentContext, requestId);

    if (curatedOpening) {
      console.log(`[${requestId}] Using curated executive opening from snapshot (${curatedOpening.length} chars)`);
      sections.opening_text = curatedOpening;
    }

    const currentDatetime = formatDate(new Date());
    const contextUrl = `/rituals/history?session=${sessionId}`;

    const metadata = {
      bu_name: buName,
      reference_month: referenceMonth,
      current_datetime: currentDatetime,
      ...sections,
      context_url: contextUrl,
    };

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

    if (notifyError) console.error(`[${requestId}] Notification emit failed:`, notifyError);

    const { error: updateError } = await serviceClient
      .from('okr_wizard_sessions')
      .update({ summary_sent_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (updateError) console.error(`[${requestId}] Failed to mark summary sent:`, updateError);

    logRequestCompletion(ctx, 'success');
    return successResponse({
      success: true,
      recipientCount: leaderAuthIds.length,
      sessionId,
    });
  } catch (error) {
    console.error(`[${requestId}] MBR summary error:`, error);
    logRequestCompletion(ctx, 'error', error instanceof Error ? error.message : 'Unknown error');
    return errorResponse('Failed to send MBR summary', 500, {
      requestId,
      error: 'MBR_SUMMARY_FAILED',
    });
  }
});
