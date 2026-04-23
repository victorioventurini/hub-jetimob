import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { lazyWithRetry } from "./lazyWithRetry";

/**
 * NOTE: We test the wrapper's observable behavior (sessionStorage flag +
 * window.location.reload spy) without depending on React.lazy internals.
 * Strategy: temporarily spy on `lazy` would require module-level mocking
 * and is fragile; instead we reproduce the wrapper logic with the same
 * source semantics by calling the raw importer flow indirectly through
 * the React.lazy payload `_init`/`_payload._result` API surface.
 *
 * The wrapper itself is small and pure; we cover both branches by
 * triggering successful and failing imports.
 */
function trigger<T extends { default: React.ComponentType<unknown> }>(
  Component: ReturnType<typeof lazyWithRetry<T>>
): Promise<unknown> {
  // Initial state: _payload._result holds the loader function.
  const payload = (Component as unknown as {
    _payload: {
      _status?: number;
      _result: unknown;
    };
  })._payload;
  const loader = payload._result as () => Promise<unknown>;
  return loader();
}

describe("lazyWithRetry", () => {
  const RETRY_KEY = "__lazy_import_retry__";
  let reloadSpy: ReturnType<typeof vi.fn>;
  let originalLocation: Location;

  beforeEach(() => {
    sessionStorage.clear();
    reloadSpy = vi.fn();
    originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { ...originalLocation, reload: reloadSpy },
    });
  });

  afterEach(() => {
    sessionStorage.clear();
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
    vi.restoreAllMocks();
  });

  it("returns a lazy component", () => {
    const Component = lazyWithRetry(async () => ({ default: () => null }));
    expect(Component).toBeDefined();
    expect(typeof Component).toBe("object");
  });

  it("clears retry flag on successful import", async () => {
    sessionStorage.setItem(RETRY_KEY, "1");
    const importer = vi.fn(async () => ({ default: () => null }));
    const Component = lazyWithRetry(importer);
    await trigger(Component);

    expect(sessionStorage.getItem(RETRY_KEY)).toBeNull();
    expect(importer).toHaveBeenCalled();
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it("calls reload + sets flag on first failure", async () => {
    const importer = vi.fn(async () => {
      throw new Error("Failed to fetch dynamically imported module");
    });
    const Component = lazyWithRetry(importer);

    await expect(trigger(Component)).rejects.toThrow(/Failed to fetch/);
    expect(sessionStorage.getItem(RETRY_KEY)).toBe("1");
    expect(reloadSpy).toHaveBeenCalled();
  });

  it("supports a custom retryKey (cleared on success)", async () => {
    const customKey = "__custom_retry__";
    sessionStorage.setItem(customKey, "1");
    const importer = vi.fn(async () => ({ default: () => null }));
    const Component = lazyWithRetry(importer, { retryKey: customKey });

    await trigger(Component);
    expect(sessionStorage.getItem(customKey)).toBeNull();
  });

  it("re-throws the original error", async () => {
    const original = new Error("original failure message");
    const importer = vi.fn(async () => {
      throw original;
    });
    const Component = lazyWithRetry(importer);

    await expect(trigger(Component)).rejects.toThrow("original failure message");
  });
});
