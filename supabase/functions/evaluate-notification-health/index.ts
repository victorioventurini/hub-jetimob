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
  last_notified_at: string | null;
  cooldown_minutes: number;
  escalation_level: string;
  consecutive_occurrences: number;
}

/**
 * Edge Function: evaluate-notification-health
 * 
 * Phase 4: With cooldown and escalation support
 * 
 * Features:
 * - Idempotent: safe to run multiple times
 * - Cooldown: prevents alert spam by respecting cooldown_minutes
 * - Escalation: warning -> critical after consecutive occurrences
 * - Auto-resolve: clears alerts when conditions normalize
 * - Notifies admins only for CRITICAL alerts (new or cooldown expired)
 */
const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const correlationId = crypto.randomUUID();
  console.log(`[Health] Evaluation started correlation_id=${correlationId}`);

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

    // Check for CRITICAL alerts that need notification (respecting cooldown)
    const notifiedCount = await notifyCriticalAlertsWithCooldown(supabase, correlationId);

    return new Response(
      JSON.stringify({
        success: true,
        correlation_id: correlationId,
        alerts_created: summary.alerts_created,
        alerts_resolved: summary.alerts_resolved,
        admins_notified: notifiedCount,
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
 * Notify admins about critical alerts with cooldown protection
 * Only notifies if:
 * 1. Alert is CRITICAL severity
 * 2. Either new (never notified) OR cooldown has expired
 */
// deno-lint-ignore no-explicit-any
async function notifyCriticalAlertsWithCooldown(
  supabase: any,
  correlationId: string
): Promise<number> {
  // Get active CRITICAL alerts
  const { data: criticalAlerts, error: alertsError } = await supabase
    .from("notification_health_alerts")
    .select("id, bu_id, alert_type, severity, metadata, last_notified_at, cooldown_minutes, escalation_level, consecutive_occurrences")
    .eq("is_active", true)
    .eq("severity", "critical");

  if (alertsError || !criticalAlerts?.length) {
    return 0;
  }

  let notifiedCount = 0;
  const now = new Date();

  for (const alert of criticalAlerts as HealthAlert[]) {
    // Check cooldown
    const lastNotified = alert.last_notified_at ? new Date(alert.last_notified_at) : null;
    const cooldownMs = (alert.cooldown_minutes || 10) * 60 * 1000;
    
    const shouldNotify = !lastNotified || (now.getTime() - lastNotified.getTime() > cooldownMs);
    
    if (!shouldNotify) {
      console.log(`[Health] Skipping alert ${alert.id.slice(0, 8)}... (cooldown active)`);
      continue;
    }

    // Get admin users for this BU
    const { data: adminMemberships, error: membersError } = await supabase
      .from("bu_user_memberships")
      .select("user_id")
      .eq("bu_id", alert.bu_id)
      .in("role_in_bu", ["admin", "super_admin"]);

    if (membersError || !adminMemberships?.length) {
      console.warn(`[Health] No admins found for BU ${alert.bu_id.slice(0, 8)}...`);
      continue;
    }

    // Build notification message
    const { title, message } = buildAlertNotificationMessage(alert.alert_type, alert.metadata, alert.escalation_level);

    // Create in_app notifications for each admin
    for (const membership of adminMemberships as { user_id: string }[]) {
      const userId = membership.user_id;
      const dedupeKey = `health_alert_${alert.id}_${userId}_${Math.floor(now.getTime() / cooldownMs)}`;

      // Check if notification already sent (idempotency within cooldown window)
      const { data: existing } = await supabase
        .from("notification_outbox")
        .select("id")
        .eq("dedupe_key", dedupeKey)
        .maybeSingle();

      if (existing) {
        continue;
      }

      // Create outbox entry for in_app notification
      // MULTI-BU: Use /go/health_alert/{id} for automatic context resolution
      const contextUrl = `/go/health_alert/${alert.id}`;
      
      const { error: outboxError } = await supabase
        .from("notification_outbox")
        .insert({
          bu_id: alert.bu_id,
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
            context_url: contextUrl,
            metadata: {
              alert_type: alert.alert_type,
              escalation_level: alert.escalation_level,
              consecutive_occurrences: alert.consecutive_occurrences,
              correlation_id: correlationId,
            },
          },
          status: "pending",
        });

      if (outboxError) {
        console.error(`[Health] Failed to create notification: ${outboxError.message}`);
      } else {
        notifiedCount++;
      }
    }

    // Update last_notified_at on the alert
    await supabase
      .from("notification_health_alerts")
      .update({ last_notified_at: now.toISOString() })
      .eq("id", alert.id);
  }

  if (notifiedCount > 0) {
    console.log(`[Health] Notified ${notifiedCount} admins about critical alerts`);
  }

  return notifiedCount;
}

/**
 * Build user-friendly notification message for alert types
 */
function buildAlertNotificationMessage(
  alertType: string,
  metadata: Record<string, unknown>,
  escalationLevel: string
): { title: string; message: string } {
  const escalatedPrefix = escalationLevel === "critical" ? "🔴 CRÍTICO: " : "⚠️ ";

  switch (alertType) {
    case "outbox_backlog":
      return {
        title: `${escalatedPrefix}Fila de Notificações Acumulada`,
        message: `Existem ${metadata.pending_count || "muitas"} notificações pendentes há mais de ${Math.round(Number(metadata.oldest_minutes) || 10)} minutos. Verifique o processador de outbox.`,
      };

    case "high_failure_rate":
      return {
        title: `${escalatedPrefix}Alta Taxa de Falhas`,
        message: `O canal ${metadata.channel_slug || "desconhecido"} está com ${metadata.failure_rate_pct || ">10"}% de falhas nos últimos 15 minutos.`,
      };

    case "channel_down":
      return {
        title: `${escalatedPrefix}Canal de Notificação Fora do Ar`,
        message: `O canal ${metadata.channel_slug || "desconhecido"} falhou ${metadata.consecutive_failures || 5}+ vezes consecutivas. Verifique as configurações.`,
      };

    case "event_disabled_mandatory":
      return {
        title: `${escalatedPrefix}Evento Obrigatório Desabilitado`,
        message: `O evento obrigatório "${metadata.event_name || metadata.event_slug}" foi desabilitado no canal ${metadata.channel || "desconhecido"}.`,
      };

    default:
      return {
        title: `${escalatedPrefix}Alerta de Saúde do Sistema`,
        message: `Um alerta de saúde foi detectado: ${alertType}`,
      };
  }
}

serve(handler);
