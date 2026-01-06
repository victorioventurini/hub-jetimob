/**
 * Shareable Links - Hub da Jet
 * 
 * Centralized helper for generating shareable/external URLs.
 * All shared links, notifications, search results, and external references
 * MUST use the /go/:entity/:id pattern to ensure correct BU context resolution.
 * 
 * @see TCR v2.0 - Link Standards
 */

export type ShareableEntity = 
  | "asset"
  | "team"
  | "user"
  | "ticket"
  | "okr_org_objective"
  | "okr_team_objective"
  | "okr_org_kr"
  | "okr_team_kr"
  | "keyring"
  | "gift"
  | "kpi";

/**
 * Generates a shareable URL that resolves BU context before navigation.
 * This is the ONLY format that should be used for:
 * - Global search results
 * - Notifications (context_url)
 * - Email links
 * - Mentions
 * - Copy-link buttons
 * - QR codes (new)
 * - External shares
 * 
 * @param entity The entity type
 * @param id The entity UUID
 * @returns A path like `/go/asset/abc-123`
 */
export function getShareableUrl(entity: ShareableEntity, id: string): string {
  return `/go/${entity}/${id}`;
}

/**
 * Generates a full absolute URL for external sharing.
 * Uses window.location.origin for the base URL.
 * 
 * @param entity The entity type  
 * @param id The entity UUID
 * @returns A full URL like `https://hub.jetimob.com/go/asset/abc-123`
 */
export function getShareableAbsoluteUrl(entity: ShareableEntity, id: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}${getShareableUrl(entity, id)}`;
}

/**
 * Entity type labels for UI display
 */
export const ENTITY_LABELS: Record<ShareableEntity, string> = {
  asset: "Item do Inventário",
  team: "Time",
  user: "Usuário",
  ticket: "Ticket",
  okr_org_objective: "Objetivo Organizacional",
  okr_team_objective: "Objetivo de Time",
  okr_org_kr: "KR Organizacional",
  okr_team_kr: "KR de Time",
  keyring: "Chaveiro",
  gift: "Brinde",
  kpi: "KPI",
};

/**
 * LEGACY COMPATIBILITY
 * 
 * The route /assets/:code is kept ONLY for backward compatibility
 * with physical labels already printed (QR codes).
 * 
 * New QR codes and shares should use /go/asset/:uuid
 * 
 * The legacy route:
 * - If user NOT logged in → redirects to /p/assets/:code (public view)
 * - If user logged in → resolves BU and redirects to /go/asset/:uuid
 */
