/**
 * @deprecated Esta função foi substituída por `request-magic-link`.
 * Mantida apenas para instrumentação e detecção de uso residual.
 * Será removida após 14 dias sem chamadas.
 * 
 * Data de depreciação: 2026-01-08
 * Função substituta: request-magic-link
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Log deprecated function call for monitoring
async function logDeprecatedCall(email: string | null): Promise<void> {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Log to app_error_logs as a deprecation warning
    await supabase.from("app_error_logs").insert({
      module: "edge_functions",
      action: "deprecated_call",
      error_code: "DEPRECATED_FUNCTION",
      message: "send-magic-link foi chamada - esta função está deprecated",
      metadata: {
        function_name: "send-magic-link",
        deprecated_since: "2026-01-08",
        replacement: "request-magic-link",
        called_at: new Date().toISOString(),
        email_domain: email ? email.split("@")[1] : null,
      },
    });
    
    console.warn("[DEPRECATED] send-magic-link chamada - use request-magic-link");
  } catch (logError) {
    console.error("Failed to log deprecated call:", logError);
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Always log the deprecated call
  let email: string | null = null;
  try {
    const body = await req.clone().json();
    email = body?.email || null;
  } catch {
    // Ignore parse errors for logging
  }
  
  await logDeprecatedCall(email);

  // Return 410 Gone - this function is deprecated
  return new Response(
    JSON.stringify({
      error: "Esta função foi descontinuada. Use request-magic-link.",
      deprecated: true,
      deprecated_since: "2026-01-08",
      replacement: "request-magic-link",
      status: "DEPRECATED",
    }),
    {
      status: 410,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    }
  );
};

serve(handler);
