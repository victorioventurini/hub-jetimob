/**
 * InventoryHistory — Audit history for an inventory item.
 */

import { useAuditHistory } from "../../hooks/useAuditHistory";
import { AuditHistoryTimeline } from "../shared/AuditHistoryTimeline";
import { assetsKeys } from "@/lib/queryKeys/assets";

const FIELD_LABELS: Record<string, string> = {
  name: "Nome",
  internal_code: "Código interno",
  brand: "Marca",
  model: "Modelo",
  serial_number: "Número de série",
  status: "Status",
  description: "Descrição",
  notes: "Observações",
  category_id: "Categoria",
  home_location_id: "Localização base",
  current_location_id: "Localização atual",
  current_user_id: "Usuário atual",
  current_holder_type: "Tipo de posse",
  quantity_total: "Qtd. total",
  quantity_available: "Qtd. disponível",
  acquired_at: "Data de aquisição",
  acquisition_value: "Valor de aquisição",
  recommendation_id: "Recomendação",
  assigned_at: "Data de atribuição",
};

const VALUE_LABELS: Record<string, Record<string, string>> = {
  status: {
    available: "Disponível",
    loaned: "Emprestado",
    maintenance: "Manutenção",
    written_off: "Baixado",
  },
  current_holder_type: {
    location: "Localização",
    user: "Colaborador",
  },
};

const IGNORED_FIELDS = new Set([
  "photos", "documents", "last_moved_at", "created_by", "updated_by",
]);

interface InventoryHistoryProps {
  assetId: string;
  maxHeight?: string;
}

export function InventoryHistory({ assetId, maxHeight = "400px" }: InventoryHistoryProps) {
  const { data: entries, isLoading } = useAuditHistory({
    entityType: "asset_inventory",
    entityId: assetId,
    queryKey: assetsKeys.inventory.history(assetId),
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
