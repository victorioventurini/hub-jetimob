import { useState, useMemo } from "react";
import { AlertTriangle, ArrowRight, Ticket } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { usePendingTicketsForContact, useMigrateAndRemoveContact } from "../../hooks/useContactTicketMigration";
import { usePartnerContacts } from "../../hooks";
import type { PartnerContact } from "../../types";

interface MigrateTicketsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: PartnerContact;
  onSuccess?: () => void;
}

export function MigrateTicketsDialog({
  open,
  onOpenChange,
  contact,
  onSuccess,
}: MigrateTicketsDialogProps) {
  const [targetContactId, setTargetContactId] = useState<string>("");
  
  // Get pending tickets for this contact
  const { data: pendingTickets = [], isLoading: loadingTickets } = usePendingTicketsForContact(
    open ? contact.id : null
  );
  
  // Get other contacts from the same company
  const { data: allContacts = [], isLoading: loadingContacts } = usePartnerContacts(
    open ? contact.partner_company_id : undefined
  );
  
  // Filter out the current contact and inactive contacts
  const availableContacts = useMemo(() => 
    allContacts.filter(c => c.id !== contact.id && c.status === "active"),
    [allContacts, contact.id]
  );
  
  const { mutate: migrateAndRemove, isPending } = useMigrateAndRemoveContact();
  
  const hasTickets = pendingTickets.length > 0;
  const isLoading = loadingTickets || loadingContacts;
  const canSubmit = !hasTickets || (hasTickets && targetContactId);
  
  const handleConfirm = () => {
    migrateAndRemove(
      {
        contactId: contact.id,
        targetContactId: hasTickets ? targetContactId : undefined,
        ticketIds: pendingTickets.map(t => t.id),
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setTargetContactId("");
          onSuccess?.();
        },
      }
    );
  };
  
  const selectedContact = availableContacts.find(c => c.id === targetContactId);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Remover Contato Externo
          </DialogTitle>
          <DialogDescription>
            Você está removendo <strong>{contact.name}</strong> do sistema.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : hasTickets ? (
            <>
              <Alert>
                <Ticket className="h-4 w-4" />
                <AlertDescription className="text-warning">
                  Este contato possui <strong>{pendingTickets.length} ticket(s) em aberto</strong>.
                  {" "}Selecione outro contato da mesma empresa para assumir esses tickets.
                </AlertDescription>
              </Alert>
              
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm text-muted-foreground mb-2">Tickets a serem migrados:</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                {pendingTickets.map(ticket => (
                    <div key={ticket.id} className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="font-mono text-xs">
                        #{ticket.id.slice(0, 8)}
                      </Badge>
                      <span className="truncate">{ticket.title || "Sem título"}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="target-contact">
                  Novo responsável <span className="text-destructive">*</span>
                </Label>
                
                {availableContacts.length === 0 ? (
                  <Alert variant="destructive">
                    <AlertDescription>
                      Não há outros contatos ativos nesta empresa. Cadastre outro contato antes de remover este.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Select value={targetContactId} onValueChange={setTargetContactId}>
                    <SelectTrigger id="target-contact">
                      <SelectValue placeholder="Selecione um contato..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableContacts.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-[10px]">
                                {c.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span>{c.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              
              {selectedContact && (
                <div className="flex items-center gap-3 p-3 bg-success/10 border border-success/20 rounded-lg">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{contact.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{selectedContact.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">
                    {pendingTickets.length} ticket(s) → <strong>{selectedContact.name}</strong>
                  </span>
                </div>
              )}
            </>
          ) : (
            <Alert>
              <AlertDescription>
                Este contato não possui tickets em aberto. Pode ser removido sem migração.
              </AlertDescription>
            </Alert>
          )}
        </div>
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!canSubmit || isPending || (hasTickets && availableContacts.length === 0)}
          >
            {isPending ? "Removendo..." : hasTickets ? "Migrar e Remover" : "Remover Contato"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
