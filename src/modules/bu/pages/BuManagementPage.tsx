import { useState } from "react";
import { Building2, Plus, Globe, Users, ChevronRight } from "lucide-react";
import { HubLayout } from "@/components/layout/HubLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAllBus } from "../hooks/useBuData";
import { CreateBuDialog } from "../components/CreateBuDialog";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export default function BuManagementPage() {
  const { isAdmin } = useAuth();
  const { data: bus = [], isLoading } = useAllBus();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  if (!isAdmin) {
    return (
      <HubLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
            <p className="text-muted-foreground">
              Você não tem permissão para gerenciar Business Units.
            </p>
          </div>
        </div>
      </HubLayout>
    );
  }

  return (
    <HubLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Business Units</h1>
            <p className="text-muted-foreground">
              Gerencie as unidades de negócio e seus domínios de acesso.
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova BU
          </Button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* BU Grid */}
        {!isLoading && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {bus.map((bu) => (
              <Card key={bu.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{bu.name}</CardTitle>
                        {bu.legal_entity && (
                          <CardDescription className="text-xs">
                            {bu.legal_entity}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant={bu.status === "active" ? "default" : "secondary"}
                    >
                      {bu.status === "active" ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {bu.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {bu.description}
                    </p>
                  )}

                  {/* Domains */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Globe className="h-4 w-4" />
                      <span>Domínios autorizados</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(bu.allowed_email_domains || []).map((domain) => (
                        <Badge key={domain} variant="outline" className="text-xs">
                          @{domain}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <Button variant="ghost" className="w-full justify-between" size="sm">
                    Ver detalhes
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}

            {/* Empty state */}
            {bus.length === 0 && (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    Nenhuma Business Unit
                  </h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Crie sua primeira unidade de negócio para começar.
                  </p>
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar BU
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      <CreateBuDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </HubLayout>
  );
}
