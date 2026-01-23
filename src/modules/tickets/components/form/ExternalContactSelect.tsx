// ============================================================
// EXTERNAL CONTACT SELECT - Seleção de contato externo no ticket
// ============================================================

import { useEffect } from "react";
import { User, Users, AlertCircle, CheckCircle2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAvailableExternalContacts,
  type AvailableExternalContact,
} from "@/modules/tickets/hooks";

interface ExternalContactSelectProps {
  partnerCompanyId: string | undefined;
  subcategoryId: string | undefined;
  categoryId: string | undefined;
  value: string | undefined;
  onChange: (contactId: string | undefined) => void;
  disabled?: boolean;
}

export function ExternalContactSelect({
  partnerCompanyId,
  subcategoryId,
  categoryId,
  value,
  onChange,
  disabled = false,
}: ExternalContactSelectProps) {
  const { contacts, source, isLoading } = useAvailableExternalContacts(
    partnerCompanyId,
    subcategoryId,
    categoryId
  );

  // Auto-select if only one contact
  useEffect(() => {
    if (contacts.length === 1 && !value) {
      onChange(contacts[0].id);
    }
  }, [contacts, value, onChange]);

  // Clear selection if contact list changes and current selection is invalid
  useEffect(() => {
    if (value && contacts.length > 0 && !contacts.find((c) => c.id === value)) {
      onChange(undefined);
    }
  }, [contacts, value, onChange]);

  if (!partnerCompanyId) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  // No contacts available
  if (contacts.length === 0) {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">Contato Responsável</Label>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Nenhum contato disponível para esta subcategoria. Configure
            capacidades ou contatos padrão nas configurações da empresa.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Only one contact - show as selected automatically
  if (contacts.length === 1) {
    const contact = contacts[0];
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">Contato Responsável</Label>
          {source === "fallback" && (
            <Badge variant="secondary" className="text-xs">
              Padrão
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 p-3 rounded-md border bg-muted/30">
          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm">{contact.name}</div>
            <div className="text-xs text-muted-foreground truncate">
              {contact.email}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Multiple contacts - show select
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">Contato Responsável</Label>
        {source === "fallback" && (
          <Badge variant="secondary" className="text-xs">
            Contatos Padrão
          </Badge>
        )}
        {source === "capability" && (
          <Badge variant="outline" className="text-xs">
            Especialistas
          </Badge>
        )}
      </div>
      <Select
        value={value}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecione o contato responsável..." />
        </SelectTrigger>
        <SelectContent>
          {contacts.map((contact) => (
            <SelectItem key={contact.id} value={contact.id}>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{contact.name}</span>
                <span className="text-muted-foreground text-xs">
                  ({contact.email})
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        {source === "capability"
          ? "Contatos com capacidade para atender esta subcategoria."
          : "Contatos padrão da empresa (nenhum especialista encontrado)."}
      </p>
    </div>
  );
}
