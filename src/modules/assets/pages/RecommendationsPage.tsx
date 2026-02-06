/**
 * RecommendationsPage
 * 
 * List and manage equipment recommendations.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { HubLayout } from "@/components/layout/HubLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useBu } from "@/contexts/BuContext";
import { Plus, ArrowLeft } from "lucide-react";
import {
  RecommendationsTable,
  RecommendationFilters,
  RecommendationFormDialog,
} from "../components/recommendations";
import { useRecommendations, useAssetPermissionsV2, type RecommendationFilters as Filters } from "../hooks";
import type { AssetRecommendation } from "../types";

export default function RecommendationsPage() {
  usePageTitle("Recomendações de Equipamentos");
  const { currentBu } = useBu();
  const { hasFullAccess, canManageInventory } = useAssetPermissionsV2();
  const canManage = hasFullAccess || canManageInventory;

  const [filters, setFilters] = useState<Filters>({});
  const [formOpen, setFormOpen] = useState(false);
  const [editingRec, setEditingRec] = useState<AssetRecommendation | null>(null);

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

  return (
    <HubLayout>
      <div className="space-y-6">
        <PageHeader
          title="Recomendações de Equipamentos"
          description={`Guias de compra para ${currentBu?.name || "organização"}`}
          breadcrumbs={[
            { label: "Ativos", href: "/assets" },
            { label: "Recomendações" },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/assets/inventory">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Link>
              </Button>
              {canManage && (
                <Button size="sm" onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Recomendação
                </Button>
              )}
            </div>
          }
        />

        <RecommendationFilters filters={filters} onFiltersChange={setFilters} />

        <RecommendationsTable
          recommendations={recommendations}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={(rec) => deleteRecommendation(rec.id)}
          onMarkReviewed={(rec) => markAsReviewed(rec.id)}
          onView={handleEdit}
          canManage={canManage}
        />

        <RecommendationFormDialog
          open={formOpen}
          onOpenChange={handleCloseForm}
          recommendation={editingRec}
        />
      </div>
    </HubLayout>
  );
}
