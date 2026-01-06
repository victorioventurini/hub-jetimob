import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Cache-Control": "public, max-age=60",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const ref = url.searchParams.get("ref");

    if (!ref) {
      return new Response(
        JSON.stringify({ error: "Item não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Use the RPC function to resolve asset by code (handles normalization)
    const { data: resolvedAsset, error: resolveError } = await supabase.rpc(
      "resolve_asset_by_code_global",
      { code_text: ref }
    );

    if (resolveError || !resolvedAsset || resolvedAsset.length === 0) {
      console.error("Error resolving asset:", resolveError);
      return new Response(
        JSON.stringify({ error: "Item não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { asset_id, bu_id: resolved_bu_id } = resolvedAsset[0];

    // Fetch full asset details
    const { data: assetData, error: assetError } = await supabase
      .from("asset_inventory")
      .select(`
        id,
        name,
        internal_code,
        description,
        brand,
        model,
        status,
        current_holder_type,
        photos,
        last_moved_at,
        bu_id
      `)
      .eq("id", asset_id)
      .maybeSingle();

    if (assetError || !assetData) {
      console.error("Error fetching asset details:", assetError);
      return new Response(
        JSON.stringify({ error: "Item não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch BU info
    const { data: buData, error: buError } = await supabase
      .from("bu_units")
      .select("id, name, legal_entity, cnpj, status")
      .eq("id", assetData.bu_id)
      .eq("status", "active")
      .maybeSingle();

    if (buError || !buData) {
      console.error("Error fetching BU:", buError);
      return new Response(
        JSON.stringify({ error: "Item não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get latest movement for due_at
    const { data: latestMovement } = await supabase
      .from("asset_movements")
      .select("due_at, occurred_at")
      .eq("asset_id", assetData.id)
      .order("occurred_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get related items (kit accessories)
    let relatedItems: any[] = [];
    
    // Check if asset is part of a kit
    const { data: groupItemData } = await supabase
      .from("asset_group_items")
      .select("group_id, role")
      .eq("asset_id", assetData.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (groupItemData) {
      // Fetch group info separately
      const { data: groupData } = await supabase
        .from("asset_groups")
        .select("id, name, status, primary_asset_id")
        .eq("id", groupItemData.group_id)
        .eq("status", "active")
        .is("deleted_at", null)
        .maybeSingle();

      if (groupData) {
        // Get all other items in the same kit
        const { data: kitItems } = await supabase
          .from("asset_group_items")
          .select("asset_id, role")
          .eq("group_id", groupData.id)
          .neq("asset_id", assetData.id)
          .is("deleted_at", null);

        if (kitItems && kitItems.length > 0) {
          // Fetch asset details for each kit item
          const assetIds = kitItems.map(ki => ki.asset_id);
          const { data: kitAssets } = await supabase
            .from("asset_inventory")
            .select("id, name, internal_code, status, photos")
            .in("id", assetIds)
            .is("deleted_at", null);

          if (kitAssets) {
            relatedItems = kitItems
              .map(ki => {
                const kitAsset = kitAssets.find(a => a.id === ki.asset_id);
                if (!kitAsset) return null;
                return {
                  name: kitAsset.name,
                  internal_code: kitAsset.internal_code,
                  status: kitAsset.status,
                  photo: sanitizePhotos(kitAsset.photos)?.[0] || null,
                  role: ki.role,
                };
              })
              .filter(Boolean);
          }
        }
      }
    }

    // Sanitize holder info
    const holderSummary = getHolderSummary(assetData.current_holder_type, assetData.status);

    // Build sanitized response
    const publicView = {
      asset: {
        id: assetData.id,
        name: assetData.name,
        internal_code: assetData.internal_code,
        description: assetData.description,
        brand: assetData.brand,
        model: assetData.model,
        status: assetData.status,
        photos: sanitizePhotos(assetData.photos),
        holder_summary: holderSummary,
        due_at: assetData.status === "loaned" ? latestMovement?.due_at : null,
        last_moved_at: assetData.last_moved_at,
      },
      bu: {
        id: assetData.bu_id,
        name: buData.name,
        legal_entity: buData.legal_entity,
        cnpj: formatCnpj(buData.cnpj),
      },
      related_items: relatedItems,
      // Internal view path - uses /go resolver to ensure correct BU is selected
      internal_view_path: `/go/asset/${assetData.id}`,
    };

    return new Response(JSON.stringify(publicView), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Item não encontrado" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function sanitizePhotos(photos: any): string[] | null {
  if (!photos || !Array.isArray(photos)) return null;
  // Only return public storage URLs, filter out any internal/document URLs
  return photos
    .filter((p: any) => typeof p === "string" && p.includes("/storage/"))
    .slice(0, 5);
}

function getHolderSummary(holderType: string, status: string): string {
  if (status === "written_off") return "Baixado";
  if (status === "maintenance") return "Em manutenção";
  if (holderType === "location") return "Em sede";
  if (holderType === "user") return "Em posse de colaborador";
  return "Disponível";
}

function formatCnpj(cnpj: string | null): string | null {
  if (!cnpj) return null;
  const clean = cnpj.replace(/\D/g, "");
  if (clean.length !== 14) return cnpj;
  return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8, 12)}-${clean.slice(12)}`;
}
