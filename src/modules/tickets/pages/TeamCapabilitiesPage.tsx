import { memo, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { Trash2, Settings2 } from "lucide-react";
import { HubLayout } from "@/components/layout/HubLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";
import { usePageTitle } from "@/hooks/usePageTitle";
import { toast } from "sonner";
import {
  usePartnerContacts,
  useCompanyContactCapabilities,
  useDeleteContactCapability,
  type ContactCapability,
} from "../hooks";
import { useManagedPartnerCompany, useManagedCompanyCategories } from "../hooks/useManagedPartnerCompany";
import { ContactCapabilityDialog } from "../components/settings/ContactCapabilityDialog";

interface RowProps {
  contact: { id: string; name: string; email: string };
  capabilities: ContactCapability[];
  onConfigure: (id: string) => void;
  onRemove: (cap: ContactCapability) => void;
}

const ContactRow = memo(function ContactRow({ contact, capabilities, onConfigure, onRemove }: RowProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div>
            <p className="font-medium">{contact.name}</p>
            <p className="text-sm text-muted-foreground break-all">{contact.email}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {capabilities.length === 0 ? (
              <Badge variant="outline">Sem categorias</Badge>
            ) : (
              capabilities.map((cap) => (
                <Badge key={cap.id} variant="secondary" className="gap-1">
                  {cap.category?.name}
                  {cap.subcategory ? ` › ${cap.subcategory.name}` : " (toda)"}
                  <button
                    type="button"
                    aria-label="Remover categoria"
                    className="ml-1 opacity-70 hover:opacity-100"
                    onClick={() => onRemove(cap)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => onConfigure(contact.id)}>
          <Settings2 className="mr-2 h-4 w-4" />
          Configurar
        </Button>
      </CardContent>
    </Card>
  );
});

export default function TeamCapabilitiesPage() {
  usePageTitle("Minha equipe");
  const { data: companyId, isLoading } = useManagedPartnerCompany();
  const { data: categoryOptions = [] } = useManagedCompanyCategories(!!companyId);
  const { data: contacts = [] } = usePartnerContacts(companyId ?? undefined);
  const { data: capabilities = [] } = useCompanyContactCapabilities(companyId ?? undefined);
  const deleteCapability = useDeleteContactCapability();
  const [dialogContactId, setDialogContactId] = useState<string | null>(null);

  const rows = useMemo(() => {
    return contacts
      .filter((c) => c.status === "active" && !c.deleted_at)
      .map((c) => ({ contact: c, capabilities: capabilities.filter((cap) => cap.contact_id === c.id) }))
      .sort((a, b) => a.contact.name.localeCompare(b.contact.name));
  }, [contacts, capabilities]);

  if (isLoading) return <HubLayout><LoadingState text="Carregando..." /></HubLayout>;
  if (!companyId) return <Navigate to="/tickets" replace />;

  const handleRemove = async (cap: ContactCapability) => {
    try {
      await deleteCapability.mutateAsync(cap.id);
      toast.success("Categoria removida");
    } catch {
      toast.error("Não foi possível remover a categoria");
    }
  };

  return (
    <HubLayout>
      <div className="space-y-6">
        <PageHeader
          title="Minha equipe"
          description="Defina quais categorias e subcategorias cada pessoa da sua empresa atende."
          breadcrumbs={[{ label: "Tickets", href: "/tickets" }, { label: "Minha equipe" }]}
        />
        {categoryOptions.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Sua empresa ainda não tem categorias liberadas nesta unidade.
          </p>
        )}
        <div className="space-y-3">
          {rows.map((r) => (
            <ContactRow
              key={r.contact.id}
              contact={r.contact}
              capabilities={r.capabilities}
              onConfigure={setDialogContactId}
              onRemove={handleRemove}
            />
          ))}
        </div>
        <ContactCapabilityDialog
          open={!!dialogContactId}
          onOpenChange={(o) => !o && setDialogContactId(null)}
          companyId={companyId}
          initialContactId={dialogContactId ?? undefined}
          categoryOptions={categoryOptions}
        />
      </div>
    </HubLayout>
  );
}
