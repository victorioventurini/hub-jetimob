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

interface MaintenanceResult {
  counting_columns_initialized: boolean;
  wizard_sessions_cleaned: number;
  agent_logs_cleaned: number;
  cron_logs_cleaned: number;
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
    cron_logs_cleaned: 0
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
      maintenance: { counting_columns_initialized: false, wizard_sessions_cleaned: 0, agent_logs_cleaned: 0, cron_logs_cleaned: 0 },
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
