/**
 * Proteção anti-loop do handoff SSO: se o Next devolver o usuário ao mesmo
 * sistema irmão mais de MAX_ATTEMPTS vezes em WINDOW_MS, paramos e mostramos erro.
 */
export const SSO_HANDOFF_MAX_ATTEMPTS = 2;
export const SSO_HANDOFF_WINDOW_MS = 60_000;
const KEY = "next_sso_handoff_attempts";

type Attempts = Record<string, number[]>;

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function read(storage: StorageLike): Attempts {
  try {
    const parsed = JSON.parse(storage.getItem(KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** Registra uma tentativa para o host. Retorna false se o limite foi excedido. */
export function registerSsoHandoffAttempt(
  host: string,
  storage: StorageLike = sessionStorage,
  now: number = Date.now(),
): boolean {
  const all = read(storage);
  const recent = (all[host] ?? []).filter((t) => now - t < SSO_HANDOFF_WINDOW_MS);
  if (recent.length >= SSO_HANDOFF_MAX_ATTEMPTS) {
    all[host] = recent;
    try { storage.setItem(KEY, JSON.stringify(all)); } catch { /* noop */ }
    return false;
  }
  all[host] = [...recent, now];
  try { storage.setItem(KEY, JSON.stringify(all)); } catch { /* noop */ }
  return true;
}

export function resetSsoHandoffAttempts(host: string, storage: StorageLike = sessionStorage): void {
  const all = read(storage);
  delete all[host];
  try { storage.setItem(KEY, JSON.stringify(all)); } catch { /* noop */ }
}
