import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

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

interface ExecutionResult {
  success: boolean;
  correlation_id: string;
  outbox: OutboxResult;
  health: HealthResult;
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

// Process outbox items
async function processOutbox(supabase: any): Promise<OutboxResult> {
  const result: OutboxResult = { processed: 0, sent: 0, failed: 0 };

  const now = new Date().toISOString();
  const { data: items, error } = await supabase
    .from("notification_outbox")
    .select("id, channel_slug, event_slug, payload, bu_id, user_id, retries, max_retries")
    .eq("status", "pending")
    .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) {
    console.error("[cron-dispatcher] Error fetching outbox:", error);
    return result;
  }

  if (!items || items.length === 0) {
    console.log("[cron-dispatcher] No pending outbox items");
    return result;
  }

  result.processed = items.length;

  for (const item of items) {
    try {
      const { error: updateError } = await supabase
        .from("notification_outbox")
        .update({ 
          status: "sent", 
          sent_at: now,
          processed_at: now 
        })
        .eq("id", item.id);

      if (updateError) {
        result.failed++;
      } else {
        result.sent++;
      }
    } catch {
      result.failed++;
    }
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

// Log execution to database
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

  // Create supabase client first (needed to get secret from DB)
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

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
    const outboxResult = await processOutbox(supabase);
    const healthResult = await evaluateHealth(supabase);
    const duration = Date.now() - startTime;

    const result: ExecutionResult = {
      success: true,
      correlation_id: correlationId,
      outbox: outboxResult,
      health: healthResult,
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
