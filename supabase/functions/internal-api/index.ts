// Internal API — autenticação por Bearer token (env INTERNAL_API_TOKEN)
// Expõe usuários, BUs, áreas e times para consumidores internos (Flow etc.)
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INTERNAL_API_TOKEN = Deno.env.get("INTERNAL_API_TOKEN") ?? "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// --- Helpers ---
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function err(code: string, message: string, status: number) {
  return json({ error: { code, message } }, status);
}

function authenticate(req: Request): boolean {
  const header = req.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) return false;
  const token = header.slice(7).trim();
  if (!INTERNAL_API_TOKEN || !token) return false;
  return timingSafeEqual(token, INTERNAL_API_TOKEN);
}

// --- Mapping ---
type ProfileRow = {
  id: string;
  display_name: string | null;
  first_name: string | null;
  email: string | null;
  work_email: string | null;
  photo_url: string | null;
  employment_status: string | null;
  bu_id: string | null;
  team_id: string | null;
  job_title_id: string | null;
  created_at: string;
  updated_at: string;
};

async function listMemberships(profileIds: string[]) {
  if (!profileIds.length) return new Map<string, any[]>();
  const { data, error } = await supabase
    .from("bu_user_memberships")
    .select(
      "profile_id, bu_id, role_in_bu, is_default, job_title_id, deleted_at, created_at, bu_units!inner(id,name,slug), job_titles(id,name)",
    )
    .in("profile_id", profileIds)
    .is("deleted_at", null);
  if (error) throw error;
  const grouped = new Map<string, any[]>();
  for (const m of data ?? []) {
    const arr = grouped.get(m.profile_id) ?? [];
    arr.push(m);
    grouped.set(m.profile_id, arr);
  }
  return grouped;
}

async function teamAreaMap(teamIds: string[]) {
  if (!teamIds.length) return new Map<string, any>();
  const { data, error } = await supabase
    .from("teams")
    .select("id, name, slug, bu_id, area_id, areas(id, name, slug)")
    .in("id", teamIds);
  if (error) throw error;
  const map = new Map<string, any>();
  for (const t of data ?? []) map.set(t.id, t);
  return map;
}

function shapeUser(p: ProfileRow, memberships: any[], teamMap: Map<string, any>) {
  const primaryTeam = p.team_id ? teamMap.get(p.team_id) : null;
  const bus = memberships.map((m) => {
    const team = m.bu_id === p.bu_id ? primaryTeam : null;
    return {
      bu_id: m.bu_id,
      bu_slug: m.bu_units?.slug ?? null,
      bu_name: m.bu_units?.name ?? null,
      is_primary: !!m.is_default,
      role_in_bu: m.role_in_bu,
      role_title: m.job_titles?.name ?? null,
      status: m.deleted_at ? "inactive" : "active",
      area: team?.areas
        ? { id: team.areas.id, name: team.areas.name, slug: team.areas.slug }
        : null,
      team: team
        ? { id: team.id, name: team.name, slug: team.slug }
        : null,
    };
  });

  return {
    next_user_id: p.id,
    full_name: p.display_name,
    preferred_name: p.first_name,
    email: p.email ?? p.work_email ?? null,
    work_email: p.work_email,
    avatar_url: p.photo_url,
    status: p.employment_status ?? "active",
    business_units: bus,
    created_at: p.created_at,
    updated_at: p.updated_at,
  };
}

// --- Handlers ---
async function handleHealth() {
  return json({ status: "ok", service: "internal-api", time: new Date().toISOString() });
}

async function handleListUsers(url: URL) {
  const buSlug = url.searchParams.get("business_unit_slug");
  const areaSlug = url.searchParams.get("area_slug");
  const teamSlug = url.searchParams.get("team_slug");
  const status = url.searchParams.get("status");
  const search = url.searchParams.get("search");
  const includeInactive = url.searchParams.get("include_inactive") === "true";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10)),
  );

  // resolver slugs em ids
  let buId: string | null = null;
  if (buSlug) {
    const { data } = await supabase.from("bu_units").select("id").eq("slug", buSlug).maybeSingle();
    if (!data) return err("NOT_FOUND", `business unit '${buSlug}' not found`, 404);
    buId = data.id;
  }
  let areaId: string | null = null;
  if (areaSlug) {
    let q = supabase.from("areas").select("id, bu_id").eq("slug", areaSlug);
    if (buId) q = q.eq("bu_id", buId);
    const { data } = await q.maybeSingle();
    if (!data) return err("NOT_FOUND", `area '${areaSlug}' not found`, 404);
    areaId = data.id;
  }
  let teamId: string | null = null;
  if (teamSlug) {
    let q = supabase.from("teams").select("id, bu_id, area_id").eq("slug", teamSlug);
    if (buId) q = q.eq("bu_id", buId);
    if (areaId) q = q.eq("area_id", areaId);
    const { data } = await q.maybeSingle();
    if (!data) return err("NOT_FOUND", `team '${teamSlug}' not found`, 404);
    teamId = data.id;
  }

  // se há filtro por bu/area/team — restringimos via memberships
  let profileIdsFilter: string[] | null = null;
  if (buId || areaId || teamId) {
    let mq = supabase
      .from("bu_user_memberships")
      .select("profile_id")
      .is("deleted_at", null);
    if (buId) mq = mq.eq("bu_id", buId);
    const { data: memberRows, error: memberErr } = await mq;
    if (memberErr) return err("INTERNAL_ERROR", memberErr.message, 500);
    let ids = (memberRows ?? []).map((r) => r.profile_id).filter(Boolean);

    if (teamId) {
      const { data: teamMembers } = await supabase
        .from("profiles")
        .select("id")
        .eq("team_id", teamId)
        .is("deleted_at", null);
      const teamSet = new Set((teamMembers ?? []).map((r) => r.id));
      ids = ids.filter((id) => teamSet.has(id));
    } else if (areaId) {
      const { data: areaTeams } = await supabase
        .from("teams")
        .select("id")
        .eq("area_id", areaId)
        .is("deleted_at", null);
      const teamIds = (areaTeams ?? []).map((t) => t.id);
      if (!teamIds.length) {
        profileIdsFilter = [];
      } else {
        const { data: teamMembers } = await supabase
          .from("profiles")
          .select("id")
          .in("team_id", teamIds)
          .is("deleted_at", null);
        const tSet = new Set((teamMembers ?? []).map((r) => r.id));
        ids = ids.filter((id) => tSet.has(id));
      }
    }

    profileIdsFilter = profileIdsFilter ?? Array.from(new Set(ids));
    if (!profileIdsFilter.length) {
      return json({ data: [], pagination: { page, limit, total: 0 } });
    }
  }

  let q = supabase
    .from("profiles")
    .select(
      "id, display_name, first_name, email, work_email, photo_url, employment_status, bu_id, team_id, job_title_id, created_at, updated_at",
      { count: "exact" },
    )
    .is("deleted_at", null);

  if (!includeInactive) q = q.neq("employment_status", "terminated");
  if (status) q = q.eq("employment_status", status);
  if (search) q = q.or(`display_name.ilike.%${search}%,email.ilike.%${search}%,work_email.ilike.%${search}%`);
  if (profileIdsFilter) q = q.in("id", profileIdsFilter);

  q = q.order("display_name", { ascending: true }).range((page - 1) * limit, page * limit - 1);

  const { data: profiles, count, error } = await q;
  if (error) return err("INTERNAL_ERROR", error.message, 500);

  const profileIds = (profiles ?? []).map((p) => p.id);
  const teamIds = (profiles ?? []).map((p) => p.team_id).filter(Boolean) as string[];
  const [memMap, tMap] = await Promise.all([listMemberships(profileIds), teamAreaMap(teamIds)]);

  const data = (profiles ?? []).map((p) => shapeUser(p as ProfileRow, memMap.get(p.id) ?? [], tMap));

  return json({ data, pagination: { page, limit, total: count ?? data.length } });
}

async function handleGetUser(id: string) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "id, display_name, first_name, email, work_email, photo_url, employment_status, bu_id, team_id, job_title_id, created_at, updated_at",
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) return err("INTERNAL_ERROR", error.message, 500);
  if (!profile) return err("NOT_FOUND", "user not found", 404);
  const [memMap, tMap] = await Promise.all([
    listMemberships([profile.id]),
    teamAreaMap(profile.team_id ? [profile.team_id] : []),
  ]);
  return json({ data: shapeUser(profile as ProfileRow, memMap.get(profile.id) ?? [], tMap) });
}

async function handleUserByEmail(url: URL) {
  const email = url.searchParams.get("email");
  if (!email) return err("BAD_REQUEST", "query param 'email' is required", 400);
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "id, display_name, first_name, email, work_email, photo_url, employment_status, bu_id, team_id, job_title_id, created_at, updated_at",
    )
    .or(`email.eq.${email},work_email.eq.${email}`)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) return err("INTERNAL_ERROR", error.message, 500);
  if (!profile) return err("NOT_FOUND", "user not found", 404);
  const [memMap, tMap] = await Promise.all([
    listMemberships([profile.id]),
    teamAreaMap(profile.team_id ? [profile.team_id] : []),
  ]);
  return json({ data: shapeUser(profile as ProfileRow, memMap.get(profile.id) ?? [], tMap) });
}

async function handleListBusinessUnits(url: URL) {
  const status = url.searchParams.get("status");
  const search = url.searchParams.get("search");
  let q = supabase
    .from("bu_units")
    .select("id, slug, name, legal_entity, cnpj, primary_color, logo_url, status, allowed_email_domains, created_at, updated_at");
  if (status) q = q.eq("status", status);
  if (search) q = q.ilike("name", `%${search}%`);
  const { data, error } = await q.order("name");
  if (error) return err("INTERNAL_ERROR", error.message, 500);
  return json({ data });
}

async function handleListAreas(url: URL) {
  const buSlug = url.searchParams.get("business_unit_slug");
  const search = url.searchParams.get("search");
  let q = supabase
    .from("areas")
    .select("id, slug, name, description, status, bu_id, bu_units!inner(id,slug,name)")
    .is("deleted_at", null);
  if (buSlug) q = q.eq("bu_units.slug", buSlug);
  if (search) q = q.ilike("name", `%${search}%`);
  const { data, error } = await q.order("name");
  if (error) return err("INTERNAL_ERROR", error.message, 500);
  return json({ data });
}

async function handleListTeams(url: URL) {
  const buSlug = url.searchParams.get("business_unit_slug");
  const areaSlug = url.searchParams.get("area_slug");
  const search = url.searchParams.get("search");
  let q = supabase
    .from("teams")
    .select(
      "id, slug, name, description, status, bu_id, area_id, bu_units!inner(id,slug,name), areas(id,slug,name)",
    )
    .is("deleted_at", null);
  if (buSlug) q = q.eq("bu_units.slug", buSlug);
  if (areaSlug) q = q.eq("areas.slug", areaSlug);
  if (search) q = q.ilike("name", `%${search}%`);
  const { data, error } = await q.order("name");
  if (error) return err("INTERNAL_ERROR", error.message, 500);
  return json({ data });
}

// --- Router ---
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  // pathname: /internal-api/<rest> ou /functions/v1/internal-api/<rest>
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("internal-api");
  const segs = idx >= 0 ? parts.slice(idx + 1) : parts;
  const route = "/" + segs.join("/");

  try {
    if (route === "/health" || route === "/") return handleHealth();

    if (!authenticate(req)) {
      return err("UNAUTHORIZED", "Invalid or missing internal API token.", 401);
    }

    if (req.method === "GET" && route === "/users") return await handleListUsers(url);
    if (req.method === "GET" && route === "/users/by-email") return await handleUserByEmail(url);
    if (req.method === "GET" && segs[0] === "users" && segs.length === 2)
      return await handleGetUser(segs[1]);
    if (req.method === "GET" && route === "/business-units") return await handleListBusinessUnits(url);
    if (req.method === "GET" && route === "/areas") return await handleListAreas(url);
    if (req.method === "GET" && route === "/teams") return await handleListTeams(url);

    return err("NOT_FOUND", `route ${req.method} ${route} not found`, 404);
  } catch (e) {
    console.error("[internal-api] error", e);
    return err("INTERNAL_ERROR", (e as Error).message ?? "unexpected error", 500);
  }
});
