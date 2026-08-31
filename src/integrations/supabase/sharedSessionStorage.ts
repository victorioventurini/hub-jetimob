/**
 * Shared Session Storage (SSO entre subdomínios de jetimob.com)
 *
 * O Next é o provedor de identidade dos sistemas VibeCoding. Para que a sessão
 * seja compartilhada com os satélites (`*.jetimob.com`), a sessão do GoTrue
 * precisa ser gravada em COOKIE no domínio raiz (`.jetimob.com`) em vez de
 * `localStorage` (que é isolado por origem).
 *
 * Comportamento:
 * - Host em `jetimob.com` / `*.jetimob.com` → cookie compartilhado (SSO ativo).
 * - Qualquer outro host (preview do Lovable, localhost) → `localStorage`,
 *   mantendo o comportamento atual. Nesses hosts não há SSO real.
 *
 * A sessão do Supabase pode passar de 4KB (limite por cookie), então o valor é
 * fatiado em chunks `<key>.0`, `<key>.1`, ...
 *
 * @see .lovable/plan/sso-centralizado-nos-projetos-vibecoding-*
 */

const SHARED_COOKIE_DOMAIN = ".jetimob.com";
const CHUNK_SIZE = 3500;
const MAX_CHUNKS = 12;
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 dias

function hasDom(): boolean {
  return typeof document !== "undefined" && typeof window !== "undefined";
}

/**
 * Retorna o domínio de cookie compartilhado quando o host atual pertence a
 * jetimob.com. Caso contrário, `null` (sem SSO).
 */
export function getSharedCookieDomain(): string | null {
  if (!hasDom()) return null;
  const host = window.location.hostname;
  if (host === "jetimob.com" || host.endsWith(".jetimob.com")) {
    return SHARED_COOKIE_DOMAIN;
  }
  return null;
}

/** True quando a sessão é compartilhada entre subdomínios (produção). */
export function isSharedSessionEnabled(): boolean {
  return getSharedCookieDomain() !== null;
}

function readCookieMap(): Map<string, string> {
  const map = new Map<string, string>();
  if (!hasDom()) return map;
  for (const part of document.cookie.split(";")) {
    const raw = part.trim();
    if (!raw) continue;
    const eq = raw.indexOf("=");
    if (eq <= 0) continue;
    const name = raw.slice(0, eq);
    const value = raw.slice(eq + 1);
    map.set(name, value);
  }
  return map;
}

function writeCookie(name: string, value: string, domain: string) {
  document.cookie = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    `Domain=${domain}`,
    `Max-Age=${MAX_AGE_SECONDS}`,
    "SameSite=Lax",
    window.location.protocol === "https:" ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

function deleteCookie(name: string, domain: string) {
  document.cookie = `${name}=; Path=/; Domain=${domain}; Max-Age=0; SameSite=Lax`;
  // Também remove eventual cookie gravado sem Domain (host-only)
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function readChunked(key: string): string | null {
  const cookies = readCookieMap();

  // Valor único (não fatiado)
  const single = cookies.get(key);
  if (single !== undefined) {
    try {
      return decodeURIComponent(single);
    } catch {
      return single;
    }
  }

  const parts: string[] = [];
  for (let i = 0; i < MAX_CHUNKS; i++) {
    const chunk = cookies.get(`${key}.${i}`);
    if (chunk === undefined) break;
    try {
      parts.push(decodeURIComponent(chunk));
    } catch {
      parts.push(chunk);
    }
  }
  return parts.length ? parts.join("") : null;
}

function writeChunked(key: string, value: string, domain: string) {
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += CHUNK_SIZE) {
    chunks.push(value.slice(i, i + CHUNK_SIZE));
  }

  // Limpa formato anterior (valor único) para evitar leitura ambígua
  deleteCookie(key, domain);

  chunks.forEach((chunk, index) => writeCookie(`${key}.${index}`, chunk, domain));

  // Remove chunks residuais de um valor maior gravado antes
  for (let i = chunks.length; i < MAX_CHUNKS; i++) {
    deleteCookie(`${key}.${i}`, domain);
  }
}

function clearChunked(key: string, domain: string) {
  deleteCookie(key, domain);
  for (let i = 0; i < MAX_CHUNKS; i++) {
    deleteCookie(`${key}.${i}`, domain);
  }
}

function safeLocalGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* noop */
  }
}

/**
 * Lê o valor bruto da sessão, respeitando o storage ativo (cookie ou local).
 * Usado por consumidores que precisam do access_token de forma síncrona
 * (ex.: buScopedClient) antes do SDK hidratar.
 */
export function readSharedSessionRaw(key: string): string | null {
  const domain = getSharedCookieDomain();
  if (!domain) return safeLocalGet(key);
  return readChunked(key) ?? safeLocalGet(key);
}

/**
 * Storage adapter compatível com a interface esperada pelo GoTrue.
 */
export function sharedSessionStorage(): Storage {
  const adapter = {
    getItem(key: string): string | null {
      const domain = getSharedCookieDomain();
      if (!domain) return safeLocalGet(key);

      const fromCookie = readChunked(key);
      if (fromCookie !== null) return fromCookie;

      // Migração: sessão antiga ainda em localStorage → promove para cookie
      const legacy = safeLocalGet(key);
      if (legacy) {
        writeChunked(key, legacy, domain);
        safeLocalRemove(key);
        return legacy;
      }

      return null;
    },

    setItem(key: string, value: string): void {
      const domain = getSharedCookieDomain();
      if (!domain) {
        try {
          localStorage.setItem(key, value);
        } catch {
          /* noop */
        }
        return;
      }
      writeChunked(key, value, domain);
      // Evita divergência entre cookie e cópia antiga em localStorage
      safeLocalRemove(key);
    },

    removeItem(key: string): void {
      const domain = getSharedCookieDomain();
      safeLocalRemove(key);
      if (domain) clearChunked(key, domain);
    },
  };

  // GoTrue só usa get/set/remove; o cast mantém a tipagem de `Storage`.
  return adapter as unknown as Storage;
}
