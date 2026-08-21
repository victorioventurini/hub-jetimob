// BU API — gateway público autenticado por chave de API por unidade de negócio.
// Autenticação: header `x-api-key: jet_...` (ou Authorization: Bearer jet_...)
// Todo acesso é escopado à BU dona da chave e validado por escopos <modulo>:<read|write>.
import { createClient } from "npm:@supabase/supabase-js@2";
import { hasScope } from "../_shared/bu-api-scopes.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-current-bu-id, x-client-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fail(code: string, message: string, status: number) {
  return json({ error: { code, message } }, status);
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface ApiKeyRow {
  id: string;
  bu_id: string;
  scopes: string[];
  status: string;
  expires_at: string | null;
  rate_limit_per_minute: number;
  created_by: string | null;
  deleted_at: string | null;
}

function extractKey(req: Request): string | null {
  const direct = req.headers.get("x-api-key");
  if (direct?.trim()) return direct.trim();
  const auth = req.headers.get("authorization") ?? "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim();
    if (token.startsWith("jet_")) return token;
  }
  return null;
}

async function logUsage(params: {
  apiKeyId: string | null;
  buId: string | null;
  method: string;
  route: string;
  status: number;
  latencyMs: number;
  ip: string | null;
  errorMessage?: string | null;
}) {
  if (!params.buId) return;
  await admin.from("bu_api_key_usage_logs").insert({
    api_key_id: params.apiKeyId,
    bu_id: params.buId,
    method: params.method,
    route: params.route,
    status_code: params.status,
    latency_ms: params.latencyMs,
    ip_address: params.ip,
    error_message: params.errorMessage ?? null,
  });
}

// ------------------------------------------------------------------
// Handlers
// ------------------------------------------------------------------

function paging(url: URL) {
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100) || 100, 500);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0) || 0, 0);
  return { limit, offset, to: offset + limit - 1 };
}

async function handleUsers(
  segments: string[],
  url: URL,
  buId: string,
): Promise<Response> {
  const { limit, offset, to } = paging(url);

  if (segments[1] === "by-email") {
    const email = url.searchParams.get("email")?.trim().toLowerCase();
    if (!email) return fail("BAD_REQUEST", "Parâmetro 'email' é obrigatório.", 400);
    const { data, error } = await admin
      .from("profiles")
      .select(
        "id, display_name, first_name, last_name, email, work_email, photo_url, employment_status, team_id, job_title_id, work_mode, bu_id",
      )
      .or(`email.eq.${email},work_email.eq.${email}`)
      .is("deleted_at", null)
      .limit(5);
    if (error) throw error;
    const match = (data ?? []).find((p) => p.bu_id === buId) ?? null;
    if (!match) return fail("NOT_FOUND", "Usuário não encontrado nesta BU.", 404);
    return json({ data: match });
  }

  if (segments[1]) {
    const { data, error } = await admin
      .from("profiles")
      .select(
        "id, display_name, first_name, last_name, email, work_email, photo_url, employment_status, team_id, job_title_id, work_mode, bu_id",
      )
      .eq("id", segments[1])
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    if (!data) return fail("NOT_FOUND", "Usuário não encontrado.", 404);
    const { data: membership } = await admin
      .from("bu_user_memberships")
      .select("id")
      .eq("profile_id", segments[1])
      .eq("bu_id", buId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!membership && data.bu_id !== buId) {
      return fail("NOT_FOUND", "Usuário não encontrado nesta BU.", 404);
    }
    return json({ data });
  }

  const { data: memberships, error: mErr } = await admin
    .from("bu_user_memberships")
    .select("profile_id, role_in_bu")
    .eq("bu_id", buId)
    .is("deleted_at", null);
  if (mErr) throw mErr;
  const ids = (memberships ?? []).map((m) => m.profile_id);
  if (!ids.length) return json({ data: [], pagination: { limit, offset, total: 0 } });

  const { data, error, count } = await admin
    .from("profiles")
    .select(
      "id, display_name, first_name, last_name, email, work_email, photo_url, employment_status, team_id, job_title_id, work_mode",
      { count: "exact" },
    )
    .in("id", ids)
    .is("deleted_at", null)
    .order("display_name", { ascending: true })
    .range(offset, to);
  if (error) throw error;

  const roleByProfile = new Map(
    (memberships ?? []).map((m) => [m.profile_id, m.role_in_bu]),
  );
  return json({
    data: (data ?? []).map((p) => ({ ...p, role_in_bu: roleByProfile.get(p.id) ?? null })),
    pagination: { limit, offset, total: count ?? 0 },
  });
}

async function handleTeams(url: URL, buId: string): Promise<Response> {
  const { limit, offset, to } = paging(url);
  const { data, error, count } = await admin
    .from("teams")
    .select("id, name, slug, description, area_id, parent_team_id, leader_user_id, status, member_count, created_at", { count: "exact" })
    .eq("bu_id", buId)
    .is("deleted_at", null)
    .order("name", { ascending: true })
    .range(offset, to);
  if (error) throw error;
  return json({ data: data ?? [], pagination: { limit, offset, total: count ?? 0 } });
}

async function handleAreas(url: URL, buId: string): Promise<Response> {
  const { limit, offset, to } = paging(url);
  const { data, error, count } = await admin
    .from("areas")
    .select("id, name, slug, description, leader_user_id, co_leader_user_id, status, color, icon, created_at", { count: "exact" })
    .eq("bu_id", buId)
    .is("deleted_at", null)
    .order("name", { ascending: true })
    .range(offset, to);
  if (error) throw error;
  return json({ data: data ?? [], pagination: { limit, offset, total: count ?? 0 } });
}

async function handleOkrs(
  method: string,
  segments: string[],
  url: URL,
  body: Record<string, unknown> | null,
  key: ApiKeyRow,
): Promise<Response> {
  const buId = key.bu_id;
  const { limit, offset, to } = paging(url);

  // POST /okrs/key-results/:id/checkins
  if (method === "POST") {
    if (segments[1] !== "key-results" || !segments[2] || segments[3] !== "checkins") {
      return fail("NOT_FOUND", "Endpoint de escrita não encontrado.", 404);
    }
    if (!hasScope(key.scopes, "okrs:write")) {
      return fail("FORBIDDEN", "A chave não possui o escopo okrs:write.", 403);
    }
    const currentValue = Number(body?.current_value);
    if (!Number.isFinite(currentValue)) {
      return fail("BAD_REQUEST", "Campo 'current_value' numérico é obrigatório.", 400);
    }
    const { data: kr, error: krErr } = await admin
      .from("okr_team_key_results")
      .select("id, bu_id, team_id, current_value, status, deleted_at")
      .eq("id", segments[2])
      .maybeSingle();
    if (krErr) throw krErr;
    if (!kr || kr.deleted_at || kr.bu_id !== buId) {
      return fail("NOT_FOUND", "KR não encontrado nesta BU.", 404);
    }
    const { data: checkin, error: insErr } = await admin
      .from("okr_checkins")
      .insert({
        kr_id: kr.id,
        bu_id: buId,
        team_id: kr.team_id,
        date: (body?.date as string) ?? new Date().toISOString().slice(0, 10),
        previous_value: kr.current_value,
        current_value: currentValue,
        confidence: (body?.confidence as string) ?? "medium",
        blockers: (body?.blockers as string) ?? null,
        comments: (body?.comments as string) ?? null,
        user_id: key.created_by,
      })
      .select("id, kr_id, date, previous_value, current_value, confidence")
      .single();
    if (insErr) throw insErr;
    await admin
      .from("okr_team_key_results")
      .update({ current_value: currentValue, last_checkin_at: new Date().toISOString() })
      .eq("id", kr.id);
    return json({ data: checkin }, 201);
  }

  if (segments[1] === "objectives") {
    const scope = url.searchParams.get("scope") ?? "team";
    const cycleId = url.searchParams.get("cycle_id");
    if (scope === "org") {
      let q = admin
        .from("okr_org_objectives")
        .select(
          "id, title, description, year, cycle_id, owner_user_id, status, health_score, health_status, start_date, end_date, created_at",
          { count: "exact" },
        )
        .eq("bu_id", buId)
        .is("deleted_at", null)
        .is("cancelled_at", null);
      if (cycleId) q = q.eq("cycle_id", cycleId);
      const { data, error, count } = await q
        .order("created_at", { ascending: false })
        .range(offset, to);
      if (error) throw error;
      return json({ data: data ?? [], pagination: { limit, offset, total: count ?? 0 } });
    }
    let q = admin
      .from("okr_team_objectives")
      .select(
        "id, title, description, team_id, org_objective_id, cycle_id, year, cycle_type, owner_user_id, status, is_shared, health_score, health_status, kr_count, avg_progress, created_at",
        { count: "exact" },
      )
      .eq("bu_id", buId)
      .is("deleted_at", null)
      .is("cancelled_at", null);
    if (cycleId) q = q.eq("cycle_id", cycleId);
    const teamId = url.searchParams.get("team_id");
    if (teamId) q = q.eq("team_id", teamId);
    const { data, error, count } = await q
      .order("created_at", { ascending: false })
      .range(offset, to);
    if (error) throw error;
    return json({ data: data ?? [], pagination: { limit, offset, total: count ?? 0 } });
  }

  if (segments[1] === "key-results") {
    const objectiveId = url.searchParams.get("objective_id");
    const scope = url.searchParams.get("scope") ?? "team";
    if (scope === "org") {
      let q = admin
        .from("okr_org_key_results")
        .select(
          "id, org_objective_id, title, metric_id, baseline, current_value, target, direction, unit, owner_user_id, status, created_at",
          { count: "exact" },
        )
        .eq("bu_id", buId)
        .is("deleted_at", null)
        .is("cancelled_at", null);
      if (objectiveId) q = q.eq("org_objective_id", objectiveId);
      const { data, error, count } = await q.range(offset, to);
      if (error) throw error;
      return json({ data: data ?? [], pagination: { limit, offset, total: count ?? 0 } });
    }
    let q = admin
      .from("okr_team_key_results")
      .select(
        "id, team_objective_id, team_id, title, type, metric_id, baseline, current_value, target, direction, unit, owner_user_id, status, linked_org_kr_id, last_checkin_at, created_at",
        { count: "exact" },
      )
      .eq("bu_id", buId)
      .is("deleted_at", null)
      .is("cancelled_at", null);
    if (objectiveId) q = q.eq("team_objective_id", objectiveId);
    const { data, error, count } = await q.range(offset, to);
    if (error) throw error;
    return json({ data: data ?? [], pagination: { limit, offset, total: count ?? 0 } });
  }

  if (segments[1] === "checkins") {
    const krId = url.searchParams.get("kr_id");
    let q = admin
      .from("okr_checkins")
      .select(
        "id, kr_id, team_id, date, previous_value, current_value, confidence, blockers, comments, user_id, created_at",
        { count: "exact" },
      )
      .eq("bu_id", buId);
    if (krId) q = q.eq("kr_id", krId);
    const { data, error, count } = await q
      .order("date", { ascending: false })
      .range(offset, to);
    if (error) throw error;
    return json({ data: data ?? [], pagination: { limit, offset, total: count ?? 0 } });
  }

  return fail("NOT_FOUND", "Endpoint de OKRs não encontrado.", 404);
}

async function handleKpis(
  method: string,
  segments: string[],
  url: URL,
  body: Record<string, unknown> | null,
  key: ApiKeyRow,
): Promise<Response> {
  const buId = key.bu_id;
  const { limit, offset, to } = paging(url);

  if (method === "POST") {
    if (!segments[1] || segments[2] !== "values") {
      return fail("NOT_FOUND", "Endpoint de escrita não encontrado.", 404);
    }
    if (!hasScope(key.scopes, "kpis:write")) {
      return fail("FORBIDDEN", "A chave não possui o escopo kpis:write.", 403);
    }
    const value = Number(body?.value);
    const referenceDate = body?.reference_date as string | undefined;
    if (!Number.isFinite(value) || !referenceDate) {
      return fail(
        "BAD_REQUEST",
        "Campos 'value' (número) e 'reference_date' (YYYY-MM-DD) são obrigatórios.",
        400,
      );
    }
    const { data: kpi, error: kpiErr } = await admin
      .from("kpi_metrics")
      .select("id, bu_id, deleted_at, indicator_type")
      .eq("id", segments[1])
      .maybeSingle();
    if (kpiErr) throw kpiErr;
    if (!kpi || kpi.deleted_at || kpi.bu_id !== buId) {
      return fail("NOT_FOUND", "KPI não encontrado nesta BU.", 404);
    }
    const { data, error } = await admin
      .from("kpi_values")
      .insert({
        kpi_id: kpi.id,
        value,
        reference_date: referenceDate,
        input_type: (body?.input_type as string) ?? "consolidated",
        source: "api",
        notes: (body?.notes as string) ?? null,
        created_by: key.created_by,
      })
      .select("id, kpi_id, value, reference_date, input_type, source, created_at")
      .single();
    if (error) throw error;
    return json({ data }, 201);
  }

  if (segments[1] && segments[2] === "values") {
    const { data: kpi } = await admin
      .from("kpi_metrics")
      .select("id, bu_id, deleted_at")
      .eq("id", segments[1])
      .maybeSingle();
    if (!kpi || kpi.deleted_at || kpi.bu_id !== buId) {
      return fail("NOT_FOUND", "KPI não encontrado nesta BU.", 404);
    }
    const { data, error, count } = await admin
      .from("kpi_values")
      .select(
        "id, kpi_id, value, reference_date, period_start, period_end, period_label, input_type, rag_status, source, notes, created_at",
        { count: "exact" },
      )
      .eq("kpi_id", segments[1])
      .order("reference_date", { ascending: false })
      .range(offset, to);
    if (error) throw error;
    return json({ data: data ?? [], pagination: { limit, offset, total: count ?? 0 } });
  }

  const kpiSelect =
    "id, name, description, category, indicator_type, unit, direction, frequency, consolidation_frequency, update_frequency, update_mode, target_value, target_source, lifecycle_status, status, owner_user_id, team_id, area_id, responsible_team_id, responsible_area_id, scope, is_global, created_at, updated_at";

  if (segments[1]) {
    const { data, error } = await admin
      .from("kpi_metrics")
      .select(kpiSelect)
      .eq("id", segments[1])
      .eq("bu_id", buId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    if (!data) return fail("NOT_FOUND", "KPI não encontrado nesta BU.", 404);
    return json({ data });
  }

  let q = admin
    .from("kpi_metrics")
    .select(kpiSelect, { count: "exact" })
    .eq("bu_id", buId)
    .is("deleted_at", null);
  const indicatorType = url.searchParams.get("indicator_type");
  if (indicatorType) q = q.eq("indicator_type", indicatorType);
  const { data, error, count } = await q
    .order("name", { ascending: true })
    .range(offset, to);
  if (error) throw error;
  return json({ data: data ?? [], pagination: { limit, offset, total: count ?? 0 } });
}

async function handleProjects(
  segments: string[],
  url: URL,
  buId: string,
): Promise<Response> {
  const { limit, offset, to } = paging(url);

  if (segments[1] && segments[2] === "milestones") {
    const { data, error, count } = await admin
      .from("project_milestones")
      .select(
        "id, project_id, name, owner_id, status, start_date, due_date, sort_order, notes, created_at",
        { count: "exact" },
      )
      .eq("project_id", segments[1])
      .eq("bu_id", buId)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true })
      .range(offset, to);
    if (error) throw error;
    return json({ data: data ?? [], pagination: { limit, offset, total: count ?? 0 } });
  }

  if (segments[1]) {
    const { data, error } = await admin
      .from("projects")
      .select(
        "id, name, description, owner_id, status, start_date, due_date, external_url, created_at, updated_at",
      )
      .eq("id", segments[1])
      .eq("bu_id", buId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    if (!data) return fail("NOT_FOUND", "Projeto não encontrado nesta BU.", 404);
    return json({ data });
  }

  let q = admin
    .from("projects")
    .select(
      "id, name, description, owner_id, status, start_date, due_date, external_url, created_at, updated_at",
      { count: "exact" },
    )
    .eq("bu_id", buId)
    .is("deleted_at", null);
  const status = url.searchParams.get("status");
  if (status) q = q.eq("status", status);
  const { data, error, count } = await q
    .order("created_at", { ascending: false })
    .range(offset, to);
  if (error) throw error;
  return json({ data: data ?? [], pagination: { limit, offset, total: count ?? 0 } });
}

async function handleTickets(
  method: string,
  segments: string[],
  url: URL,
  body: Record<string, unknown> | null,
  key: ApiKeyRow,
): Promise<Response> {
  const buId = key.bu_id;
  const { limit, offset, to } = paging(url);
  const ticketSelect =
    "id, type, title, status, visibility, expected_due_at, created_by_user_id, owner_user_id, category_id, subcategory_id, external_company_id, created_at, updated_at";

  if (method === "POST") {
    if (!hasScope(key.scopes, "tickets:write")) {
      return fail("FORBIDDEN", "A chave não possui o escopo tickets:write.", 403);
    }
    const title = (body?.title as string)?.trim();
    if (!title) return fail("BAD_REQUEST", "Campo 'title' é obrigatório.", 400);
    const { data, error } = await admin
      .from("tickets")
      .insert({
        bu_id: buId,
        title,
        type: (body?.type as string) ?? "internal",
        status: (body?.status as string) ?? "waiting",
        visibility: (body?.visibility as string) ?? "bu_all",
        category_id: (body?.category_id as string) ?? null,
        subcategory_id: (body?.subcategory_id as string) ?? null,
        owner_user_id: (body?.owner_user_id as string) ?? null,
        expected_due_at: (body?.expected_due_at as string) ?? null,
        created_by_user_id: key.created_by,
      })
      .select(ticketSelect)
      .single();
    if (error) throw error;
    return json({ data }, 201);
  }

  if (segments[1]) {
    const { data, error } = await admin
      .from("tickets")
      .select(ticketSelect)
      .eq("id", segments[1])
      .eq("bu_id", buId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    if (!data) return fail("NOT_FOUND", "Ticket não encontrado nesta BU.", 404);
    return json({ data });
  }

  let q = admin
    .from("tickets")
    .select(ticketSelect, { count: "exact" })
    .eq("bu_id", buId)
    .is("deleted_at", null);
  const status = url.searchParams.get("status");
  if (status) q = q.eq("status", status);
  const type = url.searchParams.get("type");
  if (type) q = q.eq("type", type);
  const { data, error, count } = await q
    .order("created_at", { ascending: false })
    .range(offset, to);
  if (error) throw error;
  return json({ data: data ?? [], pagination: { limit, offset, total: count ?? 0 } });
}

async function handleRituals(
  segments: string[],
  url: URL,
  buId: string,
): Promise<Response> {
  if (segments[1] !== "occurrences") {
    return fail("NOT_FOUND", "Endpoint de ritos não encontrado.", 404);
  }
  const { limit, offset, to } = paging(url);
  let q = admin
    .from("ritual_occurrences")
    .select(
      "id, cadence_id, wizard_type, team_id, planned_date, actual_date, status, session_id, notes, created_at",
      { count: "exact" },
    )
    .eq("bu_id", buId);
  const wizardType = url.searchParams.get("wizard_type");
  if (wizardType) q = q.eq("wizard_type", wizardType);
  const teamId = url.searchParams.get("team_id");
  if (teamId) q = q.eq("team_id", teamId);
  const { data, error, count } = await q
    .order("planned_date", { ascending: false })
    .range(offset, to);
  if (error) throw error;
  return json({ data: data ?? [], pagination: { limit, offset, total: count ?? 0 } });
}

// ------------------------------------------------------------------
// Router
// ------------------------------------------------------------------

const MODULE_BY_SEGMENT: Record<string, string> = {
  users: "users",
  teams: "users",
  areas: "users",
  okrs: "okrs",
  kpis: "kpis",
  projects: "projects",
  tickets: "tickets",
  rituals: "rituals",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startedAt = Date.now();
  const url = new URL(req.url);
  const segments = url.pathname
    .split("/")
    .filter(Boolean)
    .filter((s) => s !== "bu-api" && s !== "functions" && s !== "v1");
  const route = "/" + segments.join("/");
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("cf-connecting-ip");

  let apiKey: ApiKeyRow | null = null;

  try {
    if (segments[0] === "health") {
      return json({ status: "ok", timestamp: new Date().toISOString() });
    }

    const rawKey = extractKey(req);
    if (!rawKey) {
      return fail(
        "UNAUTHORIZED",
        "Informe a chave de API no header 'x-api-key'.",
        401,
      );
    }

    const keyHash = await sha256Hex(rawKey);
    const { data: keyRow, error: keyErr } = await admin
      .from("bu_api_keys")
      .select(
        "id, bu_id, scopes, status, expires_at, rate_limit_per_minute, created_by, deleted_at",
      )
      .eq("key_hash", keyHash)
      .maybeSingle();
    if (keyErr) throw keyErr;

    if (!keyRow || keyRow.deleted_at) {
      return fail("UNAUTHORIZED", "Chave de API inválida.", 401);
    }
    apiKey = keyRow as ApiKeyRow;

    if (apiKey.status !== "active") {
      return fail("UNAUTHORIZED", "Chave de API revogada.", 401);
    }
    if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
      return fail("UNAUTHORIZED", "Chave de API expirada.", 401);
    }

    // Rate limit (janela de 1 minuto)
    const windowStart = new Date(Date.now() - 60_000).toISOString();
    const { count: recentCount } = await admin
      .from("bu_api_key_usage_logs")
      .select("id", { count: "exact", head: true })
      .eq("api_key_id", apiKey.id)
      .gte("created_at", windowStart);
    if ((recentCount ?? 0) >= apiKey.rate_limit_per_minute) {
      const res = fail(
        "RATE_LIMITED",
        `Limite de ${apiKey.rate_limit_per_minute} chamadas por minuto atingido.`,
        429,
      );
      res.headers.set("Retry-After", "60");
      await logUsage({
        apiKeyId: apiKey.id,
        buId: apiKey.bu_id,
        method: req.method,
        route,
        status: 429,
        latencyMs: Date.now() - startedAt,
        ip,
        errorMessage: "rate limited",
      });
      return res;
    }

    const moduleKey = MODULE_BY_SEGMENT[segments[0] ?? ""];
    if (!moduleKey) {
      return fail("NOT_FOUND", `Rota '${route}' não existe.`, 404);
    }
    if (!hasScope(apiKey.scopes, `${moduleKey}:read`)) {
      return fail(
        "FORBIDDEN",
        `A chave não possui o escopo ${moduleKey}:read.`,
        403,
      );
    }
    if (req.method !== "GET" && req.method !== "POST") {
      return fail("METHOD_NOT_ALLOWED", "Método não suportado.", 405);
    }

    let body: Record<string, unknown> | null = null;
    if (req.method === "POST") {
      try {
        body = await req.json();
      } catch {
        return fail("BAD_REQUEST", "Corpo da requisição deve ser JSON válido.", 400);
      }
    }

    let response: Response;
    switch (segments[0]) {
      case "users":
        response = await handleUsers(segments, url, apiKey.bu_id);
        break;
      case "teams":
        response = await handleTeams(url, apiKey.bu_id);
        break;
      case "areas":
        response = await handleAreas(url, apiKey.bu_id);
        break;
      case "okrs":
        response = await handleOkrs(req.method, segments, url, body, apiKey);
        break;
      case "kpis":
        response = await handleKpis(req.method, segments, url, body, apiKey);
        break;
      case "projects":
        response = await handleProjects(segments, url, apiKey.bu_id);
        break;
      case "tickets":
        response = await handleTickets(req.method, segments, url, body, apiKey);
        break;
      case "rituals":
        response = await handleRituals(segments, url, apiKey.bu_id);
        break;
      default:
        response = fail("NOT_FOUND", `Rota '${route}' não existe.`, 404);
    }

    await Promise.all([
      logUsage({
        apiKeyId: apiKey.id,
        buId: apiKey.bu_id,
        method: req.method,
        route,
        status: response.status,
        latencyMs: Date.now() - startedAt,
        ip,
      }),
      admin
        .from("bu_api_keys")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", apiKey.id),
    ]);

    return response;
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : JSON.stringify(error);
    console.error(`[bu-api] ${req.method} ${route} failed:`, message);
    if (apiKey) {
      await logUsage({
        apiKeyId: apiKey.id,
        buId: apiKey.bu_id,
        method: req.method,
        route,
        status: 500,
        latencyMs: Date.now() - startedAt,
        ip,
        errorMessage: message,
      });
    }
    return fail("INTERNAL_ERROR", message, 500);
  }
});
