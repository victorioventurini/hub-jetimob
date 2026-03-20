/**
 * usePhoneLineHistory — Fetches audit_logs for a specific phone line.
 * Thin wrapper over the generic useAuditHistory hook.
 */

import { useAuditHistory, type AuditEntry } from "./useAuditHistory";
import { assetsKeys } from "@/lib/queryKeys/assets";

export type PhoneLineAuditEntry = AuditEntry;

export function usePhoneLineHistory(phoneLineId: string | null | undefined) {
  return useAuditHistory({
    entityType: "asset_phone_line",
    entityId: phoneLineId,
    queryKey: assetsKeys.phoneLines.history(phoneLineId ?? ""),
  });
}
