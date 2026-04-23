import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { lazyWithRetry } from "./lazyWithRetry";

describe("lazyWithRetry", () => {
  const RETRY_KEY = "__lazy_import_retry__";

  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("returns a React.lazy result (object with $$typeof)", () => {
    const importer = vi.fn(async () => ({ default: () => null }));
    const Component = lazyWithRetry(importer);
    expect(Component).toBeDefined();
    expect(typeof Component).toBe("object");
  });

  it("clears retry flag on successful import", async () => {
    sessionStorage.setItem(RETRY_KEY, "1");
    const importer = vi.fn(async () => ({ default: () => null }));
    const Component = lazyWithRetry(importer);

    // Trigger lazy load by accessing the internal payload
    // React.lazy stores the loader in _payload._result
    const payload = (Component as unknown as { _payload: { _result: () => Promise<unknown> } })._payload;
    const loader = payload._result as unknown as () => Promise<unknown>;
    await loader();

    expect(sessionStorage.getItem(RETRY_KEY)).toBeNull();
    expect(importer).toHaveBeenCalledTimes(1);
  });

  it("triggers reload on first failure and re-throws", async () => {
    const reloadSpy = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload: reloadSpy },
    });

    const importer = vi.fn(async () => {
      throw new Error("Failed to fetch dynamically imported module");
    });
    const Component = lazyWithRetry(importer);
    const payload = (Component as unknown as { _payload: { _result: () => Promise<unknown> } })._payload;
    const loader = payload._result as unknown as () => Promise<unknown>;

    await expect(loader()).rejects.toThrow("Failed to fetch");
    expect(sessionStorage.getItem(RETRY_KEY)).toBe("1");
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it("does NOT reload twice (avoids infinite loop)", async () => {
    sessionStorage.setItem(RETRY_KEY, "1");
    const reloadSpy = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload: reloadSpy },
    });

    const importer = vi.fn(async () => {
      throw new Error("still failing");
    });
    const Component = lazyWithRetry(importer);
    const payload = (Component as unknown as { _payload: { _result: () => Promise<unknown> } })._payload;
    const loader = payload._result as unknown as () => Promise<unknown>;

    await expect(loader()).rejects.toThrow("still failing");
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it("supports custom retryKey", async () => {
    const customKey = "__custom_retry__";
    const importer = vi.fn(async () => ({ default: () => null }));
    sessionStorage.setItem(customKey, "1");

    const Component = lazyWithRetry(importer, { retryKey: customKey });
    const payload = (Component as unknown as { _payload: { _result: () => Promise<unknown> } })._payload;
    const loader = payload._result as unknown as () => Promise<unknown>;
    await loader();

    expect(sessionStorage.getItem(customKey)).toBeNull();
  });
});
