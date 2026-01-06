/**
 * BU-Aware Routing Utilities
 * 
 * Provides helpers for generating BU-scoped paths and validating BU context.
 * All operational routes should use these helpers to ensure correct BU context.
 */

/**
 * Generate a BU-scoped path
 * @param buId - The Business Unit ID
 * @param path - The path within the BU context (should start with /)
 * @returns The full BU-scoped path (e.g., /bu/{buId}/assets/inventory/123)
 */
export function getBuScopedPath(buId: string, path: string): string {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `/bu/${buId}${normalizedPath}`;
}

/**
 * Extract BU ID from a BU-scoped path
 * @param path - The current path (e.g., /bu/123-abc/assets/inventory)
 * @returns The BU ID or null if not found
 */
export function extractBuIdFromPath(path: string): string | null {
  const match = path.match(/^\/bu\/([a-f0-9-]+)/i);
  return match ? match[1] : null;
}

/**
 * Check if a path is BU-scoped
 */
export function isBuScopedPath(path: string): boolean {
  return /^\/bu\/[a-f0-9-]+/i.test(path);
}

/**
 * Convert a legacy path to BU-scoped path
 * Used for redirecting old URLs to the new format
 */
export function legacyPathToBuScoped(buId: string, legacyPath: string): string {
  // Remove leading slash if present for consistent handling
  const cleanPath = legacyPath.startsWith('/') ? legacyPath : `/${legacyPath}`;
  return getBuScopedPath(buId, cleanPath);
}

/**
 * Module path prefixes that require BU context
 */
export const BU_SCOPED_MODULES = [
  'assets',
  'okrs', 
  'kpis',
  'teams',
  'tickets',
  'search',
] as const;

export type BuScopedModule = typeof BU_SCOPED_MODULES[number];

/**
 * Check if a path belongs to a BU-scoped module
 */
export function isBuScopedModule(path: string): boolean {
  return BU_SCOPED_MODULES.some(module => 
    path.startsWith(`/${module}`) || path.startsWith(`/bu/`) && path.includes(`/${module}`)
  );
}
