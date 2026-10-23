/**
 * Origin-local auth storage. Legacy shared cookies are read only during the
 * one-time migration, before the global auth client is created.
 */
let migrationRan = false;

function readCookieMap(): Map<string, string> {
  const cookies = new Map<string, string>();
  for (const part of document.cookie.split(";")) {
    const separator = part.indexOf("=");
    if (separator > 0) {
      const name = part.slice(0, separator).trim();
      // Same-name host-only cookies can coexist with the legacy domain cookie.
      // Keep the first visible value rather than overwriting it with a duplicate.
      if (!cookies.has(name)) cookies.set(name, part.slice(separator + 1));
    }
  }
  return cookies;
}

function decode(value: string): string {
  try { return decodeURIComponent(value); } catch { return value; }
}

function readLegacySession(cookies: Map<string, string>, key: string): string | null {
  const single = cookies.get(key);
  if (single !== undefined) return decode(single);
  const chunks: string[] = [];
  for (let index = 0; cookies.has(`${key}.${index}`); index++) {
    chunks.push(decode(cookies.get(`${key}.${index}`) ?? ""));
  }
  return chunks.length ? chunks.join("") : null;
}

/** Run before createClient: preserve the session locally, then expire ONLY domain cookies. */
export function migrateLegacySharedSession(supabaseUrl: string): void {
  if (migrationRan || typeof window === "undefined" || typeof document === "undefined") return;
  const host = window.location.hostname;
  if (host !== "jetimob.com" && !host.endsWith(".jetimob.com")) return;

  let key: string;
  try {
    const ref = new URL(supabaseUrl).hostname.split(".")[0];
    if (!ref) return;
    key = `sb-${ref}-auth-token`;
  } catch { return; }
  migrationRan = true;

  const cookies = readCookieMap();
  const legacy = readLegacySession(cookies, key);
  try {
    if (!localStorage.getItem(key) && legacy) {
      const session: unknown = JSON.parse(legacy);
      if (session && typeof session === "object" &&
          "access_token" in session && typeof session.access_token === "string" &&
          "refresh_token" in session && typeof session.refresh_token === "string") {
        localStorage.setItem(key, legacy);
      }
    }
  } catch {
    // If storage is blocked or the old session is malformed, a fresh login is required.
    // Still remove the oversized domain cookies to protect sibling hosts.
  }

  for (const name of cookies.keys()) {
    if (name.startsWith(key)) {
      // Domain is used ONLY for expiring legacy cookies. Never expire host-only cookies.
      document.cookie = `${name}=; Max-Age=0; Path=/; Domain=.jetimob.com; Secure; SameSite=Lax`;
    }
  }
}

/** Compatibility reader for the BU transport and magic-link callback. */
export function readSharedSessionRaw(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
