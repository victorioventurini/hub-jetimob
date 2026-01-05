import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  meta: Record<string, unknown>;
  url: string;
  icon: string;
}

interface SearchGroup {
  type: string;
  label: string;
  results: SearchResult[];
  hasMore: boolean;
}

interface SearchResponse {
  query: string;
  groups: SearchGroup[];
}

// Asset permission roles by sub-module
const INVENTORY_ROLES = ["assets_admin", "inventory_admin", "inventory_manager", "viewer"];
const KEYS_ROLES = ["assets_admin", "keys_admin", "keys_manager", "viewer"];
const GIFTS_ROLES = ["assets_admin", "gifts_admin", "gifts_manager", "viewer"];

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { bu_id, q, limit_per_type = 5 } = await req.json();
    const query = (q || "").trim().toLowerCase();

    console.log(`[global-search] User: ${user.id}, BU: ${bu_id}, Query: "${query}"`);

    // Validate query length
    if (query.length < 2) {
      return new Response(JSON.stringify({ query, groups: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate user has access to BU
    const { data: membership, error: membershipError } = await supabase
      .from("bu_user_memberships")
      .select("id")
      .eq("user_id", user.id)
      .eq("bu_id", bu_id)
      .single();

    if (membershipError || !membership) {
      console.error("BU access denied:", membershipError);
      return new Response(JSON.stringify({ error: "Access denied to this BU" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const limit = Math.min(limit_per_type, 10);
    const searchPattern = `%${query}%`;
    const groups: SearchGroup[] = [];

    // Helper to add group if has results
    const addGroup = (type: string, label: string, results: SearchResult[], totalCount?: number) => {
      if (results.length > 0) {
        groups.push({
          type,
          label,
          results,
          hasMore: totalCount !== undefined ? totalCount > limit : results.length >= limit,
        });
      }
    };

    // 1. PESSOAS (profiles with BU membership)
    const { data: people, error: peopleError } = await supabase
      .from("profiles")
      .select(`
        id,
        user_id,
        first_name,
        last_name,
        display_name,
        job_title,
        photo_url,
        work_email,
        bu_user_memberships!inner(bu_id)
      `)
      .eq("bu_user_memberships.bu_id", bu_id)
      .or(`first_name.ilike.${searchPattern},last_name.ilike.${searchPattern},display_name.ilike.${searchPattern},work_email.ilike.${searchPattern}`)
      .limit(limit);

    if (!peopleError && people) {
      addGroup("people", "Pessoas", people.map(p => ({
        id: p.user_id,
        type: "people",
        title: p.display_name || `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Sem nome",
        subtitle: p.job_title || "Colaborador",
        meta: { email: p.work_email, photo_url: p.photo_url },
        url: `/users/${p.user_id}`,
        icon: "user",
      })));
    }

    // 2. TIMES
    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("id, name, description, status")
      .eq("bu_id", bu_id)
      .ilike("name", searchPattern)
      .eq("status", "active")
      .limit(limit);

    if (!teamsError && teams) {
      addGroup("teams", "Times", teams.map(t => ({
        id: t.id,
        type: "teams",
        title: t.name,
        subtitle: t.description || "Time",
        meta: { status: t.status },
        url: `/teams/${t.id}`,
        icon: "users",
      })));
    }

    // 3. SQUADS
    const { data: squads, error: squadsError } = await supabase
      .from("squads")
      .select("id, name, description, status")
      .eq("bu_id", bu_id)
      .ilike("name", searchPattern)
      .eq("status", "active")
      .limit(limit);

    if (!squadsError && squads) {
      addGroup("squads", "Squads", squads.map(s => ({
        id: s.id,
        type: "squads",
        title: s.name,
        subtitle: s.description || "Squad",
        meta: { status: s.status },
        url: `/teams?squad=${s.id}`,
        icon: "component",
      })));
    }

    // 4. OKRs (Org Objectives)
    const { data: orgObjs, error: orgObjsError } = await supabase
      .from("okr_org_objectives")
      .select("id, title, status, year")
      .eq("bu_id", bu_id)
      .ilike("title", searchPattern)
      .in("status", ["active", "draft"])
      .limit(limit);

    if (!orgObjsError && orgObjs) {
      addGroup("okrs", "OKRs Organizacionais", orgObjs.map(o => ({
        id: o.id,
        type: "okrs",
        title: o.title,
        subtitle: `Objetivo ${o.year}`,
        meta: { status: o.status, year: o.year },
        url: `/okrs/org/${o.id}`,
        icon: "target",
      })));
    }

    // 5. OKRs (Team Objectives)
    const { data: teamObjs, error: teamObjsError } = await supabase
      .from("okr_team_objectives")
      .select("id, title, status, year, teams(name)")
      .eq("bu_id", bu_id)
      .ilike("title", searchPattern)
      .in("status", ["active", "draft"])
      .limit(limit);

    if (!teamObjsError && teamObjs) {
      addGroup("team_okrs", "OKRs de Time", teamObjs.map((o: any) => ({
        id: o.id,
        type: "team_okrs",
        title: o.title,
        subtitle: `${o.teams?.name || "Time"} · ${o.year}`,
        meta: { status: o.status, year: o.year },
        url: `/okrs/team/${o.id}`,
        icon: "target",
      })));
    }

    // 6. KRs Organizacionais
    const { data: orgKrs, error: orgKrsError } = await supabase
      .from("okr_org_key_results")
      .select("id, title, status, unit, target, current_value, okr_org_objectives(title, bu_id)")
      .ilike("title", searchPattern)
      .limit(limit);

    if (!orgKrsError && orgKrs) {
      const validKrs = orgKrs.filter((kr: any) => kr.okr_org_objectives && kr.okr_org_objectives.bu_id === bu_id);
      addGroup("krs", "KRs Organizacionais", validKrs.map((kr: any) => ({
        id: kr.id,
        type: "krs",
        title: kr.title,
        subtitle: kr.okr_org_objectives?.title || "Objetivo",
        meta: { status: kr.status, progress: kr.target ? Math.round((kr.current_value || 0) / kr.target * 100) : 0 },
        url: `/okrs/org?kr=${kr.id}`,
        icon: "trending-up",
      })));
    }

    // 7. KRs de Time
    const { data: teamKrs, error: teamKrsError } = await supabase
      .from("okr_team_key_results")
      .select("id, title, status, unit, target, current_value, okr_team_objectives(title, bu_id)")
      .ilike("title", searchPattern)
      .limit(limit);

    if (!teamKrsError && teamKrs) {
      const validKrs = teamKrs.filter((kr: any) => kr.okr_team_objectives && kr.okr_team_objectives.bu_id === bu_id);
      addGroup("team_krs", "KRs de Time", validKrs.map((kr: any) => ({
        id: kr.id,
        type: "team_krs",
        title: kr.title,
        subtitle: kr.okr_team_objectives?.title || "Objetivo",
        meta: { status: kr.status, progress: kr.target ? Math.round((kr.current_value || 0) / kr.target * 100) : 0 },
        url: `/okrs/team?kr=${kr.id}`,
        icon: "trending-up",
      })));
    }

    // 8. INICIATIVAS
    const { data: initiatives, error: initError } = await supabase
      .from("okr_initiatives")
      .select("id, name, status, priority, progress, okr_team_key_results(title)")
      .ilike("name", searchPattern)
      .limit(limit);

    if (!initError && initiatives) {
      addGroup("initiatives", "Iniciativas", initiatives.map((i: any) => ({
        id: i.id,
        type: "initiatives",
        title: i.name,
        subtitle: i.okr_team_key_results?.title || "Iniciativa",
        meta: { status: i.status, priority: i.priority, progress: i.progress },
        url: `/okrs?initiative=${i.id}`,
        icon: "rocket",
      })));
    }

    // 9. KPIs
    const { data: kpis, error: kpisError } = await supabase
      .from("kpi_metrics")
      .select("id, name, category, unit, status, target_value")
      .eq("bu_id", bu_id)
      .ilike("name", searchPattern)
      .eq("status", "active")
      .limit(limit);

    if (!kpisError && kpis) {
      addGroup("kpis", "KPIs", kpis.map((k: any) => ({
        id: k.id,
        type: "kpis",
        title: k.name,
        subtitle: k.category || "KPI",
        meta: { unit: k.unit, target: k.target_value },
        url: `/kpis?id=${k.id}`,
        icon: "bar-chart-3",
      })));
    }

    // 10. SEDES/LOCALIZAÇÕES
    const { data: locations, error: locationsError } = await supabase
      .from("bu_locations")
      .select("id, name, type, city, state, status")
      .eq("bu_id", bu_id)
      .ilike("name", searchPattern)
      .eq("status", "active")
      .is("deleted_at", null)
      .limit(limit);

    if (!locationsError && locations) {
      addGroup("locations", "Sedes", locations.map((l: any) => ({
        id: l.id,
        type: "locations",
        title: l.name,
        subtitle: `${l.city || ""}${l.state ? `, ${l.state}` : ""}`.trim() || l.type,
        meta: { type: l.type },
        url: `/settings/business-units?location=${l.id}`,
        icon: "building-2",
      })));
    }

    // ========== ASSETS (with permission check) ==========
    
    // Check user's asset permissions for this BU
    const { data: assetPerms } = await supabase
      .from("asset_permissions")
      .select("role")
      .eq("bu_id", bu_id)
      .eq("user_id", user.id);

    const userAssetRoles = (assetPerms || []).map((p: any) => p.role);
    console.log(`[global-search] Asset roles for user:`, userAssetRoles);

    // Check if user can see each sub-module
    const canSeeInventory = userAssetRoles.some((r: string) => INVENTORY_ROLES.includes(r));
    const canSeeKeys = userAssetRoles.some((r: string) => KEYS_ROLES.includes(r));
    const canSeeGifts = userAssetRoles.some((r: string) => GIFTS_ROLES.includes(r));

    // 11. INVENTÁRIO (if permitted)
    if (canSeeInventory) {
      const { data: inventory, error: invError } = await supabase
        .from("asset_inventory")
        .select("id, name, internal_code, status, current_holder_type, asset_categories(name)")
        .eq("bu_id", bu_id)
        .is("deleted_at", null)
        .or(`name.ilike.${searchPattern},internal_code.ilike.${searchPattern}`)
        .limit(limit);

      if (!invError && inventory) {
        const statusLabels: Record<string, string> = {
          available: "Disponível",
          loaned: "Emprestado",
          maintenance: "Manutenção",
          written_off: "Baixado",
        };
        addGroup("assets_inventory", "Assets · Inventário", inventory.map((i: any) => ({
          id: i.id,
          type: "assets_inventory",
          title: i.name,
          subtitle: i.asset_categories?.name || "Item de inventário",
          meta: { 
            status: i.status, 
            statusLabel: statusLabels[i.status] || i.status,
            internal_code: i.internal_code,
            holder_type: i.current_holder_type,
          },
          url: `/assets/inventory/${i.id}`,
          icon: "package",
        })));
      }
    }

    // 12. CHAVEIROS (if permitted)
    if (canSeeKeys) {
      const { data: keyrings, error: keyringError } = await supabase
        .from("asset_keyrings")
        .select("id, name, tag_number, status, asset_clavicularies(name)")
        .eq("bu_id", bu_id)
        .is("deleted_at", null)
        .or(`name.ilike.${searchPattern},tag_number.ilike.${searchPattern}`)
        .limit(limit);

      if (!keyringError && keyrings) {
        const statusLabels: Record<string, string> = {
          available: "Disponível",
          checked_out: "Em uso",
          lost: "Perdido",
          disabled: "Inativo",
        };
        addGroup("assets_keyrings", "Assets · Chaveiros", keyrings.map((k: any) => ({
          id: k.id,
          type: "assets_keyrings",
          title: k.name,
          subtitle: k.asset_clavicularies?.name || `Tag: ${k.tag_number}`,
          meta: { 
            status: k.status,
            statusLabel: statusLabels[k.status] || k.status,
            tag_number: k.tag_number,
          },
          url: `/assets/keys/keyrings/${k.id}`,
          icon: "key-round",
        })));
      }

      // 13. CHAVES INDIVIDUAIS
      const { data: keys, error: keysError } = await supabase
        .from("asset_keys")
        .select("id, tag_number, description, access_type, status, asset_keyrings(name)")
        .eq("bu_id", bu_id)
        .is("deleted_at", null)
        .or(`tag_number.ilike.${searchPattern},description.ilike.${searchPattern}`)
        .limit(limit);

      if (!keysError && keys) {
        const accessLabels: Record<string, string> = {
          door: "Porta",
          drawer: "Gaveta",
          vehicle: "Veículo",
          safe: "Cofre",
          mailbox: "Caixa de correio",
          cabinet: "Armário",
          gate: "Portão",
          other: "Outro",
        };
        addGroup("assets_keys", "Assets · Chaves", keys.map((k: any) => ({
          id: k.id,
          type: "assets_keys",
          title: k.description || `Chave ${k.tag_number}`,
          subtitle: `${accessLabels[k.access_type] || k.access_type}${k.asset_keyrings ? ` · ${k.asset_keyrings.name}` : ""}`,
          meta: { 
            access_type: k.access_type,
            status: k.status,
            tag_number: k.tag_number,
          },
          url: `/assets/keys/keys/${k.id}`,
          icon: "key",
        })));
      }
    }

    // 14. BRINDES - ITENS (if permitted)
    if (canSeeGifts) {
      const { data: giftItems, error: giftItemsError } = await supabase
        .from("asset_gift_items")
        .select("id, name, category, status")
        .eq("bu_id", bu_id)
        .is("deleted_at", null)
        .or(`name.ilike.${searchPattern},category.ilike.${searchPattern}`)
        .limit(limit);

      if (!giftItemsError && giftItems) {
        const statusLabels: Record<string, string> = {
          active: "Ativo",
          discontinued: "Descontinuado",
        };
        addGroup("assets_gifts_items", "Assets · Brindes (Itens)", giftItems.map((g: any) => ({
          id: g.id,
          type: "assets_gifts_items",
          title: g.name,
          subtitle: g.category || "Brinde",
          meta: { 
            category: g.category,
            status: g.status,
            statusLabel: statusLabels[g.status] || g.status,
          },
          url: `/assets/gifts/items/${g.id}`,
          icon: "gift",
        })));
      }

      // 15. BRINDES - LOTES
      const { data: giftBatches, error: giftBatchesError } = await supabase
        .from("asset_gift_batches")
        .select("id, batch_code, campaign, quantity_available, quantity_in, asset_gift_items(name)")
        .eq("bu_id", bu_id)
        .is("deleted_at", null)
        .or(`batch_code.ilike.${searchPattern},campaign.ilike.${searchPattern}`)
        .limit(limit);

      if (!giftBatchesError && giftBatches) {
        addGroup("assets_gifts_batches", "Assets · Brindes (Lotes)", giftBatches.map((b: any) => ({
          id: b.id,
          type: "assets_gifts_batches",
          title: b.batch_code || `Lote de ${b.asset_gift_items?.name || "brinde"}`,
          subtitle: b.campaign || b.asset_gift_items?.name || "Lote",
          meta: { 
            quantity_available: b.quantity_available,
            quantity_in: b.quantity_in,
            campaign: b.campaign,
          },
          url: `/assets/gifts/batches/${b.id}`,
          icon: "package-open",
        })));
      }
    }

    console.log(`[global-search] Found ${groups.length} groups with results`);

    const response: SearchResponse = { query, groups };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const error = err as Error;
    console.error("[global-search] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
