/**
 * Política de login do Next.
 * Internos (domínios corporativos das BUs) entram SOMENTE via Google.
 * Externos (parceiros) entram via link por e-mail.
 * Manter em sincronia com supabase/functions/_shared/internal-domains.ts.
 */
import type { Session } from "@supabase/supabase-js";
import { supabase as globalClient } from "@/integrations/supabase/globalClient";
import { supabase as lovableClient } from "@/integrations/supabase/client";

export const INTERNAL_EMAIL_DOMAINS = ["jetimob.com", "victorio.com.br", "jetxp.com.br"];

export function isInternalEmail(email: string | null | undefined): boolean {
  const domain = (email ?? "").toLowerCase().split("@")[1] ?? "";
  return INTERNAL_EMAIL_DOMAINS.includes(domain);
}

/** Métodos de autenticação do token atual (claim `amr`). */
function sessionMethods(session: Session): string[] {
  try {
    const payload = JSON.parse(atob(session.access_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    const amr = Array.isArray(payload?.amr) ? payload.amr : [];
    return amr.map((a: { method?: string } | string) => (typeof a === "string" ? a : a?.method ?? ""));
  } catch {
    return [];
  }
}

export type PolicyViolation = "internal_requires_google" | "google_requires_internal_domain";

/** Retorna a violação de política da sessão, ou null se permitida. */
export function checkSessionPolicy(session: Session): PolicyViolation | null {
  const internal = isInternalEmail(session.user.email);
  const viaOAuth = sessionMethods(session).includes("oauth");
  if (internal && !viaOAuth) return "internal_requires_google";
  if (!internal && viaOAuth) return "google_requires_internal_domain";
  return null;
}

export const POLICY_MESSAGES: Record<PolicyViolation, string> = {
  internal_requires_google: "Colaboradores entram com a conta Google corporativa.",
  google_requires_internal_domain:
    "Essa conta Google não tem acesso ao Next. Parceiros entram pelo link enviado por e-mail.",
};

/**
 * O login Google grava a sessão no cliente gerado; o Next usa o cliente
 * global (cookie compartilhado .jetimob.com). Copia a sessão se necessário.
 */
export async function syncOAuthSessionToGlobal(): Promise<void> {
  const { data } = await lovableClient.auth.getSession();
  const s = data.session;
  if (!s) return;
  const { data: g } = await globalClient.auth.getSession();
  if (g.session?.access_token === s.access_token) return;
  await globalClient.auth.setSession({ access_token: s.access_token, refresh_token: s.refresh_token });
  await lovableClient.auth.signOut({ scope: "local" });
}

export const OAUTH_NEXT_KEY = "next_oauth_target";
