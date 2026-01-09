import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EvaluationResult {
  alerts_created: number;
  alerts_resolved: number;
  details: unknown[];
}

interface HealthAlert {
  id: string;
  bu_id: string;
  alert_type: string;
  severity: string;
  detected_at: string;
  metadata: Record<string, unknown>;
  is_active: boolean;
}

/**
 * Edge Function: evaluate-notification-health
 * 
 * Evaluates health metrics for the notification system and creates/resolves alerts.
 * Designed to be called periodically (e.g., every 5 minutes via cron).
 * 
 * Features:
 * - Idempotent: safe to run multiple times
 * - Creates alerts for: backlog, high failure rate, channel down, mandatory event disabled
 * - Auto-resolves alerts when conditions no longer apply
 * - Notifies admins for CRITICAL alerts via in_app channel
 */
const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const correlationId = crypto.randomUUID();
  console.log(`[Health] Starting evaluation correlation_id=${correlationId}`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Call the SECURITY DEFINER function to evaluate health
    const { data: result, error: evalError } = await supabase
      .rpc("evaluate_notification_health");

    if (evalError) {
      throw new Error(`Health evaluation failed: ${evalError.message}`);
    }

    const evalResult = (result as EvaluationResult[]) || [];
    const summary = evalResult[0] || { alerts_created: 0, alerts_resolved: 0, details: [] };

    console.log(`[Health] Evaluation complete: created=${summary.alerts_created}, resolved=${summary.alerts_resolved}`);

    // If any CRITICAL alerts were created, notify admins
    if (summary.alerts_created > 0) {
      await notifyCriticalAlerts(supabase, correlationId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        correlation_id: correlationId,
        alerts_created: summary.alerts_created,
        alerts_resolved: summary.alerts_resolved,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Health] Error: ${errorMessage}`);

    return new Response(
      JSON.stringify({
        success: false,
        correlation_id: correlationId,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

/**
 * Notify admins about critical alerts via in_app notifications
 */
// deno-lint-ignore no-explicit-any
async function notifyCriticalAlerts(
  supabase: any,
  correlationId: string
): Promise<void> {
  // Get recently created CRITICAL alerts (created in last 5 minutes to avoid duplicates)
  const { data: criticalAlerts, error: alertsError } = await supabase
    .from("notification_health_alerts")
    .select("id, bu_id, alert_type, severity, metadata")
    .eq("is_active", true)
    .eq("severity", "critical")
    .gte("detected_at", new Date(Date.now() - 5 * 60 * 1000).toISOString());

  if (alertsError || !criticalAlerts?.length) {
    return;
  }

  console.log(`[Health] Found ${criticalAlerts.length} critical alerts to notify`);

  for (const alert of criticalAlerts as HealthAlert[]) {
    const buId = alert.bu_id;
    const alertType = alert.alert_type;
    const metadata = alert.metadata || {};

    // Get admin users for this BU
    const { data: adminMemberships, error: membersError } = await supabase
      .from("bu_user_memberships")
      .select("user_id")
      .eq("bu_id", buId)
      .in("role_in_bu", ["admin", "super_admin"]);

    if (membersError || !adminMemberships?.length) {
      console.warn(`[Health] No admins found for BU ${buId}`);
      continue;
    }

    // Build notification message
    const { title, message } = buildAlertNotificationMessage(alertType, metadata);

    // Create in_app notifications for each admin
    for (const membership of adminMemberships as { user_id: string }[]) {
      const userId = membership.user_id;
      const dedupeKey = `health_alert_${alert.id}_${userId}`;

      // Check if notification already sent (idempotency)
      const { data: existing } = await supabase
        .from("notification_outbox")
        .select("id")
        .eq("dedupe_key", dedupeKey)
        .maybeSingle();

      if (existing) {
        continue; // Already notified
      }

      // Create outbox entry for in_app notification
      const { error: outboxError } = await supabase
        .from("notification_outbox")
        .insert({
          bu_id: buId,
          user_id: userId,
          event_slug: "core.health.alert",
          channel_slug: "in_app",
          dedupe_key: dedupeKey,
          payload: {
            title,
            message,
            severity: "critical",
            context_type: "health_alert",
            context_id: alert.id,
            context_url: `/hub/notifications?tab=diagnostics`,
            metadata: {
              alert_type: alertType,
              correlation_id: correlationId,
            },
          },
          status: "pending",
        });

      if (outboxError) {
        console.error(`[Health] Failed to create notification for user ${userId}: ${outboxError.message}`);
      } else {
        console.log(`[Health] Created notification for admin user_id=${userId.slice(0, 8)}...`);
      }
    }
  }
}

/**
 * Build user-friendly notification message for alert types
 */
function buildAlertNotificationMessage(
  alertType: string,
  metadata: Record<string, unknown>
): { title: string; message: string } {
  switch (alertType) {
    case "outbox_backlog":
      return {
        title: "⚠️ Fila de Notificações Acumulada",
        message: `Existem ${metadata.pending_count || "muitas"} notificações pendentes há mais de ${Math.round(Number(metadata.oldest_pending_minutes) || 10)} minutos. Verifique o processador de outbox.`,
      };

    case "high_failure_rate":
      return {
        title: "🔴 Alta Taxa de Falhas",
        message: `O canal ${metadata.channel_slug || "desconhecido"} está com ${metadata.failure_rate_pct || ">10"}% de falhas nos últimos 15 minutos.`,
      };

    case "channel_down":
      return {
        title: "❌ Canal de Notificação Fora do Ar",
        message: `O canal ${metadata.channel_slug || "desconhecido"} falhou 5 vezes consecutivas. Verifique as configurações.`,
      };

    case "event_disabled_mandatory":
      return {
        title: "⚙️ Evento Obrigatório Desabilitado",
        message: `O evento obrigatório "${metadata.event_name || metadata.event_slug}" foi desabilitado no canal ${metadata.channel || "desconhecido"}.`,
      };

    default:
      return {
        title: "⚠️ Alerta de Saúde do Sistema",
        message: `Um alerta de saúde foi detectado: ${alertType}`,
      };
  }
}

serve(handler);
