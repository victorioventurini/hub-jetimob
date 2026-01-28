/**
 * Editor de supervisores de empresa parceira.
 * 
 * Supervisores são usuários (internos ou externos) que acompanham
 * automaticamente todos os tickets de uma empresa parceira como watchers.
 * 
 * - Internos: Usa BuUserMultiSelect (usuários da BU)
 * - Externos: Lista checkboxes com contatos da empresa
 */

import { useState, useEffect } from "react";
import { Users, Info, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BuUserMultiSelect } from "@/components/selects/BuUserMultiSelect";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { OptimizedAvatar } from "@/components/ui/optimized-avatar";
import { usePartnerSupervisors, useUpdatePartnerSupervisors } from "../../hooks";
import { usePartnerCompanyContacts } from "../../hooks/usePartnerCompanyContacts";

interface SupervisorsEditorProps {
  companyId: string;
}

export function SupervisorsEditor({ companyId }: SupervisorsEditorProps) {
  const { data, isLoading } = usePartnerSupervisors(companyId);
  const { data: companyContacts = [], isLoading: isLoadingContacts } = usePartnerCompanyContacts({ partnerCompanyId: companyId });
  const { mutate: updateSupervisors, isPending } = useUpdatePartnerSupervisors();
  
  const [internalIds, setInternalIds] = useState<string[]>([]);
  const [externalIds, setExternalIds] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync local state with fetched data
  useEffect(() => {
    if (data) {
      setInternalIds(data.internalSupervisorIds);
      setExternalIds(data.externalSupervisorIds);
      setHasChanges(false);
    }
  }, [data]);

  const handleInternalChange = (ids: string[]) => {
    setInternalIds(ids);
    setHasChanges(true);
  };

  const handleExternalToggle = (contactId: string) => {
    setExternalIds(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
    setHasChanges(true);
  };

  const handleSave = () => {
    updateSupervisors(
      { 
        companyId, 
        internalSupervisorIds: internalIds,
        externalSupervisorIds: externalIds,
      },
      { onSuccess: () => setHasChanges(false) }
    );
  };

  const handleCancel = () => {
    setInternalIds(data?.internalSupervisorIds ?? []);
    setExternalIds(data?.externalSupervisorIds ?? []);
    setHasChanges(false);
  };

  // Contacts are already filtered as active by the hook
  const activeContacts = companyContacts;

  if (isLoading || isLoadingContacts) {
    return <Skeleton className="h-32 w-full" />;
  }

  return (
    <div className="space-y-5">
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

      {/* Supervisores Internos */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          Supervisores Internos
        </Label>
        <p className="text-xs text-muted-foreground">
          Usuários da BU que acompanham os tickets desta empresa.
        </p>
        <BuUserMultiSelect
          value={internalIds}
          onValueChange={handleInternalChange}
          placeholder="Selecione usuários internos..."
          excludeExternal
          disabled={isPending}
        />
      </div>

      {/* Supervisores Externos */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5" />
          Supervisores Externos
        </Label>
        <p className="text-xs text-muted-foreground">
          Contatos da empresa parceira que acompanham os tickets.
        </p>
        
        {activeContacts.length === 0 ? (
          <div className="text-sm text-muted-foreground py-3 px-4 bg-muted/50 rounded-md">
            Nenhum contato ativo cadastrado para esta empresa.
          </div>
        ) : (
          <div className="space-y-2 border rounded-md p-3 max-h-48 overflow-y-auto">
            {activeContacts.map(contact => (
              <div 
                key={contact.id} 
                className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-muted/50 cursor-pointer"
                onClick={() => handleExternalToggle(contact.id)}
              >
                <Checkbox
                  id={`contact-${contact.id}`}
                  checked={externalIds.includes(contact.id)}
                  onCheckedChange={() => handleExternalToggle(contact.id)}
                  disabled={isPending}
                />
                <OptimizedAvatar
                  src={null}
                  fallback={contact.name.slice(0, 2).toUpperCase()}
                  size="sm"
                  className="h-7 w-7"
                  fallbackClassName="text-[10px]"
                />
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-medium truncate">{contact.name}</span>
                  <span className="text-xs text-muted-foreground truncate">{contact.email}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {hasChanges && (
        <div className="flex justify-end gap-2 pt-2">
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
