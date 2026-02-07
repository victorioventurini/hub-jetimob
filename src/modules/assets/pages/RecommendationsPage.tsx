/**
 * RecommendationsPage
 * 
 * List and manage equipment recommendations.
 * Allows creating inventory items directly from a recommendation.
 */

import { useState } from "react";
import { HubLayout } from "@/components/layout/HubLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { InfoNotice } from "@/components/ui/info-notice";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useBu } from "@/contexts/BuContext";
import { Plus } from "lucide-react";
import {
  RecommendationsTable,
  RecommendationFilters,
  RecommendationFormDialog,
} from "../components/recommendations";
import { InventoryFormDialog } from "../components/inventory/InventoryFormDialog";
import { useRecommendations, useAssetPermissionsV2, type RecommendationFilters as Filters } from "../hooks";
import type { AssetRecommendation } from "../types";

export default function RecommendationsPage() {
  usePageTitle("Recomendações de Equipamentos");
  const { currentBu } = useBu();
  const { canManageRecommendations, canReviewRecommendations, canManageInventory } = useAssetPermissionsV2();

  const [filters, setFilters] = useState<Filters>({});
  const [formOpen, setFormOpen] = useState(false);
  const [editingRec, setEditingRec] = useState<AssetRecommendation | null>(null);

  // State for creating inventory item from recommendation
  const [inventoryFormOpen, setInventoryFormOpen] = useState(false);
  const [inventoryFromRec, setInventoryFromRec] = useState<AssetRecommendation | null>(null);

  const {
    recommendations,
    isLoading,
    markAsReviewed,
    deleteRecommendation,
  } = useRecommendations(filters);

  const handleEdit = (rec: AssetRecommendation) => {
    setEditingRec(rec);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setEditingRec(null);
    setFormOpen(true);
  };

  const handleCloseForm = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditingRec(null);
  };

  const handleCreateInventoryItem = (rec: AssetRecommendation) => {
    setInventoryFromRec(rec);
    setInventoryFormOpen(true);
  };

  return (
    <HubLayout>
      <div className="space-y-6">
        <PageHeader
          title="Recomendações de Equipamentos"
          description={`Guias de compras da ${currentBu?.name || "organização"}`}
          breadcrumbs={[
            { label: "Ativos", href: "/assets" },
            { label: "Inventário", href: "/assets/inventory" },
            { label: "Recomendações" },
          ]}
          actions={
            canManageRecommendations && (
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Recomendação
              </Button>
            )
          }
        />

        <InfoNotice variant="warning">
          Toda compra de múltiplas unidades requer revisão da recomendação, 
          mesmo quando ela estiver dentro do prazo de atualização.
        </InfoNotice>

        <RecommendationFilters filters={filters} onFiltersChange={setFilters} />

        <RecommendationsTable
          recommendations={recommendations}
          isLoading={isLoading}
          onEdit={canManageRecommendations ? handleEdit : undefined}
          onDelete={canManageRecommendations ? (rec) => deleteRecommendation(rec.id) : undefined}
          onMarkReviewed={canReviewRecommendations ? (rec) => markAsReviewed(rec.id) : undefined}
          onView={handleEdit}
          canManage={canManageRecommendations}
          onCreateItem={canManageInventory ? handleCreateInventoryItem : undefined}
        />

        <RecommendationFormDialog
          open={formOpen}
          onOpenChange={handleCloseForm}
          recommendation={editingRec}
        />

        {/* Inventory creation from recommendation */}
        <InventoryFormDialog
          open={inventoryFormOpen}
          onOpenChange={(open) => {
            setInventoryFormOpen(open);
            if (!open) setInventoryFromRec(null);
          }}
          preSelectedRecommendation={inventoryFromRec}
        />
      </div>
    </HubLayout>
  );
}
