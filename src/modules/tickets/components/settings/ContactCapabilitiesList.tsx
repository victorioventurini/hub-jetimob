import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Plus, Pencil, Trash2, FolderTree } from "lucide-react";
import {
  useContactCapabilities,
  useDeleteContactCapability,
  type ContactCapability,
} from "../../hooks/useContactCapabilities";
import { CapabilityEditDialog } from "./CapabilityEditDialog";
import { toast } from "sonner";

interface ContactCapabilitiesListProps {
  contactId: string;
  companyId: string;
}

export function ContactCapabilitiesList({
  contactId,
  companyId,
}: ContactCapabilitiesListProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ContactCapability | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContactCapability | null>(null);

  const { data: capabilities = [], isLoading } = useContactCapabilities(contactId);
  const deleteCapability = useDeleteContactCapability();

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCapability.mutateAsync(deleteTarget.id);
      toast.success("Capacidade removida");
      setDeleteTarget(null);
    } catch (error) {
      toast.error("Erro ao remover capacidade");
    }
  };

  if (isLoading) {
    return <LoadingState text="Carregando capacidades..." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Categorias que este contato pode atender automaticamente.
        </p>
        <Button size="sm" onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar
        </Button>
      </div>

      {capabilities.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="Nenhuma capacidade configurada"
          description="Adicione capacidades para que tickets sejam atribuídos automaticamente."
          actionLabel="Adicionar capacidade"
          onAction={() => setAddDialogOpen(true)}
        />
      ) : (
        <div className="space-y-2">
          {capabilities.map((cap) => (
            <div
              key={cap.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">{cap.category?.name}</Badge>
                {cap.subcategory ? (
                  <Badge variant="secondary">{cap.subcategory.name}</Badge>
                ) : (
                  <Badge variant="default" className="text-xs">
                    Categoria inteira
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditTarget(cap)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteTarget(cap)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Dialog */}
      <CapabilityEditDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        contactId={contactId}
        companyId={companyId}
        capability={null}
      />

      {/* Edit Dialog */}
      <CapabilityEditDialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        contactId={contactId}
        companyId={companyId}
        capability={editTarget}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remover capacidade"
        description={`Remover a capacidade para "${deleteTarget?.category?.name}"?`}
        isLoading={deleteCapability.isPending}
      />
    </div>
  );
}
