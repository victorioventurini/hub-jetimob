// ============================================================
// FALLBACK CONTACTS EDITOR - Configurar contatos padrão da empresa
// ============================================================

import { useState, useEffect } from "react";
import { AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  usePartnerContacts,
  useCompanyFallbackContacts,
  useUpdateFallbackContacts,
} from "@/modules/tickets/hooks";

interface FallbackContactsEditorProps {
  companyId: string;
}

export function FallbackContactsEditor({
  companyId,
}: FallbackContactsEditorProps) {
  const { data: allContacts = [], isLoading: loadingContacts } =
    usePartnerContacts(companyId);
  const { data: fallbackContacts = [], isLoading: loadingFallback } =
    useCompanyFallbackContacts(companyId);
  const updateMutation = useUpdateFallbackContacts();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize selection from current fallback contacts
  useEffect(() => {
    if (fallbackContacts.length > 0) {
      setSelectedIds(fallbackContacts.map((c) => c.id));
    } else {
      setSelectedIds([]);
    }
    setHasChanges(false);
  }, [fallbackContacts]);

  const activeContacts = allContacts.filter((c) => c.status === "active");

  const handleToggle = (contactId: string) => {
    setSelectedIds((prev) => {
      const newIds = prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId];
      
      // Check if different from original
      const originalIds = fallbackContacts.map((c) => c.id);
      const isDifferent =
        newIds.length !== originalIds.length ||
        newIds.some((id) => !originalIds.includes(id));
      setHasChanges(isDifferent);
      
      return newIds;
    });
  };

  const handleSave = () => {
    updateMutation.mutate({
      partnerCompanyId: companyId,
      contactIds: selectedIds,
    });
    setHasChanges(false);
  };

  if (loadingContacts || loadingFallback) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (activeContacts.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Nenhum contato ativo cadastrado para esta empresa. Cadastre contatos
          primeiro na aba "Contatos".
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">Contatos Padrão (Fallback)</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>
                Contatos padrão são selecionados automaticamente quando não
                houver um especialista para a subcategoria do ticket.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        {selectedIds.length > 0 && (
          <Badge variant="secondary">
            {selectedIds.length} selecionado{selectedIds.length > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      <ScrollArea className="h-[200px] rounded-md border p-3">
        <div className="space-y-2">
          {activeContacts.map((contact) => (
            <label
              key={contact.id}
              className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer transition-colors"
            >
              <Checkbox
                checked={selectedIds.includes(contact.id)}
                onCheckedChange={() => handleToggle(contact.id)}
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{contact.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {contact.email}
                </div>
              </div>
              {selectedIds.includes(contact.id) && (
                <Badge variant="outline" className="text-xs shrink-0">
                  Padrão
                </Badge>
              )}
            </label>
          ))}
        </div>
      </ScrollArea>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Estes contatos serão usados quando não houver especialista na
          subcategoria.
        </p>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!hasChanges || updateMutation.isPending}
        >
          {updateMutation.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
}
