/**
 * Shared helpers for parsing AI/LLM JSON responses on the Edge.
 * Mirrors the canonical client-side `tryParseAiJson` behavior.
 */

/**
 * Strip Markdown code fences (```json ... ```) and surrounding whitespace
 * from an LLM response that is expected to contain JSON.
 */
export function sanitizeJsonResponse(raw: string): string {
  if (!raw) return "";
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
  return cleaned.trim();
}

/**
 * Safely parse a (possibly fenced) AI JSON response.
 * Returns the parsed object or a fallback when parsing fails / value is empty.
 */
export function tryParseAiJson<T = unknown>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    const cleaned = sanitizeJsonResponse(raw);
    if (!cleaned) return fallback;
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

/**
 * Extract a string from a Promise.allSettled result with a fallback.
 */
export function extractSettled(
  result: PromiseSettledResult<string>,
  fallback = "",
): string {
  if (result.status === "fulfilled" && result.value) return result.value;
  return fallback;
}
