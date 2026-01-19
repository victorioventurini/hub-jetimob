/**
 * AreasPage - Main page for managing strategic areas
 */
import { Helmet } from "react-helmet-async";
import { Plus, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { ListPageFilters } from "@/components/ui/list-page-filters";
import { useUrlState } from "@/shared/url";
import { useAreas } from "../hooks";
import { AreaCard } from "../components/AreaCard";
import { AreaFormDialog } from "../components/AreaFormDialog";
import { AreaWithRelations } from "../types";
import { useState } from "react";

export function AreasPage() {
  const searchState = useUrlState<string>({ key: "q", defaultValue: "" });
  const search = searchState.value;
  const setSearch = searchState.set;
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<AreaWithRelations | null>(null);

  const { data: areas, isLoading } = useAreas({ search });

  const handleEdit = (area: AreaWithRelations) => {
    setEditingArea(area);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingArea(null);
    setDialogOpen(true);
  };

  const handleCloseDialog = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingArea(null);
    }
  };

  return (
    <>
      <Helmet>
        <title>Áreas | Configurações | Hub Jetimob</title>
        <meta
          name="description"
          content="Gerencie as áreas estratégicas que agrupam os times da organização."
        />
      </Helmet>

      <div className="space-y-6">
        <PageHeader
          title="Áreas"
          description="Áreas estratégicas que agrupam times da organização"
          breadcrumbs={[
            { label: "Configurações", href: "/settings" },
            { label: "Áreas" },
          ]}
        />

        <ListPageFilters
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar áreas..."
          actions={
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Área
            </Button>
          }
        />

        {/* Areas Grid */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : areas && areas.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {areas.map((area) => (
              <AreaCard
                key={area.id}
                area={area}
                onEdit={handleEdit}
                onDelete={handleEdit}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">Nenhuma área encontrada</h3>
            <p className="mt-2 text-muted-foreground">
              {search
                ? "Tente uma busca diferente"
                : "Crie a primeira área para organizar seus times"}
            </p>
            {!search && (
              <Button onClick={handleCreate} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Nova Área
              </Button>
            )}
          </div>
        )}
      </div>

      <AreaFormDialog
        open={dialogOpen}
        setOpen={handleCloseDialog}
        area={editingArea}
      />
    </>
  );
}

export default AreasPage;
