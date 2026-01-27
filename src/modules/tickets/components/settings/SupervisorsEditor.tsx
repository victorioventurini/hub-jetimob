/**
 * Editor de supervisores de empresa parceira.
 * 
 * Supervisores são usuários internos que acompanham automaticamente
 * todos os tickets de uma empresa parceira como watchers.
 * 
 * Usa BuUserMultiSelect (componente canônico) para seleção.
 */

import { useState, useEffect } from "react";
import { Users, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BuUserMultiSelect } from "@/components/selects/BuUserMultiSelect";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePartnerSupervisors, useUpdatePartnerSupervisors } from "../../hooks";

interface SupervisorsEditorProps {
  companyId: string;
}

export function SupervisorsEditor({ companyId }: SupervisorsEditorProps) {
  const { data, isLoading } = usePartnerSupervisors(companyId);
  const { mutate: updateSupervisors, isPending } = useUpdatePartnerSupervisors();
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync local state with fetched data
  useEffect(() => {
    if (data?.supervisorIds) {
      setSelectedIds(data.supervisorIds);
      setHasChanges(false);
    }
  }, [data?.supervisorIds]);

  const handleChange = (ids: string[]) => {
    setSelectedIds(ids);
    setHasChanges(true);
  };

  const handleSave = () => {
    updateSupervisors(
      { companyId, supervisorIds: selectedIds },
      { onSuccess: () => setHasChanges(false) }
    );
  };

  const handleCancel = () => {
    setSelectedIds(data?.supervisorIds ?? []);
    setHasChanges(false);
  };

  if (isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <h4 className="font-medium">Supervisores</h4>
      </div>
      
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Supervisores são automaticamente adicionados como observadores em todos 
          os novos tickets desta empresa. Eles podem visualizar e interagir com os tickets.
        </AlertDescription>
      </Alert>

      <BuUserMultiSelect
        value={selectedIds}
        onValueChange={handleChange}
        placeholder="Selecione supervisores..."
        excludeExternal
        disabled={isPending}
      />

      {hasChanges && (
        <div className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCancel}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button 
            size="sm" 
            onClick={handleSave}
            disabled={isPending}
          >
            Salvar
          </Button>
        </div>
      )}
    </div>
  );
}
