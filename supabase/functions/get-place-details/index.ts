/**
 * Edge Function: get-place-details
 * 
 * Retrieves full address details from Google Places API using a place ID.
 * Used after address autocomplete selection to get structured address components.
 * 
 * @module locations
 * @version 1.0.0
 * 
 * ## Features
 * - Fetches detailed address from Google Place Details API
 * - Parses address components into structured format
 * - Returns coordinates for map display
 * - State abbreviation conversion (e.g., "São Paulo" → "SP")
 * 
 * ## Authentication
 * - verify_jwt: false
 * - Public endpoint (no auth required)
 * 
 * ## Request
 * - Method: POST
 * - Body: { placeId: string }
 * 
 * ## Response
 * - Success: AddressDetails { formatted_address, address_line_1, city, state, postal_code, latitude, longitude, google_place_id }
 * - Error: { error: string }
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

interface AddressDetails {
  formatted_address: string;
  address_line_1: string;
  address_line_2?: string;
  district?: string;
  city: string;
  state: string;
  country: string;
  postal_code?: string;
  latitude: number;
  longitude: number;
  google_place_id: string;
}

function parseAddressComponents(components: any[]): Partial<AddressDetails> {
  const result: Partial<AddressDetails> = {};
  
  for (const component of components) {
    const types = component.types || [];
    
    if (types.includes("street_number")) {
      result.address_line_1 = (result.address_line_1 || "") + component.long_name;
    } else if (types.includes("route")) {
      result.address_line_1 = component.long_name + (result.address_line_1 ? ", " + result.address_line_1 : "");
    } else if (types.includes("sublocality_level_1") || types.includes("sublocality")) {
      result.district = component.long_name;
    } else if (types.includes("administrative_area_level_2") || types.includes("locality")) {
      result.city = component.long_name;
    } else if (types.includes("administrative_area_level_1")) {
      result.state = component.short_name; // Use abbreviation for state
    } else if (types.includes("country")) {
      result.country = component.short_name;
    } else if (types.includes("postal_code")) {
      result.postal_code = component.long_name;
    }
  }
  
  return result;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { placeId } = await req.json();

    if (!placeId) {
      return new Response(
        JSON.stringify({ error: "placeId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = await getGoogleMapsApiKey();
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Google Maps API not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Google Place Details API
    const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
    url.searchParams.set("place_id", placeId);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("language", "pt-BR");
    url.searchParams.set("fields", "formatted_address,address_components,geometry");

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== "OK") {
      console.error("Google Place Details API error:", data.status, data.error_message);
      return new Response(
        JSON.stringify({ error: "Failed to get place details", status: data.status }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const place = data.result;
    const addressComponents = parseAddressComponents(place.address_components || []);

    const details: AddressDetails = {
      formatted_address: place.formatted_address || "",
      address_line_1: addressComponents.address_line_1 || "",
      address_line_2: addressComponents.address_line_2,
      district: addressComponents.district,
      city: addressComponents.city || "",
      state: addressComponents.state || "",
      country: addressComponents.country || "BR",
      postal_code: addressComponents.postal_code,
      latitude: place.geometry?.location?.lat || 0,
      longitude: place.geometry?.location?.lng || 0,
      google_place_id: placeId,
    };

    return new Response(
      JSON.stringify(details),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in get-place-details:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
