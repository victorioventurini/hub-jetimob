// Gestão das chaves de API da BU (criar, atualizar, revogar).
// Autenticação: JWT do usuário logado. Somente admins da BU (ou admins de plataforma).
import { createClient } from "npm:@supabase/supabase-js@2";
import { isValidScope } from "../_shared/bu-api-scopes.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-current-bu-id, x-client-version, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

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

const ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function randomString(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes)
    .map((b) => ALPHABET[b % ALPHABET.length])
    .join("");
}

/** Formato: jet_<6 chars>_<40 chars>. O prefixo visível é `jet_<6 chars>`. */
function generateApiKey() {
  const shortId = randomString(6);
  const secret = randomString(40);
  return { plain: `jet_${shortId}_${secret}`, prefix: `jet_${shortId}` };
}

function normalizeScopes(input: unknown): string[] | null {
  if (!Array.isArray(input) || input.length === 0) return null;
  const scopes = Array.from(
    new Set(input.filter((s): s is string => typeof s === "string")),
  );
  if (!scopes.length || scopes.some((s) => !isValidScope(s))) return null;
  // write implica read
  for (const scope of [...scopes]) {
    if (scope.endsWith(":write")) {
      const read = scope.replace(":write", ":read");
      if (!scopes.includes(read)) scopes.push(read);
    }
  }
  return scopes;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return fail("METHOD_NOT_ALLOWED", "Use POST.", 405);
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return fail("UNAUTHORIZED", "Autenticação obrigatória.", 401);
    }
    const token = authHeader.slice(7).trim();

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: claimsData, error: claimsError } =
      await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return fail("UNAUTHORIZED", "Sessão inválida.", 401);
    }
    const userId = claimsData.claims.sub as string;

    const body = (await req.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    if (!body || typeof body.action !== "string") {
      return fail("BAD_REQUEST", "Campo 'action' é obrigatório.", 400);
    }
    const buId = body.bu_id as string | undefined;
    if (!buId) {
      return fail("BAD_REQUEST", "Campo 'bu_id' é obrigatório.", 400);
    }

    // Perfil do solicitante
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!profile) {
      return fail("FORBIDDEN", "Perfil não encontrado.", 403);
    }

    // Autorização: admin de plataforma OU admin da BU informada
    const { data: platformRole } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["super_admin", "admin"])
      .maybeSingle();

    let authorized = Boolean(platformRole);
    if (!authorized) {
      const { data: membership } = await admin
        .from("bu_user_memberships")
        .select("id")
        .eq("profile_id", profile.id)
        .eq("bu_id", buId)
        .in("role_in_bu", ["admin", "super_admin"])
        .is("deleted_at", null)
        .maybeSingle();
      authorized = Boolean(membership);
    }
    if (!authorized) {
      return fail(
        "FORBIDDEN",
        "Somente administradores da BU podem gerenciar chaves de API.",
        403,
      );
    }

    if (body.action === "create") {
      const name = (body.name as string | undefined)?.trim();
      const consumerSystem = (body.consumer_system as string | undefined)?.trim();
      if (!name || !consumerSystem) {
        return fail(
          "BAD_REQUEST",
          "Campos 'name' e 'consumer_system' são obrigatórios.",
          400,
        );
      }
      const scopes = normalizeScopes(body.scopes);
      if (!scopes) {
        return fail(
          "BAD_REQUEST",
          "Selecione ao menos um escopo válido para a chave.",
          400,
        );
      }
      const rateLimit = Number(body.rate_limit_per_minute ?? 60);
      if (!Number.isInteger(rateLimit) || rateLimit < 1 || rateLimit > 6000) {
        return fail(
          "BAD_REQUEST",
          "'rate_limit_per_minute' deve ser um inteiro entre 1 e 6000.",
          400,
        );
      }

      const { plain, prefix } = generateApiKey();
      const { data, error } = await admin
        .from("bu_api_keys")
        .insert({
          bu_id: buId,
          name,
          description: (body.description as string | undefined)?.trim() || null,
          consumer_system: consumerSystem,
          key_hash: await sha256Hex(plain),
          key_prefix: prefix,
          scopes,
          rate_limit_per_minute: rateLimit,
          expires_at: (body.expires_at as string | undefined) || null,
          created_by: profile.id,
        })
        .select(
          "id, bu_id, name, description, consumer_system, key_prefix, scopes, rate_limit_per_minute, status, expires_at, created_at",
        )
        .single();
      if (error) throw error;

      // A chave em texto puro é devolvida uma única vez.
      return json({ data: { ...data, api_key: plain } }, 201);
    }

    if (body.action === "update") {
      const keyId = body.key_id as string | undefined;
      if (!keyId) return fail("BAD_REQUEST", "Campo 'key_id' é obrigatório.", 400);

      const patch: Record<string, unknown> = {};
      if (typeof body.name === "string" && body.name.trim()) {
        patch.name = body.name.trim();
      }
      if (typeof body.description === "string") {
        patch.description = body.description.trim() || null;
      }
      if (typeof body.consumer_system === "string" && body.consumer_system.trim()) {
        patch.consumer_system = body.consumer_system.trim();
      }
      if (body.scopes !== undefined) {
        const scopes = normalizeScopes(body.scopes);
        if (!scopes) {
          return fail("BAD_REQUEST", "Escopos inválidos.", 400);
        }
        patch.scopes = scopes;
      }
      if (body.rate_limit_per_minute !== undefined) {
        const rateLimit = Number(body.rate_limit_per_minute);
        if (!Number.isInteger(rateLimit) || rateLimit < 1 || rateLimit > 6000) {
          return fail(
            "BAD_REQUEST",
            "'rate_limit_per_minute' deve ser um inteiro entre 1 e 6000.",
            400,
          );
        }
        patch.rate_limit_per_minute = rateLimit;
      }
      if (body.expires_at !== undefined) {
        patch.expires_at = (body.expires_at as string | null) || null;
      }
      if (!Object.keys(patch).length) {
        return fail("BAD_REQUEST", "Nenhum campo para atualizar.", 400);
      }

      const { data, error } = await admin
        .from("bu_api_keys")
        .update(patch)
        .eq("id", keyId)
        .eq("bu_id", buId)
        .is("deleted_at", null)
        .select(
          "id, bu_id, name, description, consumer_system, key_prefix, scopes, rate_limit_per_minute, status, expires_at, created_at, updated_at",
        )
        .maybeSingle();
      if (error) throw error;
      if (!data) return fail("NOT_FOUND", "Chave não encontrada nesta BU.", 404);
      return json({ data });
    }

    if (body.action === "revoke") {
      const keyId = body.key_id as string | undefined;
      if (!keyId) return fail("BAD_REQUEST", "Campo 'key_id' é obrigatório.", 400);
      const { data, error } = await admin
        .from("bu_api_keys")
        .update({
          status: "revoked",
          revoked_at: new Date().toISOString(),
          revoked_by: profile.id,
        })
        .eq("id", keyId)
        .eq("bu_id", buId)
        .is("deleted_at", null)
        .select("id, status, revoked_at")
        .maybeSingle();
      if (error) throw error;
      if (!data) return fail("NOT_FOUND", "Chave não encontrada nesta BU.", 404);
      return json({ data });
    }

    return fail("BAD_REQUEST", `Ação '${body.action}' não suportada.`, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[bu-api-keys] failed:", message);
    return fail("INTERNAL_ERROR", message, 500);
  }
});
