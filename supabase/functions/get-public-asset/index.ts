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

    // Fetch asset by internal_code
    const { data: assets, error: assetError } = await supabase
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
      .eq("internal_code", ref)
      .is("deleted_at", null);

    if (assetError || !assets || assets.length === 0) {
      console.error("Error fetching asset:", assetError);
      return new Response(
        JSON.stringify({ error: "Item não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch BU info for each asset and filter by active BUs
    const validAssets: any[] = [];
    for (const assetItem of assets) {
      const { data: buData } = await supabase
        .from("bu_units")
        .select("id, name, legal_entity, cnpj, status")
        .eq("id", assetItem.bu_id)
        .eq("status", "active")
        .maybeSingle();
      
      if (buData) {
        validAssets.push({ ...assetItem, bu: buData });
      }
    }

    if (validAssets.length === 0) {
      return new Response(
        JSON.stringify({ error: "Item não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Security: if multiple matches across BUs, log and return not found
    if (validAssets.length > 1) {
      console.warn(`Multiple assets found with internal_code ${ref} across active BUs`);
      return new Response(
        JSON.stringify({ error: "Item não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const asset = validAssets[0];

    // Get latest movement for due_at
    const { data: latestMovement } = await supabase
      .from("asset_movements")
      .select("due_at, occurred_at")
      .eq("asset_id", asset.id)
      .order("occurred_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get related items (kit accessories)
    let relatedItems: any[] = [];
    
    // Check if asset is part of a kit
    const { data: groupItemData } = await supabase
      .from("asset_group_items")
      .select("group_id, role")
      .eq("asset_id", asset.id)
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
          .neq("asset_id", asset.id)
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
                const assetData = kitAssets.find(a => a.id === ki.asset_id);
                if (!assetData) return null;
                return {
                  name: assetData.name,
                  internal_code: assetData.internal_code,
                  status: assetData.status,
                  photo: sanitizePhotos(assetData.photos)?.[0] || null,
                  role: ki.role,
                };
              })
              .filter(Boolean);
          }
        }
      }
    }

    // Sanitize holder info
    const holderSummary = getHolderSummary(asset.current_holder_type, asset.status);

    // Build sanitized response
    const publicView = {
      asset: {
        id: asset.id,
        name: asset.name,
        internal_code: asset.internal_code,
        description: asset.description,
        brand: asset.brand,
        model: asset.model,
        status: asset.status,
        photos: sanitizePhotos(asset.photos),
        holder_summary: holderSummary,
        due_at: asset.status === "loaned" ? latestMovement?.due_at : null,
        last_moved_at: asset.last_moved_at,
      },
      bu: {
        name: asset.bu.name,
        legal_entity: asset.bu.legal_entity,
        cnpj: formatCnpj(asset.bu.cnpj),
      },
      related_items: relatedItems,
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
