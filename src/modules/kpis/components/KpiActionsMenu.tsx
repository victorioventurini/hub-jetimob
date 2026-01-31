import { useState } from "react";
import { MoreVertical, Edit, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useKpiMutations } from "../hooks/useKpiMutations";
import { KpiWithValues, KpiMetric } from "../types";
import { EditKpiDialog } from "./EditKpiDialog";
import { usePermissions } from "@/hooks/usePermissions";

interface KpiActionsMenuProps {
  kpi: KpiWithValues | KpiMetric;
  onActionComplete?: () => void;
}

export function KpiActionsMenu({ kpi, onActionComplete }: KpiActionsMenuProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { archiveKpi, reactivateKpi, deleteKpi } = useKpiMutations();
  const { has: hasPermission, isLoading } = usePermissions();
  const canManage = hasPermission("kpis:manage");

  // Early return if no permission (after hooks)
  if (!isLoading && !canManage) {
    return null;
  }

  const isArchived = kpi.status === 'inactive';

  const handleArchive = async () => {
    setIsProcessing(true);
    try {
      if (isArchived) {
        await reactivateKpi.mutateAsync(kpi.id);
      } else {
        await archiveKpi.mutateAsync(kpi.id);
      }
      setArchiveOpen(false);
      onActionComplete?.();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    setIsProcessing(true);
    try {
      await deleteKpi.mutateAsync(kpi.id);
      setDeleteOpen(false);
      onActionComplete?.();
    } finally {
      setIsProcessing(false);
    }
  };

  // Map KpiWithValues to KpiMetric for EditKpiDialog
  const kpiForEdit: KpiMetric = {
    id: kpi.id,
    name: kpi.name,
    description: kpi.description,
    category: kpi.category,
    bu_id: kpi.bu_id,
    owner_user_id: kpi.owner_user_id,
    team_id: kpi.team_id,
    unit: kpi.unit,
    direction: kpi.direction,
    frequency: kpi.frequency,
    target_value: kpi.target_value,
    status: kpi.status,
    source_type: kpi.source_type,
    source_config: kpi.source_config,
    visibility: kpi.visibility,
    comparison_rule: kpi.direction === 'up' ? 'higher_is_better' : 'lower_is_better',
    linked_okrs: kpi.linked_okrs,
    created_at: kpi.created_at,
    updated_at: kpi.updated_at,
    deleted_at: kpi.deleted_at,
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Ações</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setArchiveOpen(true)}>
            {isArchived ? (
              <>
                <ArchiveRestore className="mr-2 h-4 w-4" />
                Reativar
              </>
            ) : (
              <>
                <Archive className="mr-2 h-4 w-4" />
                Arquivar
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Dialog */}
      <EditKpiDialog
        kpi={kpiForEdit}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      {/* Archive/Reactivate Dialog */}
      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isArchived ? "Reativar KPI" : "Arquivar KPI"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isArchived
                ? `O KPI "${kpi.name}" será reativado e voltará a aparecer no dashboard.`
                : `O KPI "${kpi.name}" será arquivado e não aparecerá mais no dashboard. Você pode reativá-lo depois.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} disabled={isProcessing}>
              {isProcessing
                ? isArchived
                  ? "Reativando..."
                  : "Arquivando..."
                : isArchived
                ? "Reativar"
                : "Arquivar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir KPI</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o KPI "{kpi.name}"?
              <br />
              <span className="text-destructive font-medium">
                Esta ação não pode ser desfeita e todos os dados históricos serão perdidos.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
