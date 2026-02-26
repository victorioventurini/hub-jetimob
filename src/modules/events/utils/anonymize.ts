/**
 * Anonymization utility — deterministic brand name mapping
 */
import type { ViewMode } from "../types";
import { COMPETITORS_MOCK, SPONSOR_BRAND_ID } from "../mocks/sponsor";

const competitorMap = new Map(COMPETITORS_MOCK.map((c) => [c.id, c]));

export function getBrandDisplayName(brandId: string, viewMode: ViewMode): string {
  if (brandId === SPONSOR_BRAND_ID) return "Porto Seguro";
  const comp = competitorMap.get(brandId);
  if (!comp) return "Desconhecido";
  return viewMode === "admin" ? comp.realName : comp.anonymousName;
}

export function getBrandColor(brandId: string): string {
  if (brandId === SPONSOR_BRAND_ID) return "hsl(210, 80%, 45%)";
  const comp = competitorMap.get(brandId);
  return comp?.color ?? "hsl(var(--muted))";
}
