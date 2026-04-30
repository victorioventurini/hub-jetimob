import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Plus, Search, Users, Trash2, FolderTree } from "lucide-react";
import { usePartnerCompanies, usePartnerContacts, useContactCapabilities, useCompanyContactCapabilities, useDeleteContactCapability, type ContactCapability } from "../../hooks";
import { ContactCapabilityDialog } from "./ContactCapabilityDialog";
import { toast } from "sonner";
import { useUrlSearch, useUrlState } from "@/shared/url";

export function ContactCapabilitiesTab() {
  const { value: search, set: setSearch } = useUrlSearch("capSearch", 300);
  const { value: selectedCompanyId, set: setSelectedCompanyId } = useUrlState<string | null>({
    key: "companyId",
    defaultValue: null,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ contactName: string; capabilities: ContactCapability[] } | null>(null);

  const { data: companies = [], isLoading: loadingCompanies, error: companiesError } = usePartnerCompanies();
  const { data: capabilities = [], isLoading: loadingCapabilities } = useCompanyContactCapabilities(selectedCompanyId || undefined);
  const deleteCapability = useDeleteContactCapability();

  const activeCompanies = companies.filter(c => c.status === "active");
  const filteredCompanies = activeCompanies.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  // Group capabilities by contact (a contact may have many capabilities — one row per category/subcategory).
  // The previous UI rendered one row per capability, which looked like duplicated contacts.
  const groupedByContact = useMemo(() => {
    const map = new Map<string, { contact: NonNullable<ContactCapability["contact"]>; capabilities: ContactCapability[] }>();
    for (const cap of capabilities) {
      if (!cap.contact) continue;
      const entry = map.get(cap.contact_id);
      if (entry) {
        entry.capabilities.push(cap);
      } else {
        map.set(cap.contact_id, { contact: cap.contact, capabilities: [cap] });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.contact.name.localeCompare(b.contact.name));
  }, [capabilities]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await Promise.all(
        deleteTarget.capabilities.map((c) => deleteCapability.mutateAsync(c.id))
      );
      toast.success(
        deleteTarget.capabilities.length > 1
          ? "Capacidades removidas"
          : "Capacidade removida"
      );
      setDeleteTarget(null);
    } catch (error) {
      toast.error("Erro ao remover capacidades");
    }
  };

  if (loadingCompanies) {
    return <LoadingState text="Carregando empresas parceiras..." />;
  }

  if (companiesError) {
    return <ErrorState title="Erro" description="Erro ao carregar empresas parceiras" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium">Capacidades de Contatos</h3>
        <p className="text-sm text-muted-foreground">
          Configure quais categorias/subcategorias cada contato pode atender automaticamente.
        </p>
      </div>

      {activeCompanies.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhuma empresa parceira"
          description="Cadastre empresas parceiras primeiro para configurar capacidades."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          {/* Company List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Empresas Parceiras</CardTitle>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar empresa..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[400px] overflow-y-auto">
                {filteredCompanies.map((company) => (
                  <button
                    key={company.id}
                    onClick={() => setSelectedCompanyId(company.id)}
                    className={`w-full px-4 py-3 text-left border-b last:border-0 transition-colors ${
                      selectedCompanyId === company.id 
                        ? "bg-primary/10 border-l-2 border-l-primary" 
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <p className="font-medium truncate">{company.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {company.allowed_domains?.join(", ") || "Sem domínios"}
                    </p>
                  </button>
                ))}
                {filteredCompanies.length === 0 && (
                  <p className="p-4 text-sm text-muted-foreground text-center">
                    Nenhuma empresa encontrada
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Capabilities for Selected Company */}
          <Card>
            <CardHeader className="flex flex-col gap-3 space-y-0 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <CardTitle className="text-base truncate">
                  {selectedCompanyId 
                    ? companies.find(c => c.id === selectedCompanyId)?.name 
                    : "Selecione uma empresa"}
                </CardTitle>
                <CardDescription>
                  {selectedCompanyId 
                    ? "Contatos que recebem tickets automaticamente por categoria"
                    : "Escolha uma empresa à esquerda para ver as capacidades"}
                </CardDescription>
              </div>
              {selectedCompanyId && (
                <Button size="sm" onClick={() => setDialogOpen(true)} className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {!selectedCompanyId ? (
                <EmptyState
                  icon={FolderTree}
                  title="Nenhuma empresa selecionada"
                  description="Selecione uma empresa para ver e configurar as capacidades dos contatos."
                />
              ) : loadingCapabilities ? (
                <LoadingState text="Carregando capacidades..." />
              ) : groupedByContact.length === 0 ? (
                <EmptyState
                  icon={FolderTree}
                  title="Nenhuma capacidade configurada"
                  description="Adicione capacidades para que tickets sejam atribuídos automaticamente aos contatos."
                  actionLabel="Adicionar capacidade"
                  onAction={() => setDialogOpen(true)}
                />
              ) : (
                <div className="space-y-3">
                  {groupedByContact.map(({ contact, capabilities: contactCaps }) => {
                    const byCategory = new Map<string, { categoryName: string; isGeneralist: boolean; subs: string[] }>();
                    for (const c of contactCaps) {
                      const catId = c.category_id;
                      const catName = c.category?.name ?? "—";
                      const entry = byCategory.get(catId) ?? { categoryName: catName, isGeneralist: false, subs: [] };
                      if (!c.subcategory_id) {
                        entry.isGeneralist = true;
                      } else if (c.subcategory?.name) {
                        entry.subs.push(c.subcategory.name);
                      }
                      byCategory.set(catId, entry);
                    }

                    return (
                      <div
                        key={contact.id}
                        className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-card"
                      >
                        <div className="space-y-2 min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <span className="font-medium truncate">{contact.name}</span>
                            <span className="text-xs text-muted-foreground truncate">{contact.email}</span>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            {Array.from(byCategory.values()).map((cat, idx) => (
                              <div key={idx} className="flex flex-wrap items-center gap-1.5">
                                <Badge variant="outline">{cat.categoryName}</Badge>
                                {cat.isGeneralist ? (
                                  <Badge variant="default" className="text-xs">Categoria inteira</Badge>
                                ) : (
                                  cat.subs.map((sub, i) => (
                                    <Badge key={i} variant="secondary">{sub}</Badge>
                                  ))
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget({ contactName: contact.name, capabilities: contactCaps })}
                          className="shrink-0"
                          aria-label={`Remover capacidades de ${contact.name}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Capability Dialog */}
      {selectedCompanyId && (
        <ContactCapabilityDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          companyId={selectedCompanyId}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog variant="destructive"
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={
          deleteTarget && deleteTarget.capabilities.length > 1
            ? "Remover capacidades"
            : "Remover capacidade"
        }
        description={
          deleteTarget
            ? deleteTarget.capabilities.length > 1
              ? `Remover todas as ${deleteTarget.capabilities.length} capacidades de "${deleteTarget.contactName}" desta empresa?`
              : `Remover a capacidade de "${deleteTarget.contactName}" desta empresa?`
            : ""
        }
        isLoading={deleteCapability.isPending}
      />
    </div>
  );
}
