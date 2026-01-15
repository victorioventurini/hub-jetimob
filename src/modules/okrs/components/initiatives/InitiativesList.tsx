import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Lightbulb, AlertCircle } from "lucide-react";
import { useKrInitiatives, useDeleteInitiative } from "../../hooks";
import { InitiativeCard } from "./InitiativeCard";
import { InitiativeDialog } from "./InitiativeDialog";
import { InitiativeQuickUpdateDialog } from "./InitiativeQuickUpdateDialog";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useProfileId } from "@/hooks/useIdentity";
import type { Initiative } from "../../types/initiative";

interface KrContext {
  id: string;
  title: string;
  objectiveTitle?: string;
  teamName?: string;
}

interface InitiativesListProps {
  krId: string;
  krTitle?: string;
  krContext?: KrContext;
  canEdit?: boolean;
  /** Se presente, filtra apenas iniciativas deste usuário (usado na view "Minhas OKRs") */
  filterForUserId?: string;
}

export function InitiativesList({ krId, krTitle, krContext, canEdit = true, filterForUserId }: InitiativesListProps) {
  const profileId = useProfileId();
  const { data: initiatives, isLoading } = useKrInitiatives(krId);
  const deleteMutation = useDeleteInitiative();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInitiative, setEditingInitiative] = useState<Initiative | null>(null);
  const [deletingInitiative, setDeletingInitiative] = useState<Initiative | null>(null);
  const [quickUpdateInitiative, setQuickUpdateInitiative] = useState<Initiative | null>(null);
  
  // Check if user can edit a specific initiative (owner or general canEdit)
  const canEditInitiative = (initiative: Initiative) => {
    return canEdit || initiative.owner_user_id === profileId;
  };

  const handleEdit = (initiative: Initiative) => {
    setEditingInitiative(initiative);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingInitiative) return;
    await deleteMutation.mutateAsync({ initiativeId: deletingInitiative.id, krId });
    setDeletingInitiative(null);
  };

  const handleCloseDialog = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingInitiative(null);
    }
  };

  // Filter initiatives by user if filterForUserId is provided
  const filteredInitiatives = useMemo(() => {
    if (!filterForUserId || !initiatives) return initiatives;
    return initiatives.filter(i => i.owner_user_id === filterForUserId);
  }, [initiatives, filterForUserId]);

  // Calculate insights using filtered initiatives
  const blockedCount = filteredInitiatives?.filter(i => i.status === 'blocked').length || 0;
  const activeCount = filteredInitiatives?.filter(i => i.status === 'in_progress').length || 0;
  const completedCount = filteredInitiatives?.filter(i => i.status === 'completed').length || 0;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">Iniciativas</h3>
          <span className="text-sm text-muted-foreground">
            ({filteredInitiatives?.length || 0})
          </span>
        </div>
        
        {canEdit && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setEditingInitiative(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Adicionar
          </Button>
        )}
      </div>

      {/* Insights */}
      {filteredInitiatives && filteredInitiatives.length > 0 && (blockedCount > 0 || (activeCount === 0 && completedCount < filteredInitiatives.length)) && (
        <div className="flex flex-wrap gap-2">
          {blockedCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs bg-status-red-muted text-status-red px-2 py-1 rounded-md">
              <AlertCircle className="w-3 h-3" />
              {blockedCount} iniciativa{blockedCount > 1 ? 's' : ''} bloqueada{blockedCount > 1 ? 's' : ''}
            </div>
          )}
          {activeCount === 0 && completedCount < filteredInitiatives.length && (
            <div className="flex items-center gap-1.5 text-xs bg-status-yellow-muted text-status-yellow px-2 py-1 rounded-md">
              <AlertCircle className="w-3 h-3" />
              Nenhuma iniciativa em progresso
            </div>
          )}
        </div>
      )}

      {/* List */}
      {!filteredInitiatives || filteredInitiatives.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhuma iniciativa cadastrada</p>
          {canEdit && (
            <p className="text-xs mt-1">
              Adicione iniciativas para mostrar o que será feito para mover esta KR
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInitiatives.map((initiative) => {
            const canManageThis = canEditInitiative(initiative);
            return (
              <InitiativeCard
                key={initiative.id}
                initiative={initiative}
                onQuickUpdate={canManageThis ? setQuickUpdateInitiative : undefined}
                onEdit={canManageThis ? handleEdit : undefined}
                onDelete={canManageThis ? setDeletingInitiative : undefined}
              />
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <InitiativeDialog
        open={dialogOpen}
        onOpenChange={handleCloseDialog}
        krId={krId}
        krContext={krContext || (krTitle ? { id: krId, title: krTitle } : undefined)}
        initiative={editingInitiative}
      />

      <InitiativeQuickUpdateDialog
        open={!!quickUpdateInitiative}
        onOpenChange={(open) => !open && setQuickUpdateInitiative(null)}
        initiative={quickUpdateInitiative}
        krContext={krContext || (krTitle ? { id: krId, title: krTitle } : undefined)}
      />

      <DeleteConfirmDialog
        open={!!deletingInitiative}
        onOpenChange={(open) => !open && setDeletingInitiative(null)}
        onConfirm={handleDelete}
        title="Excluir iniciativa"
        description={`Tem certeza que deseja excluir a iniciativa "${deletingInitiative?.name}"?`}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
