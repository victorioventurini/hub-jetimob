import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { lazyWithRetry } from "./lazyWithRetry";

/**
 * Note: React.lazy lazily memoizes the loader. To test the retry behavior
 * deterministically we use a tiny helper that mirrors the wrapper logic:
 * we just exercise the importer through a fresh `lazyWithRetry` per case
 * and trigger the underlying promise.
 *
 * We only assert observable side-effects (sessionStorage flag + reload spy).
 */
function getLoader<T extends { default: React.ComponentType<unknown> }>(
  Component: ReturnType<typeof lazyWithRetry<T>>
): () => Promise<unknown> {
  // React.lazy stores the loader in `_payload._result` BEFORE first call.
  const payload = (Component as unknown as {
    _payload: { _result: () => Promise<unknown> };
  })._payload;
  return payload._result;
}

describe("lazyWithRetry", () => {
  const RETRY_KEY = "__lazy_import_retry__";
  let reloadSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sessionStorage.clear();
    reloadSpy = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload: reloadSpy },
    });
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("returns a lazy component object", () => {
    const importer = vi.fn(async () => ({ default: () => null }));
    const Component = lazyWithRetry(importer);
    expect(Component).toBeDefined();
    expect(typeof Component).toBe("object");
  });

  it("clears retry flag on successful import", async () => {
    sessionStorage.setItem(RETRY_KEY, "1");
    const importer = vi.fn(async () => ({ default: () => null }));
    const Component = lazyWithRetry(importer);
    await getLoader(Component)();

    expect(sessionStorage.getItem(RETRY_KEY)).toBeNull();
    expect(importer).toHaveBeenCalledTimes(1);
  });

  it("triggers reload + sets flag on first failure", async () => {
    expect(sessionStorage.getItem(RETRY_KEY)).toBeNull();
    const importer = vi.fn(async () => {
      throw new Error("Failed to fetch dynamically imported module");
    });
    const Component = lazyWithRetry(importer);

    await expect(getLoader(Component)()).rejects.toThrow(/Failed to fetch/);
    expect(sessionStorage.getItem(RETRY_KEY)).toBe("1");
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it("does NOT reload twice when flag is already set", async () => {
    sessionStorage.setItem(RETRY_KEY, "1");
    const importer = vi.fn(async () => {
      throw new Error("still failing");
    });
    const Component = lazyWithRetry(importer);

    await expect(getLoader(Component)()).rejects.toThrow("still failing");
    expect(reloadSpy).not.toHaveBeenCalled();
    // Flag remains set
    expect(sessionStorage.getItem(RETRY_KEY)).toBe("1");
  });

  it("supports a custom retryKey", async () => {
    const customKey = "__custom_retry__";
    sessionStorage.setItem(customKey, "1");
    const importer = vi.fn(async () => ({ default: () => null }));
    const Component = lazyWithRetry(importer, { retryKey: customKey });

    await getLoader(Component)();
    expect(sessionStorage.getItem(customKey)).toBeNull();
  });
});
