import { lazy } from "react";

/**
 * Wraps React.lazy with a one-time recovery for chunk-load errors.
 *
 * In SPAs, users can keep an older HTML shell cached that references
 * chunk filenames that no longer exist after a new deploy.
 * This commonly manifests as:
 * "Failed to fetch dynamically imported module".
 *
 * Strategy:
 * - On first failure: force a full reload to fetch the latest shell/chunks.
 * - Avoid infinite loops via sessionStorage flag.
 */
export function lazyWithRetry<T extends { default: React.ComponentType<any> }>(
  importer: () => Promise<T>,
  options?: { retryKey?: string }
) {
  const retryKey = options?.retryKey ?? "__lazy_import_retry__";

  return lazy(async () => {
    try {
      // Clear retry flag on successful import
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(retryKey);
      }
      return await importer();
    } catch (error) {
      // One-time hard refresh to recover from stale cached chunks
      if (typeof window !== "undefined") {
        const hasRetried = sessionStorage.getItem(retryKey) === "1";
        if (!hasRetried) {
          sessionStorage.setItem(retryKey, "1");
          window.location.reload();
        }
      }
      throw error;
    }
  });
}
