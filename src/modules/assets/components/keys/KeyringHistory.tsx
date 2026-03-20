/**
 * KeyringHistory — Audit history for a keyring.
 */

import { useAuditHistory } from "../../hooks/useAuditHistory";
import { AuditHistoryTimeline } from "../shared/AuditHistoryTimeline";
import { assetsKeys } from "@/lib/queryKeys/assets";

const FIELD_LABELS: Record<string, string> = {
  tag_number: "Número",
  name: "Nome",
  status: "Status",
  claviculary_id: "Claviculário",
  hook_id: "Gancho",
  current_user_id: "Usuário atual",
  notes: "Observações",
};

const VALUE_LABELS: Record<string, Record<string, string>> = {
  status: {
    available: "Disponível",
    loaned: "Emprestado",
    retired: "Aposentado",
    lost: "Perdido",
  },
};

const IGNORED_FIELDS = new Set(["photos", "created_by"]);

interface KeyringHistoryProps {
  keyringId: string;
  maxHeight?: string;
}

export function KeyringHistory({ keyringId, maxHeight = "320px" }: KeyringHistoryProps) {
  const { data: entries, isLoading } = useAuditHistory({
    entityType: "asset_keyring",
    entityId: keyringId,
    queryKey: assetsKeys.keys.history(keyringId),
  });

  return (
    <AuditHistoryTimeline
      entries={entries}
      isLoading={isLoading}
      fieldLabels={FIELD_LABELS}
      ignoredFields={IGNORED_FIELDS}
      valueLabels={VALUE_LABELS}
      maxHeight={maxHeight}
    />
  );
}
