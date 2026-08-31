export function normalizeAuthNext(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/";
  }

  try {
    const url = new URL(raw, window.location.origin);
    const nestedNext = url.searchParams.get("next");

    if ((url.pathname === "/auth/callback" || url.pathname === "/auth/confirm") && nestedNext) {
      return normalizeAuthNext(nestedNext);
    }

    return `${url.pathname}${url.search}${url.hash}` || "/";
  } catch {
    return "/";
  }
}

/**
 * SSO — domínio confiável dos sistemas VibeCoding.
 *
 * O Next é o provedor de identidade: um satélite (ex.: comercial.jetimob.com)
 * redireciona para `/auth?next=<url absoluta>` e o usuário volta ao sistema de
 * origem após o login. Só aceitamos HTTPS em jetimob.com (e subdomínios) para
 * evitar open redirect.
 */
const SSO_ROOT_DOMAIN = "jetimob.com";

export function isAllowedSsoUrl(candidate: string | null | undefined): boolean {
  if (!candidate) return false;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:") return false;
    return url.hostname === SSO_ROOT_DOMAIN || url.hostname.endsWith(`.${SSO_ROOT_DOMAIN}`);
  } catch {
    return false;
  }
}

/**
 * Retorna a URL absoluta de retorno quando `raw` aponta para OUTRO sistema
 * VibeCoding permitido. Retorna `null` para caminhos internos ou destinos
 * não autorizados (nesse caso use `normalizeAuthNext`).
 */
export function resolveExternalAuthNext(raw: string | null | undefined): string | null {
  if (!raw || raw.startsWith("/")) return null;
  if (!isAllowedSsoUrl(raw)) return null;

  const url = new URL(raw);

  // Mesma origem → trata como destino interno (rota do próprio Next)
  if (typeof window !== "undefined" && url.origin === window.location.origin) {
    return null;
  }

  // Desaninha next dentro do callback do satélite
  const nested = url.searchParams.get("next");
  if ((url.pathname === "/auth/callback" || url.pathname === "/auth/confirm") && nested) {
    return resolveExternalAuthNext(nested) ?? url.origin;
  }

  return url.toString();
}

/**
 * Resolve o destino final pós-login: URL absoluta (satélite autorizado) ou
 * caminho interno normalizado.
 */
export function resolveAuthTarget(raw: string | null | undefined): {
  kind: "external" | "internal";
  target: string;
} {
  const external = resolveExternalAuthNext(raw);
  if (external) return { kind: "external", target: external };
  return { kind: "internal", target: normalizeAuthNext(raw) };
}
