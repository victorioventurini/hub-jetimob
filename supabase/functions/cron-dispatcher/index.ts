/**
 * Edge Function: cron-dispatcher
 * 
 * Central cron job dispatcher for scheduled background tasks.
 * Called by external cron service (cron-job.org) to orchestrate:
 * - Notification outbox processing
 * - System health evaluation
 * - Database maintenance and cleanup
 * 
 * @module cron
 * @version 1.0.0
 * 
 * ## Features
 * - Processes pending notification outbox items via dedicated edge function
 * - Evaluates notification health and creates/resolves alerts
 * - Runs database cleanup: wizard sessions, agent logs, cron logs, perf snapshots
 * - Collects performance metrics for dashboards
 * - Initializes counting columns for materialized views
 * 
 * ## Authentication
 * - verify_jwt: false (no JWT required)
 * - Requires: x-cron-secret header matching value stored in hub_integrations_global_config
 * 
 * ## Request
 * - Method: POST
 * - Headers: x-cron-secret (required)
 * 
 * ## Response
 * - Success: {@link ExecutionResult} with outbox, health, maintenance stats
 * - Error: { error: string, correlation_id?: string }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/middleware.ts";
import { createServiceClient } from "../_shared/client.ts";

interface OutboxResult {
  processed: number;
  sent: number;
  failed: number;
}

interface HealthResult {
  alerts_created: number;
  alerts_resolved: number;
  admins_notified: number;
}

interface MaintenanceResult {
  counting_columns_initialized: boolean;
  wizard_sessions_cleaned: number;
  agent_logs_cleaned: number;
  cron_logs_cleaned: number;
  perf_snapshots_cleaned: number;
  perf_metrics_collected: boolean;
  recommendation_notifications_sent: number;
  recommendation_notifications_checked: number;
  ritual_occurrences_missed: number;
  cycles_activated: number;
  cycles_closed: number;
  analysis_schedules_run: number;
  analysis_schedules_failed: number;
}

interface ExecutionResult {
  success: boolean;
  correlation_id: string;
  outbox: OutboxResult;
  health: HealthResult;
  maintenance: MaintenanceResult;
  duration_ms: number;
  ran_at: string;
}

// Get CRON_SECRET from database config (same pattern as other integrations)
async function getCronSecret(supabase: any): Promise<string | null> {
  const { data, error } = await supabase
    .from("hub_integrations_global_config")
    .select("config_encrypted, is_enabled_global")
    .eq("integration_key", "cron-job")
    .maybeSingle();

  if (error || !data?.is_enabled_global) {
    console.log("[cron-dispatcher] Integration not enabled or error:", error);
    return null;
  }

  const config = data.config_encrypted as { cron_secret?: string } | null;
  return config?.cron_secret || null;
}

// Process outbox items by calling the dedicated edge function
async function processOutbox(): Promise<OutboxResult> {
  const result: OutboxResult = { processed: 0, sent: 0, failed: 0 };

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  console.log("[cron-dispatcher] Calling process-notification-outbox edge function...");
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/process-notification-outbox`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ source: "cron-dispatcher" }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[cron-dispatcher] Edge function returned ${response.status}: ${errorText}`);
      return result;
    }

    const data = await response.json();
    console.log("[cron-dispatcher] Edge function response:", JSON.stringify(data));
    
    // Extract results from the edge function response
    result.processed = data.processed || 0;
    result.sent = data.sent || 0;
    result.failed = data.failed || 0;
    
  } catch (error: unknown) {
    console.error("[cron-dispatcher] Error calling edge function:", error instanceof Error ? error.message : error);
  }

  return result;
}

// Evaluate notification health
async function evaluateHealth(supabase: any): Promise<HealthResult> {
  const result: HealthResult = { alerts_created: 0, alerts_resolved: 0, admins_notified: 0 };

  try {
    const { data, error } = await supabase.rpc("evaluate_notification_health");
    if (!error && data) {
      result.alerts_created = data.alerts_created || 0;
      result.alerts_resolved = data.alerts_resolved || 0;
    }
  } catch {
    console.log("[cron-dispatcher] Health RPC not available");
  }

  return result;
}

// Run database maintenance tasks
async function runMaintenance(supabase: any): Promise<MaintenanceResult> {
  const result: MaintenanceResult = { 
    counting_columns_initialized: false, 
    wizard_sessions_cleaned: 0,
    agent_logs_cleaned: 0,
    cron_logs_cleaned: 0,
    perf_snapshots_cleaned: 0,
    perf_metrics_collected: false,
    recommendation_notifications_sent: 0,
    recommendation_notifications_checked: 0,
    ritual_occurrences_missed: 0,
    cycles_activated: 0,
    cycles_closed: 0,
    analysis_schedules_run: 0,
    analysis_schedules_failed: 0,
  };

  try {
    // Initialize counting columns (runs only if needed)
    const { error: initError } = await supabase.rpc("initialize_counting_columns");
    if (!initError) {
      result.counting_columns_initialized = true;
      console.log("[cron-dispatcher] Counting columns initialized");
    }
  } catch {
    console.log("[cron-dispatcher] initialize_counting_columns RPC not available");
  }

  try {
    // Cleanup old wizard sessions (7 days)
    const { data: wizardCount, error: wizardError } = await supabase.rpc("cleanup_old_wizard_sessions");
    if (!wizardError) {
      result.wizard_sessions_cleaned = wizardCount || 0;
      console.log(`[cron-dispatcher] Cleaned ${result.wizard_sessions_cleaned} old wizard sessions`);
    }
  } catch {
    console.log("[cron-dispatcher] cleanup_old_wizard_sessions RPC not available");
  }

  try {
    // Cleanup old agent logs (90 days)
    const { data: agentCount, error: agentError } = await supabase.rpc("cleanup_old_agent_logs");
    if (!agentError) {
      result.agent_logs_cleaned = agentCount || 0;
      console.log(`[cron-dispatcher] Cleaned ${result.agent_logs_cleaned} old agent logs`);
    }
  } catch {
    console.log("[cron-dispatcher] cleanup_old_agent_logs RPC not available");
  }

  try {
    // Cleanup old cron logs (30 days)
    const { data: cronCount, error: cronError } = await supabase.rpc("cleanup_old_cron_logs");
    if (!cronError) {
      result.cron_logs_cleaned = cronCount || 0;
      console.log(`[cron-dispatcher] Cleaned ${result.cron_logs_cleaned} old cron logs`);
    }
  } catch {
    console.log("[cron-dispatcher] cleanup_old_cron_logs RPC not available");
  }

  // P4: Collect performance metrics
  try {
    const { data, error } = await supabase.rpc("collect_perf_metrics");
    if (!error) {
      result.perf_metrics_collected = true;
      console.log("[cron-dispatcher] Performance metrics collected:", JSON.stringify(data));
    }
  } catch {
    console.log("[cron-dispatcher] collect_perf_metrics RPC not available");
  }

  // P4: Cleanup old performance snapshots (90 days)
  try {
    const { data: perfCount, error: perfError } = await supabase.rpc("cleanup_old_perf_snapshots");
    if (!perfError) {
      result.perf_snapshots_cleaned = perfCount || 0;
      console.log(`[cron-dispatcher] Cleaned ${result.perf_snapshots_cleaned} old perf snapshots`);
    }
  } catch {
    console.log("[cron-dispatcher] cleanup_old_perf_snapshots RPC not available");
  }

  // Process recommendation expiry notifications
  try {
    const { data, error } = await supabase.rpc("process_recommendation_expiry_notifications");
    if (!error && data && data.length > 0) {
      result.recommendation_notifications_sent = data[0].notifications_sent || 0;
      result.recommendation_notifications_checked = data[0].recommendations_checked || 0;
      console.log(`[cron-dispatcher] Recommendation notifications: ${result.recommendation_notifications_sent} sent, ${result.recommendation_notifications_checked} checked`);
    }
  } catch {
    console.log("[cron-dispatcher] process_recommendation_expiry_notifications RPC not available");
  }

  // Mark missed ritual occurrences
  try {
    const { data: missedCount, error: missedErr } = await supabase.rpc("mark_missed_ritual_occurrences");
    if (!missedErr) {
      result.ritual_occurrences_missed = missedCount || 0;
      console.log(`[cron-dispatcher] Marked ${result.ritual_occurrences_missed} ritual occurrences as missed`);
    }
  } catch {
    console.log("[cron-dispatcher] mark_missed_ritual_occurrences RPC not available");
  }

  // Auto-transition cycle statuses
  try {
    const { data: cycleData, error: cycleErr } = await supabase.rpc("auto_transition_cycle_statuses");
    if (!cycleErr && cycleData) {
      result.cycles_activated = cycleData.activated || 0;
      result.cycles_closed = cycleData.closed || 0;
      console.log(`[cron-dispatcher] Cycle transitions: ${result.cycles_activated} activated, ${result.cycles_closed} closed`);
    }
  } catch {
    console.log("[cron-dispatcher] auto_transition_cycle_statuses RPC not available");
  }

  // Run pending analysis schedules
  try {
    const stats = await runAnalysisSchedules(supabase);
    result.analysis_schedules_run = stats.run;
    result.analysis_schedules_failed = stats.failed;
    if (stats.run > 0 || stats.failed > 0) {
      console.log(`[cron-dispatcher] Analysis schedules: ${stats.run} run, ${stats.failed} failed`);
    }
  } catch (err) {
    console.error("[cron-dispatcher] runAnalysisSchedules error:", err);
  }

  return result;
}

/**
 * Process pending analysis schedules: invokes analysis-generate per schedule
 * and recomputes next_run_at based on frequency.
 */
async function runAnalysisSchedules(
  supabase: any,
): Promise<{ run: number; failed: number }> {
  const stats = { run: 0, failed: 0 };
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const nowIso = new Date().toISOString();
  const { data: schedules, error } = await supabase
    .from("analysis_schedules")
    .select("id, bu_id, template_id, frequency, hour_local, day_of_period, recipients, next_run_at")
    .eq("is_active", true)
    .lte("next_run_at", nowIso)
    .limit(50);

  if (error || !schedules || schedules.length === 0) return stats;

  for (const sched of schedules) {
    try {
      // Load template defaults
      const { data: tpl } = await supabase
        .from("analysis_templates")
        .select("id, premise, defaults")
        .eq("id", sched.template_id)
        .is("deleted_at", null)
        .maybeSingle();

      if (!tpl) {
        stats.failed++;
        continue;
      }

      const defaults = (tpl.defaults || {}) as Record<string, unknown>;

      // Compute period from frequency (last completed window)
      const period = computePeriodForFrequency(sched.frequency);

      // Find a service "actor" for created_by — use the schedule's creator if available
      const { data: schedFull } = await supabase
        .from("analysis_schedules")
        .select("created_by")
        .eq("id", sched.id)
        .maybeSingle();

      const createdByProfile = schedFull?.created_by;
      if (!createdByProfile) {
        stats.failed++;
        continue;
      }

      const { data: actorProfile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("id", createdByProfile)
        .maybeSingle();

      if (!actorProfile?.user_id) {
        stats.failed++;
        continue;
      }

      // Invoke analysis-generate (service role; function will run with bu context from header)
      const resp = await fetch(`${supabaseUrl}/functions/v1/analysis-generate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
          "x-current-bu-id": sched.bu_id,
          "x-cron-source": "schedule",
        },
        body: JSON.stringify({
          bu_id: sched.bu_id,
          premise: tpl.premise,
          mode: defaults.mode ?? "auto",
          depth: defaults.depth ?? "standard",
          modules: defaults.modules ?? [],
          scope: defaults.scope ?? { buWide: true },
          period,
          template_id: tpl.id,
          additional_context: null,
          impersonated_user_id: actorProfile.user_id,
        }),
      });

      if (!resp.ok) {
        stats.failed++;
        const txt = await resp.text();
        console.error(`[cron-dispatcher] schedule ${sched.id} invoke failed: ${txt}`);
      } else {
        stats.run++;
        const body = await resp.json().catch(() => ({}));
        const reportId = body?.report_id;

        // Notify recipients via outbox (analysis.scheduled)
        const recipients = Array.isArray(sched.recipients) ? sched.recipients : [];
        if (recipients.length > 0 && reportId) {
          // Resolve auth user ids
          const { data: recProfiles } = await supabase
            .from("profiles")
            .select("user_id")
            .in("id", recipients)
            .not("user_id", "is", null);

          const authIds = (recProfiles || [])
            .map((p: any) => p.user_id)
            .filter(Boolean);

          if (authIds.length > 0) {
            await supabase.rpc("emit_notification_event", {
              p_event_slug: "analysis.scheduled",
              p_bu_id: sched.bu_id,
              p_recipient_user_ids: authIds,
              p_actor_id: null,
              p_title: `Análise agendada disponível`,
              p_message: `Uma análise estratégica agendada foi gerada e está disponível para consulta.`,
              p_context_type: "analysis_report",
              p_context_id: reportId,
              p_context_url: `/analysis/${reportId}`,
              p_metadata: {
                schedule_id: sched.id,
                template_id: tpl.id,
              },
            });
          }
        }
      }

      // Update last_run_at + next_run_at
      const next = computeNextRunAt(sched.frequency, sched.hour_local ?? 8, sched.day_of_period);
      await supabase
        .from("analysis_schedules")
        .update({ last_run_at: nowIso, next_run_at: next })
        .eq("id", sched.id);
    } catch (err) {
      console.error(`[cron-dispatcher] schedule ${sched.id} error:`, err);
      stats.failed++;
    }
  }

  return stats;
}

function computePeriodForFrequency(freq: string): { start: string; end: string; preset: string } {
  const now = new Date();
  if (freq === "weekly") {
    const end = new Date(now);
    end.setUTCDate(end.getUTCDate() - 1);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 6);
    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
      preset: "last_7_days",
    };
  }
  if (freq === "monthly") {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
      preset: "last_month",
    };
  }
  // per_cycle → trimestre anterior
  const q = Math.floor(now.getUTCMonth() / 3);
  const startMonth = (q - 1) * 3;
  const start = new Date(Date.UTC(now.getUTCFullYear(), startMonth, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), startMonth + 3, 0));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    preset: "last_quarter",
  };
}

function computeNextRunAt(
  freq: string,
  hourLocal: number,
  dayOfPeriod: number | null,
): string {
  const next = new Date();
  if (freq === "weekly") {
    next.setUTCDate(next.getUTCDate() + 7);
  } else if (freq === "monthly") {
    next.setUTCMonth(next.getUTCMonth() + 1);
    if (dayOfPeriod) next.setUTCDate(Math.min(dayOfPeriod, 28));
  } else {
    next.setUTCMonth(next.getUTCMonth() + 3);
  }
  next.setUTCHours(hourLocal, 0, 0, 0);
  return next.toISOString();
}
async function logExecution(supabase: any, result: ExecutionResult): Promise<void> {
  try {
    await supabase.from("cron_execution_logs").insert({
      ran_at: result.ran_at,
      status: result.success ? "success" : "error",
      duration_ms: result.duration_ms,
      outbox_processed: result.outbox.processed,
      outbox_sent: result.outbox.sent,
      outbox_failed: result.outbox.failed,
      health_alerts_created: result.health.alerts_created,
      health_alerts_resolved: result.health.alerts_resolved,
      correlation_id: result.correlation_id,
    });
  } catch {
    console.error("[cron-dispatcher] Failed to log execution");
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const correlationId = crypto.randomUUID();

  // Create supabase client using centralized factory
  const supabase = createServiceClient();

  // Validate cron secret from database config
  const cronSecret = req.headers.get("x-cron-secret");
  const expectedSecret = await getCronSecret(supabase);

  if (!expectedSecret) {
    return new Response(JSON.stringify({ error: "Integration not configured or disabled" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!cronSecret || cronSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const outboxResult = await processOutbox();
    const healthResult = await evaluateHealth(supabase);
    const maintenanceResult = await runMaintenance(supabase);
    const duration = Date.now() - startTime;

    const result: ExecutionResult = {
      success: true,
      correlation_id: correlationId,
      outbox: outboxResult,
      health: healthResult,
      maintenance: maintenanceResult,
      duration_ms: duration,
      ran_at: new Date().toISOString(),
    };

    await logExecution(supabase, result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const result: ExecutionResult = {
      success: false,
      correlation_id: correlationId,
      outbox: { processed: 0, sent: 0, failed: 0 },
      health: { alerts_created: 0, alerts_resolved: 0, admins_notified: 0 },
      maintenance: { counting_columns_initialized: false, wizard_sessions_cleaned: 0, agent_logs_cleaned: 0, cron_logs_cleaned: 0, perf_snapshots_cleaned: 0, perf_metrics_collected: false, recommendation_notifications_sent: 0, recommendation_notifications_checked: 0, ritual_occurrences_missed: 0, cycles_activated: 0, cycles_closed: 0, analysis_schedules_run: 0, analysis_schedules_failed: 0 },
      duration_ms: Date.now() - startTime,
      ran_at: new Date().toISOString(),
    };

    await logExecution(supabase, result);

    return new Response(JSON.stringify({ error: "Internal error", correlation_id: correlationId }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
