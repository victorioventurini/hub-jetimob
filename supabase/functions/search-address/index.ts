/**
 * Edge Function: search-address
 * 
 * Searches for Brazilian addresses using Google Places Autocomplete API.
 * Returns structured address predictions for autocomplete UI.
 * 
 * @module locations
 * @version 1.0.0
 * 
 * ## Features
 * - Google Places Autocomplete integration
 * - Restricted to Brazilian addresses
 * - Returns structured predictions with main/secondary text
 * - Graceful degradation with empty results on validation error
 * 
 * ## Authentication
 * - verify_jwt: false
 * - Public endpoint (no auth required)
 * 
 * ## Request
 * - Method: POST
 * - Body: { query: string }
 * 
 * ## Response
 * - Success: { predictions: [{ placeId, description, mainText, secondaryText }] }
 * - Error: { error: string }
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  SearchAddressQuerySchema,
  parseRequestBody,
  formatValidationErrors,
} from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Get Google Maps API key from integrations config
async function getGoogleMapsApiKey(): Promise<string | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from("hub_integrations_global_config")
    .select("config_encrypted, is_enabled_global")
    .eq("integration_key", "google-maps")
    .single();

  if (error || !data?.is_enabled_global) {
    console.error("Google Maps integration not configured or disabled");
    return null;
  }

  const config = data.config_encrypted as { api_key?: string };
  return config?.api_key || null;
}

interface AddressPrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate request body with Zod schema
    const parseResult = await parseRequestBody(req, SearchAddressQuerySchema);
    
    if (!parseResult.success) {
      // Return empty predictions for validation errors (graceful degradation)
      console.warn("Validation failed:", formatValidationErrors(parseResult.error));
      return new Response(
        JSON.stringify({ predictions: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { query } = parseResult.data;

    const apiKey = await getGoogleMapsApiKey();
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Google Maps API not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Google Places Autocomplete API
    const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
    url.searchParams.set("input", query);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("language", "pt-BR");
    url.searchParams.set("components", "country:br"); // Restrict to Brazil
    url.searchParams.set("types", "address"); // Only addresses

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error("Google Places API error:", data.status, data.error_message);
      return new Response(
        JSON.stringify({ error: "Failed to search addresses", status: data.status }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const predictions: AddressPrediction[] = (data.predictions || []).map((p: any) => ({
      placeId: p.place_id,
      description: p.description,
      mainText: p.structured_formatting?.main_text || p.description,
      secondaryText: p.structured_formatting?.secondary_text || "",
    }));

    return new Response(
      JSON.stringify({ predictions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in search-address:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
