/**
 * sso-handoff — entrega de acesso de uso único para sistemas irmãos (*.jetimob.com).
 *
 * O Next NÃO compartilha cookie de sessão entre subdomínios (estoura header dos
 * sites irmãos). Em vez disso, um usuário logado no Next pede aqui um código de
 * uso único (hashed_token de magic link, sem envio de e-mail). O satélite troca
 * esse código por uma sessão PRÓPRIA via auth.verifyOtp({ token_hash, type }).
 *
 * POST { return_to: "https://comercial.jetimob.com/painel" }
 * 200  { redirect_url: "https://comercial.jetimob.com/auth/callback?token_hash=...&type=magiclink&next=/painel" }
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { isInternalEmail } from "../_shared/internal-domains.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ROOT = "jetimob.com";

function json(body: unknown, status: number, correlationId: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "x-correlation-id": correlationId },
  });
}

function err(code: string, message: string, status: number, cid: string) {
  return json({ error: { code, message, correlation_id: cid } }, status, cid);
}

function parseReturnTo(raw: unknown): URL | null {
  if (typeof raw !== "string" || raw.length > 2048) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    if (url.hostname !== ROOT && !url.hostname.endsWith(`.${ROOT}`)) return null;
    // O próprio Next não precisa de handoff.
    if (url.hostname === "next.jetimob.com" || url.hostname === "hub.jetimob.com") return null;
    return url;
  } catch {
    return null;
  }
}

function amrMethods(claims: Record<string, unknown>): string[] {
  const amr = Array.isArray(claims.amr) ? claims.amr : [];
  return amr.map((a: unknown) =>
    typeof a === "string" ? a : ((a as { method?: string })?.method ?? "")
  );
}

Deno.serve(async (req) => {
  const cid = req.headers.get("x-correlation-id") ?? crypto.randomUUID();
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return err("method_not_allowed", "Use POST.", 405, cid);

  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return err("unauthenticated", "Sessão ausente.", 401, cid);
  }
  const token = authHeader.slice(7);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
  const claims = claimsData?.claims as Record<string, unknown> | undefined;
  if (claimsError || !claims?.sub || typeof claims.email !== "string") {
    return err("unauthenticated", "Sessão inválida.", 401, cid);
  }
  const email = claims.email;

  // Mesma política do Next: interno só com sessão Google.
  const methods = amrMethods(claims);
  const viaOAuth = methods.some((m) => m === "oauth" || m === "id_token" || m === "sso/saml");
  if (isInternalEmail(email) && !viaOAuth) {
    return err("internal_requires_google", "Colaboradores entram com a conta Google corporativa.", 403, cid);
  }

  let body: { return_to?: unknown };
  try { body = await req.json(); } catch { return err("invalid_body", "JSON inválido.", 400, cid); }
  const target = parseReturnTo(body.return_to);
  if (!target) return err("invalid_return_to", "Destino não autorizado.", 400, cid);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const hashed = link?.properties?.hashed_token;
  if (linkError || !hashed) {
    console.error(JSON.stringify({ fn: "sso-handoff", level: "error", cid, msg: linkError?.message }));
    return err("handoff_failed", "Não foi possível gerar o acesso.", 500, cid);
  }

  const nextPath = `${target.pathname}${target.search}${target.hash}` || "/";
  const redirect = new URL("/auth/callback", target.origin);
  redirect.searchParams.set("token_hash", hashed);
  redirect.searchParams.set("type", "magiclink");
  redirect.searchParams.set("next", nextPath);

  console.log(JSON.stringify({
    fn: "sso-handoff", level: "info", cid, user_id: claims.sub, target_host: target.hostname,
  }));
  return json({ redirect_url: redirect.toString() }, 200, cid);
});
