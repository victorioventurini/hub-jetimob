/**
 * team-checkin-summary - Orchestrates AI agents to send team check-in summary email
 *
 * Modular layout:
 *  - types.ts        domain types
 *  - pace.ts         pace/status calculations
 *  - data-loader.ts  team/cycle/KR/KPI/decision loading
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
import { loadTeamData, loadSessionDecisions } from "./data-loader.ts";
import { orchestrateAgents } from "./agents.ts";
import { formatDate } from "./pace.ts";
import type { TeamCheckinSummaryRequest, AgentContextData, PendingUpdate } from "./types.ts";

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
    const body: TeamCheckinSummaryRequest = await req.json();
    const { teamId, cycleId, sessionId } = body;

    if (!teamId || !cycleId || !sessionId) {
      return errorResponse('Missing required fields: teamId, cycleId, sessionId', 400, {
        requestId,
        error: 'MISSING_FIELDS',
      });
    }

    console.log(`[${requestId}] Team checkin summary: team=${teamId}, cycle=${cycleId}, session=${sessionId}`);

    // Idempotency
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

    const [teamData, decisions] = await Promise.all([
      loadTeamData(serviceClient, teamId, cycleId, buId),
      loadSessionDecisions(serviceClient, sessionId),
    ]);

    if (teamData.members.length === 0) {
      console.warn(`[${requestId}] No team members found`);
      return successResponse({ skipped: true, reason: 'no_members' });
    }

    const pendingUpdates: PendingUpdate[] = [
      ...teamData.krsHighlight
        .filter((kr) => kr.status === 'desatualizado')
        .map((kr) => ({ entityType: 'kr' as const, title: kr.title, lastUpdated: null })),
      ...teamData.kpisRelevant
        .filter((kpi) => kpi.status === 'desatualizado')
        .map((kpi) => ({ entityType: 'kpi' as const, title: kpi.name, lastUpdated: null })),
    ];

    const agentContext: AgentContextData = {
      teamName: teamData.team.name,
      cycleName: teamData.cycle.name,
      cycleType: teamData.cycle.type,
      cycleElapsedPercent: teamData.cycleElapsedPercent,
      buName: teamData.buName,
      objectives: teamData.objectives,
      krsHighlight: teamData.krsHighlight,
      kpisRelevant: teamData.kpisRelevant,
      decisions,
      pendingUpdates,
      paceGuidance: teamData.paceGuidance,
    };

    console.log(`[${requestId}] Orchestrating AI agents (direct LLM)...`);
    const sections = await orchestrateAgents(serviceClient, buId, agentContext, requestId);

    const currentDatetime = formatDate(new Date());
    const contextUrl = `/rituals/history?session=${sessionId}`;

    const metadata = {
      team_name: teamData.team.name,
      cycle_name: teamData.cycle.name,
      bu_name: teamData.buName,
      current_datetime: currentDatetime,
      ...sections,
      context_url: contextUrl,
    };

    console.log(`[${requestId}] Emitting notification to ${teamData.members.length} recipients`);
    const { error: notifyError } = await serviceClient.rpc('emit_notification_event', {
      p_event_slug: 'team.checkin.summary',
      p_bu_id: buId,
      p_recipient_user_ids: teamData.members,
      p_actor_id: null,
      p_title: `Check-in do time ${teamData.team.name}`,
      p_message: `Resumo do check-in do ciclo ${teamData.cycle.name}`,
      p_context_type: 'team_checkin',
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
      recipientCount: teamData.members.length,
      sessionId,
    });
  } catch (error) {
    console.error(`[${requestId}] Team checkin summary error:`, error);
    logRequestCompletion(ctx, 'error', error instanceof Error ? error.message : 'Unknown error');
    return errorResponse('Failed to send team checkin summary', 500, {
      requestId,
      error: 'SUMMARY_FAILED',
    });
  }
});
