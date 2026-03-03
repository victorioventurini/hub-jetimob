import { useState } from "react";
import { MoreVertical, Edit, Archive, ArchiveRestore, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
import { useCanEditKpi } from "../hooks/useCanEditKpi";
import { KpiMetric, KpiValueSource, KpiVisibility, KpiIndicatorType, KpiLifecycleStatus, KpiScope, KpiDirection, KpiFrequency } from "../types";
import { EditKpiDialog } from "./EditKpiDialog";
import { AddKpiValueDialog } from "./AddKpiValueDialog";
import { usePermissions } from "@/hooks/usePermissions";

/**
 * Tipo base para o menu de ações - aceita qualquer KPI com campos mínimos
 * Compatível com KpiWithValues, KpiMetric e o retorno de useKpiDetail
 */
interface KpiForActions {
  id: string;
  name: string;
  bu_id: string;
  status: 'active' | 'inactive';
  owner_user_id?: string | null;
  team_id?: string | null;
  area_id?: string | null;
  // Outros campos opcionais para EditKpiDialog
  description?: string | null;
  unit?: string;
  direction?: KpiDirection | string;
  frequency?: KpiFrequency | string;
  target_value?: number | null;
  source_type?: KpiValueSource | string;
  source_config?: Record<string, unknown> | null;
  visibility?: KpiVisibility | string;
  linked_okrs?: string[];
  indicator_type?: KpiIndicatorType | string;
  lifecycle_status?: KpiLifecycleStatus | string;
  target_source?: string | null;
  recovery_protocol?: string | null;
  scope?: KpiScope | string;
  // v2.90.0: operational responsibility
  responsible_area_id?: string | null;
  responsible_team_id?: string | null;
  area?: { id: string; name: string; color: string | null };
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

interface KpiActionsMenuProps {
  kpi: KpiForActions;
  onActionComplete?: () => void;
  /** Sempre mostra o botão (para tabelas), ao invés de só no hover */
  alwaysVisible?: boolean;
}

export function KpiActionsMenu({ kpi, onActionComplete, alwaysVisible = false }: KpiActionsMenuProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [updateValueOpen, setUpdateValueOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { archiveKpi, reactivateKpi, deleteKpi } = useKpiMutations();
  const { has: hasPermission, isLoading: permissionLoading } = usePermissions();
  const { canEdit, canUpdateValues, isLoading: canEditLoading } = useCanEditKpi(kpi);
  
  // Pode gerenciar (arquivar/excluir) - apenas admins
  const canManage = hasPermission("kpis.settings.manage:bu");
  
  const isLoading = permissionLoading || canEditLoading;

  // Early return if no permission at all (after hooks)
  // canUpdateValues é mais amplo que canEdit — inclui contribuidores e líderes
  if (!isLoading && !canEdit && !canUpdateValues) {
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

  // Map KpiForActions to KpiMetric for EditKpiDialog
  // v2.82.0: category deprecated - using area_id for ownership
  const kpiForEdit: KpiMetric = {
    id: kpi.id,
    name: kpi.name,
    description: kpi.description ?? null,
    // category deprecated v2.82.0
    bu_id: kpi.bu_id,
    owner_user_id: kpi.owner_user_id ?? null,
    team_id: kpi.team_id ?? null,
    unit: kpi.unit ?? '%',
    direction: (kpi.direction ?? 'up') as KpiDirection,
    frequency: (kpi.frequency ?? 'monthly') as KpiFrequency,
    target_value: kpi.target_value ?? null,
    status: kpi.status,
    source_type: (kpi.source_type ?? 'manual') as KpiValueSource,
    source_config: kpi.source_config ?? null,
    visibility: (kpi.visibility ?? 'bu') as KpiVisibility,
    comparison_rule: (kpi.direction ?? 'up') === 'up' ? 'higher_is_better' : 'lower_is_better',
    linked_okrs: kpi.linked_okrs ?? [],
    created_at: kpi.created_at ?? new Date().toISOString(),
    updated_at: kpi.updated_at ?? new Date().toISOString(),
    deleted_at: kpi.deleted_at ?? null,
    // v2.1 fields
    indicator_type: (kpi.indicator_type ?? 'kpi') as KpiIndicatorType,
    lifecycle_status: (kpi.lifecycle_status ?? 'active') as KpiLifecycleStatus,
    target_source: kpi.target_source ?? null,
    recovery_protocol: kpi.recovery_protocol ?? null,
    // v2.2 governance fields
    area_id: kpi.area_id ?? null,
    scope: (kpi.scope ?? 'team') as KpiScope,
    // v2.90.0: operational responsibility
    responsible_area_id: kpi.responsible_area_id ?? null,
    responsible_team_id: kpi.responsible_team_id ?? null,
    area: kpi.area,
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 transition-opacity",
              !alwaysVisible && "opacity-0 group-hover:opacity-100"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Ações</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          {canUpdateValues && (
            <DropdownMenuItem onClick={() => setUpdateValueOpen(true)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </DropdownMenuItem>
          )}
          {canEdit && (
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
          )}
          {/* Arquivar/Excluir apenas para admins */}
          {canManage && (
            <>
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
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Update Value Dialog */}
      <AddKpiValueDialog
        kpiId={kpi.id}
        kpiName={kpi.name}
        unit={kpi.unit ?? '%'}
        open={updateValueOpen}
        onOpenChange={setUpdateValueOpen}
      />

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
