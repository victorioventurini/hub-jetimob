/**
 * Step 2a: Existing contact activation
 * Shows contact details and allows activating in current BU
 */
import { Loader2, ArrowLeft, User, Building2, Mail, Phone, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { PhoneLink } from "@/components/ui/phone-link";
import { usePartnerContact, useActivateContactInBu, useContactBuAssociations } from "@/modules/tickets/hooks";

interface ExistingContactStepProps {
  contactId: string;
  currentBuId: string | null;
  currentBuName: string;
  onBack: () => void;
  onSuccess: () => void;
}

export function ExistingContactStep({
  contactId,
  currentBuId,
  currentBuName,
  onBack,
  onSuccess,
}: ExistingContactStepProps) {
  const { data: contact, isLoading: loadingContact } = usePartnerContact(contactId);
  const { data: associations = [], isLoading: loadingAssoc } = useContactBuAssociations(contactId);
  const { mutate: activateContact, isPending: isActivating } = useActivateContactInBu();

  const isLoading = loadingContact || loadingAssoc;

  // Check if already active in current BU
  const currentBuAssoc = associations.find((a) => a.bu_id === currentBuId);
  const isAlreadyActive = currentBuAssoc?.is_active === true;

  const handleActivate = () => {
    activateContact(
      { contactId, sendInvite: true },
      { onSuccess }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Contato não encontrado
      </div>
    );
  }

  const activeBuNames = associations
    .filter((a) => a.is_active)
    .map((a) => (a.bu_units as { name: string } | undefined)?.name)
    .filter(Boolean);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="text-lg">
                {contact.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="text-xl">{contact.name}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Building2 className="h-3.5 w-3.5" />
                {(contact.partner_company as { name: string } | null)?.name || "Empresa não definida"}
              </CardDescription>
            </div>
            <Badge variant={contact.status === "active" ? "default" : "secondary"}>
              {contact.status === "active" ? "Ativo" : "Inativo"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>{contact.email}</span>
          </div>

          {contact.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <PhoneLink phone={contact.phone} />
            </div>
          )}

          {activeBuNames.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground mb-2">BUs onde está ativo:</p>
              <div className="flex flex-wrap gap-1">
                {activeBuNames.map((name) => (
                  <Badge key={name} variant="outline" className="text-xs">
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {isAlreadyActive ? (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-success-muted border border-success/30">
          <CheckCircle className="h-5 w-5 text-success" />
          <span className="text-success-muted-foreground">
            Este contato já está ativo em <strong>{currentBuName}</strong>
          </span>
        </div>
      ) : (
        <div className="p-4 rounded-lg bg-muted/50 border">
          <p className="text-sm text-muted-foreground mb-3">
            Este contato será ativado em <strong>{currentBuName}</strong> e receberá
            um convite por email para acessar o sistema.
          </p>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        {!isAlreadyActive && (
          <Button onClick={handleActivate} disabled={isActivating}>
            {isActivating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Ativando...
              </>
            ) : (
              <>
                <User className="h-4 w-4 mr-2" />
                Ativar nesta BU
              </>
            )}
          </Button>
        )}

        {isAlreadyActive && (
          <Button variant="outline" onClick={onSuccess}>
            Fechar
          </Button>
        )}
      </div>
    </div>
  );
}
