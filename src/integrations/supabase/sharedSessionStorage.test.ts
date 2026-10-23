import { beforeEach, describe, expect, it, vi } from "vitest";

const key = "sb-example-auth-token";
const url = "https://example.supabase.co";
const session = JSON.stringify({ access_token: "test-access", refresh_token: "test-refresh", user: { name: "João" } });

async function setup(cookie: string, host = "next.jetimob.com") {
  vi.stubGlobal("window", { location: { hostname: host } });
  const writes: string[] = [];
  vi.spyOn(document, "cookie", "get").mockReturnValue(cookie);
  vi.spyOn(document, "cookie", "set").mockImplementation(value => { writes.push(value); });
  const module = await import("./sharedSessionStorage");
  return { ...module, writes };
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
  localStorage.clear();
});

describe("origin-local auth migration", () => {
  it("preserves the old chunked session in localStorage before cleanup", async () => {
    const cut = session.indexOf("refresh_token");
    const { migrateLegacySharedSession } = await setup(
      `${key}.0=${encodeURIComponent(session.slice(0, cut))}; ${key}.1=${encodeURIComponent(session.slice(cut))}`,
    );
    migrateLegacySharedSession(url);
    expect(localStorage.getItem(key)).toBe(session);
  });

  it("expires every matching cookie including residual chunks only on the broad domain", async () => {
    const { migrateLegacySharedSession, writes } = await setup(`${key}.0=x; ${key}.1=y; ${key}.2=z; ${key}.42=z; consent=yes; sb-other-auth-token.0=x`);
    migrateLegacySharedSession(url);
    expect(writes).toEqual([0, 1, 2, 42].map(index =>
      `${key}.${index}=; Max-Age=0; Path=/; Domain=.jetimob.com; Secure; SameSite=Lax`,
    ));
  });

  it("does not overwrite an existing local session", async () => {
    localStorage.setItem(key, "current-local-session");
    const { migrateLegacySharedSession } = await setup(`${key}=${encodeURIComponent(session)}`);
    migrateLegacySharedSession(url);
    expect(localStorage.getItem(key)).toBe("current-local-session");
  });

  it("runs once per page load", async () => {
    const { migrateLegacySharedSession, writes } = await setup(`${key}=${encodeURIComponent(session)}`);
    migrateLegacySharedSession(url);
    migrateLegacySharedSession(url);
    expect(writes).toHaveLength(1);
  });

  it("leaves preview cookies and storage untouched", async () => {
    const { migrateLegacySharedSession, writes } = await setup(`${key}=${encodeURIComponent(session)}`, "localhost");
    migrateLegacySharedSession(url);
    expect(writes).toEqual([]);
    expect(localStorage.getItem(key)).toBeNull();
  });

  it("cleans broad cookies even when localStorage is blocked", async () => {
    const { migrateLegacySharedSession, writes } = await setup(`${key}=${encodeURIComponent(session)}`);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    migrateLegacySharedSession(url);
    expect(writes).toHaveLength(1);
  });

  it("reads only localStorage after migration and never creates cookies", async () => {
    const { readSharedSessionRaw, writes } = await setup(`${key}=${encodeURIComponent(session)}`);
    expect(readSharedSessionRaw(key)).toBeNull();
    localStorage.setItem(key, session);
    expect(readSharedSessionRaw(key)).toBe(session);
    expect(writes).toEqual([]);
  });
});