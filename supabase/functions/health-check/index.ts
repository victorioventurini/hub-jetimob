/**
 * Edge Function: health-check
 * 
 * Health check endpoint for external monitoring systems.
 * Validates database connectivity and core service availability.
 * 
 * @module health-check
 * @version 1.0.0
 * 
 * ## Features
 * - Database connectivity check
 * - Environment validation
 * - Response time tracking
 * - Degraded state detection
 * 
 * ## Authentication
 * - verify_jwt: false (public endpoint)
 * - Optional: x-api-key for detailed metrics
 * 
 * ## Response
 * - 200: System healthy
 * - 503: System unhealthy (database down, critical errors)
 */

import { corsHeaders } from "../_shared/middleware.ts";
import { createServiceClient, validateEnvironment } from "../_shared/client.ts";
import { healthResponse } from "../_shared/response.ts";

interface HealthCheckResult {
  name: string;
  status: "pass" | "fail";
  duration_ms: number;
  message?: string;
}

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  checks: HealthCheckResult[];
  total_duration_ms: number;
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<HealthCheckResult> {
  const start = Date.now();
  
  try {
    const supabase = createServiceClient();
    
    // Simple query to verify connection
    const { data, error } = await supabase
      .from("bu_units")
      .select("id")
      .limit(1);
    
    const duration = Date.now() - start;
    
    if (error) {
      return {
        name: "database",
        status: "fail",
        duration_ms: duration,
        message: error.message,
      };
    }
    
    return {
      name: "database",
      status: "pass",
      duration_ms: duration,
    };
  } catch (error) {
    return {
      name: "database",
      status: "fail",
      duration_ms: Date.now() - start,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check environment configuration
 */
function checkEnvironment(): HealthCheckResult {
  const start = Date.now();
  
  try {
    validateEnvironment();
    
    return {
      name: "environment",
      status: "pass",
      duration_ms: Date.now() - start,
    };
  } catch (error) {
    return {
      name: "environment",
      status: "fail",
      duration_ms: Date.now() - start,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check if critical RPC functions exist
 */
async function checkCriticalFunctions(): Promise<HealthCheckResult> {
  const start = Date.now();
  
  try {
    const supabase = createServiceClient();
    
    // Try calling a simple read-only RPC that should always exist
    // Using a function that doesn't require specific parameters
    const { error } = await supabase.rpc("get_my_permissions", { 
      p_bu_id: "00000000-0000-0000-0000-000000000000" 
    });
    
    const duration = Date.now() - start;
    
    // Function not found is a critical error
    if (error?.code === "PGRST202") {
      return {
        name: "rpc_functions",
        status: "fail",
        duration_ms: duration,
        message: "Critical RPC functions not available",
      };
    }
    
    // Empty result or permission errors are fine - function exists and works
    return {
      name: "rpc_functions",
      status: "pass",
      duration_ms: duration,
    };
  } catch (error) {
    return {
      name: "rpc_functions",
      status: "fail",
      duration_ms: Date.now() - start,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  const startTime = Date.now();
  const requestId = req.headers.get("x-correlation-id") || crypto.randomUUID();
  
  console.log(`[${requestId}] Health check started`);
  
  try {
    // Run all checks in parallel for speed
    const [dbCheck, envCheck, rpcCheck] = await Promise.all([
      checkDatabase(),
      Promise.resolve(checkEnvironment()),
      checkCriticalFunctions(),
    ]);
    
    const checks = [dbCheck, envCheck, rpcCheck];
    const totalDuration = Date.now() - startTime;
    
    // Determine overall status
    const failedChecks = checks.filter((c) => c.status === "fail");
    const criticalFailed = failedChecks.some(
      (c) => c.name === "database" || c.name === "environment"
    );
    
    let overallStatus: "healthy" | "degraded" | "unhealthy";
    if (criticalFailed) {
      overallStatus = "unhealthy";
    } else if (failedChecks.length > 0) {
      overallStatus = "degraded";
    } else {
      overallStatus = "healthy";
    }
    
    const result: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      checks,
      total_duration_ms: totalDuration,
    };
    
    console.log(`[${requestId}] Health check complete: ${overallStatus} (${totalDuration}ms)`);
    
    return healthResponse(overallStatus, {
      ...result,
      requestId,
    });
  } catch (error) {
    console.error(`[${requestId}] Health check failed:`, error);
    
    return healthResponse("unhealthy", {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      checks: [],
      total_duration_ms: Date.now() - startTime,
      error: error instanceof Error ? error.message : "Unknown error",
      requestId,
    });
  }
});
