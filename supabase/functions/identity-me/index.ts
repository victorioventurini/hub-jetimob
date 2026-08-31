/**
 * identity-me — Endpoint de identidade central (SSO VibeCoding)
 *
 * O Next é o provedor de identidade dos sistemas irmãos. Um satélite
 * (ex.: comercial.jetimob.com) envia o access_token do usuário e recebe
 * APENAS os dados de identidade — sem BUs, papéis ou permissões, que são
 * responsabilidade de cada app.
 *
 * GET /functions/v1/identity-me
 *   Authorization: Bearer <access_token do usuário>
 *
 * Resposta 200:
 * {
 *   "user_id": "uuid (auth.users.id)",
 *   "profile_id": "uuid (profiles.id)",
 *   "email": "...",
 *   "display_name": "...",
 *   "first_name": "...",
 *   "last_name": "...",
 *   "photo_url": "...",
 *   "status": "active" | "inactive"
 * }
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const ALLOWED_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-correlation-id";

/** Só sistemas em jetimob.com (HTTPS) podem consumir credenciais do usuário. */
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:") return false;
    return url.hostname === "jetimob.com" || url.hostname.endsWith(".jetimob.com");
  } catch {
    return false;
  }
}

function corsFor(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": isAllowedOrigin(origin) ? origin! : "null",
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsFor(origin), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsFor(origin) });
  }

  if (req.method !== "GET") {
    return json(
      { error: { code: "method_not_allowed", message: "Use GET." } },
      405,
      origin,
    );
  }

  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return json(
      { error: { code: "unauthenticated", message: "Bearer token ausente." } },
      401,
      origin,
    );
  }

  // Valida o token contra o servidor de auth (não confia no payload do JWT)
  const authClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await authClient.auth.getUser();
  if (userError || !userData?.user) {
    return json(
      { error: { code: "unauthenticated", message: "Sessão inválida ou expirada." } },
      401,
      origin,
    );
  }

  const user = userData.user;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select(
      "id, display_name, first_name, last_name, email, work_email, photo_url, employment_status, deleted_at",
    )
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (profileError) {
    console.error("[identity-me] profile error:", profileError.message);
    return json(
      { error: { code: "internal_error", message: "Falha ao carregar identidade." } },
      500,
      origin,
    );
  }

  return json(
    {
      user_id: user.id,
      profile_id: profile?.id ?? null,
      email: profile?.work_email ?? profile?.email ?? user.email ?? null,
      display_name: profile?.display_name ?? null,
      first_name: profile?.first_name ?? null,
      last_name: profile?.last_name ?? null,
      photo_url: profile?.photo_url ?? null,
      status: profile?.employment_status === "inactive" ? "inactive" : "active",
    },
    200,
    origin,
  );
});
