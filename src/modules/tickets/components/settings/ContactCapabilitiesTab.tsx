import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Plus, Search, Users, Trash2, FolderTree } from "lucide-react";
import { usePartnerCompanies, usePartnerContacts } from "../../hooks/usePartners";
import { useCompanyContactCapabilities, useDeleteContactCapability, type ContactCapability } from "../../hooks/useContactCapabilities";
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
  const [deleteTarget, setDeleteTarget] = useState<ContactCapability | null>(null);

  const { data: companies = [], isLoading: loadingCompanies, error: companiesError } = usePartnerCompanies();
  const { data: capabilities = [], isLoading: loadingCapabilities } = useCompanyContactCapabilities(selectedCompanyId || undefined);
  const deleteCapability = useDeleteContactCapability();

  const activeCompanies = companies.filter(c => c.status === "active");
  const filteredCompanies = activeCompanies.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCapability.mutateAsync(deleteTarget.id);
      toast.success("Capacidade removida");
      setDeleteTarget(null);
    } catch (error) {
      toast.error("Erro ao remover capacidade");
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
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="text-base">
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
                <Button size="sm" onClick={() => setDialogOpen(true)}>
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
              ) : capabilities.length === 0 ? (
                <EmptyState
                  icon={FolderTree}
                  title="Nenhuma capacidade configurada"
                  description="Adicione capacidades para que tickets sejam atribuídos automaticamente aos contatos."
                  actionLabel="Adicionar capacidade"
                  onAction={() => setDialogOpen(true)}
                />
              ) : (
                <div className="space-y-3">
                  {capabilities.map((cap) => (
                    <div
                      key={cap.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{cap.contact?.name}</span>
                          <span className="text-xs text-muted-foreground">{cap.contact?.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{cap.category?.name}</Badge>
                          {cap.subcategory ? (
                            <Badge variant="secondary">{cap.subcategory.name}</Badge>
                          ) : (
                            <Badge variant="default" className="text-xs">Categoria inteira</Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(cap)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
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
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remover capacidade"
        description={`Remover a capacidade de "${deleteTarget?.contact?.name}" para a categoria "${deleteTarget?.category?.name}"?`}
        isLoading={deleteCapability.isPending}
      />
    </div>
  );
}
