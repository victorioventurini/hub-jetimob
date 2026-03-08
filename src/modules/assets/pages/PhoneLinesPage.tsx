/**
 * PhoneLinesPage — Main page for phone lines submodule.
 * Layout: ListPageFilters → PhoneLineFilters → ViewOptionsBar → PhoneLineTable
 */

import { useState, useCallback } from "react";
import { Smartphone, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ListPageFilters } from "@/components/ui/list-page-filters";
import { ViewOptionsBar } from "@/components/ui/view-options-bar";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAssetPermissionsV2 } from "@/modules/assets/hooks";
import { useUrlState } from "@/shared/url";
import {
  usePhoneLinesQuery,
  usePhoneLineCarriersQuery,
  usePhoneLineMutations,
} from "../hooks/usePhoneLines";
import { PhoneLineTable } from "../components/phone-lines/PhoneLineTable";
import { PhoneLineFilters } from "../components/phone-lines/PhoneLineFilters";
import { PhoneLineDialog } from "../components/phone-lines/PhoneLineDialog";
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
import { BuUserSelect } from "@/components/selects/BuUserSelect";
import type { PhoneLine, PhoneLineStatus } from "../hooks/usePhoneLines";

export default function PhoneLinesPage() {
  usePageTitle("Linhas Telefônicas", {
    customDescription: "Gerencie as linhas telefônicas corporativas da unidade.",
  });

  // URL State
  const searchState = useUrlState<string>({ key: "q", defaultValue: "" });
  const statusState = useUrlState<string>({ key: "status", defaultValue: "all" });
  const carrierState = useUrlState<string>({ key: "carrier", defaultValue: "all" });

  const filters = {
    search: searchState.value || undefined,
    status: statusState.value as PhoneLineStatus | "all",
    carrier: carrierState.value !== "all" ? carrierState.value : undefined,
  };

  // Queries
  const { data: items = [], isLoading } = usePhoneLinesQuery(filters);
  const { data: carriers = [] } = usePhoneLineCarriersQuery();
  const { deletePhoneLine, loanPhoneLine, returnPhoneLine } = usePhoneLineMutations();

  // Permissions
  const { canManagePhoneLines, canViewPhoneLines } = useAssetPermissionsV2();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<PhoneLine | null>(null);
  const [deleteItem, setDeleteItem] = useState<PhoneLine | null>(null);
  const [loanItem, setLoanItem] = useState<PhoneLine | null>(null);
  const [loanUserId, setLoanUserId] = useState<string | null>(null);

  const handleEdit = useCallback((item: PhoneLine) => {
    setEditItem(item);
    setDialogOpen(true);
  }, []);

  const handleCreate = useCallback(() => {
    setEditItem(null);
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteItem) return;
    await deletePhoneLine.mutateAsync(deleteItem.id);
    setDeleteItem(null);
  }, [deleteItem, deletePhoneLine]);

  const handleLoan = useCallback(async () => {
    if (!loanItem || !loanUserId) return;
    await loanPhoneLine.mutateAsync({ id: loanItem.id, current_user_id: loanUserId });
    setLoanItem(null);
    setLoanUserId(null);
  }, [loanItem, loanUserId, loanPhoneLine]);

  const handleReturn = useCallback(async (item: PhoneLine) => {
    await returnPhoneLine.mutateAsync(item.id);
  }, [returnPhoneLine]);

  const hasActiveFilters = statusState.value !== "all" || carrierState.value !== "all";

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search + Filters + Button */}
      <div className="flex flex-wrap items-center gap-3">
        <ListPageFilters
          searchValue={searchState.value}
          onSearchChange={searchState.set}
          searchPlaceholder="Buscar por número, operadora..."
          searchClassName="w-full sm:w-auto sm:min-w-[220px]"
        >
          <PhoneLineFilters
            statusFilter={statusState.value as PhoneLineStatus | "all"}
            onStatusChange={statusState.set}
            carrierFilter={carrierState.value}
            onCarrierChange={carrierState.set}
            carriers={carriers}
          />
        </ListPageFilters>

        {canManagePhoneLines && (
          <div className="shrink-0 ml-auto">
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Linha
            </Button>
          </div>
        )}
      </div>

      {/* Result count */}
      <ViewOptionsBar
        resultCount={items.length}
        resultCountLabel="linhas encontradas"
        resultCountLabelSingular="linha encontrada"
      />

      {/* Content */}
      {items.length === 0 ? (
        <EmptyState
          icon={Smartphone}
          title="Nenhuma linha encontrada"
          description={
            searchState.value || hasActiveFilters
              ? "Tente ajustar os filtros"
              : "Cadastre a primeira linha telefônica"
          }
          actionLabel={canManagePhoneLines && !searchState.value && !hasActiveFilters ? "Nova Linha" : undefined}
          onAction={canManagePhoneLines && !searchState.value && !hasActiveFilters ? handleCreate : undefined}
        />
      ) : (
        <PhoneLineTable
          items={items}
          canManage={canManagePhoneLines}
          onEdit={handleEdit}
          onDelete={(item) => setDeleteItem(item)}
          onLoan={(item) => { setLoanItem(item); setLoanUserId(null); }}
          onReturn={handleReturn}
        />
      )}

      {/* Create/Edit dialog */}
      <PhoneLineDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={editItem}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir linha telefônica?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá remover a linha do sistema. Essa operação pode ser revertida por um administrador.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Loan dialog */}
      <AlertDialog open={!!loanItem} onOpenChange={(open) => { if (!open) { setLoanItem(null); setLoanUserId(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Emprestar linha</AlertDialogTitle>
            <AlertDialogDescription>
              Selecione o responsável pela linha telefônica.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <BuUserSelect
              value={loanUserId ?? undefined}
              onValueChange={(val) => setLoanUserId(val)}
              placeholder="Selecione o responsável"
              showSearch
              excludeExternal
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleLoan} disabled={!loanUserId}>
              Emprestar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
