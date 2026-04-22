/**
 * analysis-share — Share an analysis report with BU users via outbox
 *
 * Body: { report_id, recipient_profile_ids: string[], bu_id }
 * - Resolves auth.users.id via profiles.user_id (IDENTITY_CONVENTION)
 * - Emits notification via emit_notification_event RPC (event 'analysis.shared')
 * - Inserts into analysis_share_log
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  withMiddleware,
  logRequestCompletion,
  type RequestContext,
} from "../_shared/middleware.ts";
import { successResponse, errorResponse } from "../_shared/response.ts";

interface ShareRequest {
  bu_id: string;
  report_id: string;
  recipient_profile_ids: string[];
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
  const { requestId, serviceClient, user, buId } = ctx;

  try {
    const body: ShareRequest = await req.json();
    const { report_id, recipient_profile_ids } = body;

    if (!report_id || !Array.isArray(recipient_profile_ids) || recipient_profile_ids.length === 0) {
      return errorResponse("report_id and recipient_profile_ids are required", 400, {
        requestId,
        error: "MISSING_FIELDS",
      });
    }

    // Resolve sharer profile id
    const { data: sharerProfile } = await serviceClient
      .from("profiles")
      .select("id, display_name")
      .eq("user_id", user!.id)
      .maybeSingle();

    if (!sharerProfile?.id) {
      return errorResponse("Sharer profile not found", 403, { requestId, error: "PROFILE_NOT_FOUND" });
    }

    // Load report
    const { data: report, error: repErr } = await serviceClient
      .from("analysis_reports")
      .select("id, bu_id, title, premise")
      .eq("id", report_id)
      .eq("bu_id", buId)
      .is("deleted_at", null)
      .maybeSingle();

    if (repErr || !report) {
      return errorResponse("Report not found", 404, { requestId, error: "REPORT_NOT_FOUND" });
    }

    // Resolve recipients to auth.users.id (notifications use auth user ids)
    const { data: recipients, error: recErr } = await serviceClient
      .from("profiles")
      .select("id, user_id, display_name")
      .in("id", recipient_profile_ids)
      .not("user_id", "is", null);

    if (recErr) {
      console.error(`[${requestId}] recipient lookup failed:`, recErr);
      return errorResponse("Failed to resolve recipients", 500, { requestId, error: "RECIPIENT_LOOKUP_FAILED" });
    }

    const authIds = (recipients || []).map((p: { user_id: string | null }) => p.user_id).filter(Boolean);
    if (authIds.length === 0) {
      return errorResponse("No valid recipients with auth account", 400, { requestId, error: "NO_VALID_RECIPIENTS" });
    }

    const reportTitle = report.title || report.premise.slice(0, 80);
    const contextUrl = `/analysis/${report.id}`;

    // Emit notification (uses canonical RPC + outbox)
    const { error: notifErr } = await serviceClient.rpc("emit_notification_event", {
      p_event_slug: "analysis.shared",
      p_bu_id: buId,
      p_recipient_user_ids: authIds,
      p_actor_id: user!.id,
      p_title: `Análise compartilhada: ${reportTitle}`,
      p_message: `${sharerProfile.display_name || "Alguém"} compartilhou uma análise estratégica com você.`,
      p_context_type: "analysis_report",
      p_context_id: report.id,
      p_context_url: contextUrl,
      p_metadata: {
        report_title: reportTitle,
        report_url: contextUrl,
        sharer_name: sharerProfile.display_name,
        current_datetime: new Date().toLocaleString("pt-BR"),
      },
    });

    if (notifErr) {
      console.error(`[${requestId}] emit_notification_event failed:`, notifErr);
    }

    // Log shares
    const logRows = (recipients || []).map((p: { id: string }) => ({
      bu_id: buId,
      report_id: report.id,
      recipient_profile_id: p.id,
      shared_by: sharerProfile.id,
    }));

    const { error: logErr } = await serviceClient.from("analysis_share_log").insert(logRows);
    if (logErr) console.error(`[${requestId}] share log insert failed:`, logErr);

    logRequestCompletion(ctx, "success", `recipients=${authIds.length}`);
    return successResponse({ success: true, recipientCount: authIds.length });
  } catch (error) {
    console.error(`[${requestId}] analysis-share error:`, error);
    logRequestCompletion(ctx, "error", error instanceof Error ? error.message : "Unknown");
    return errorResponse("Failed to share analysis", 500, { requestId, error: "SHARE_FAILED" });
  }
});
