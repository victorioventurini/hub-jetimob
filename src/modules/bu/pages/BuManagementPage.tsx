import { useState } from "react";
import { Building2, Plus, Globe, ChevronRight, Edit2, Eye } from "lucide-react";
import { HubLayout } from "@/components/layout/HubLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAllBus } from "../hooks/useBuData";
import { CreateBuDialog } from "../components/CreateBuDialog";
import { EditBuDialog } from "../components/EditBuDialog";
import { BuDetailDialog } from "../components/BuDetailDialog";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { BuUnit } from "../types";
import { formatCNPJ } from "../utils/cnpjMask";

export default function BuManagementPage() {
  usePageTitle("Business Units", { skipBu: true });
  const { isAdmin } = useAuth();
  const { data: bus = [], isLoading } = useAllBus();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedBu, setSelectedBu] = useState<BuUnit | null>(null);

  const handleEdit = (bu: BuUnit) => {
    setSelectedBu(bu);
    setEditDialogOpen(true);
  };

  const handleViewDetails = (bu: BuUnit) => {
    setSelectedBu(bu);
    setDetailDialogOpen(true);
  };

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
              <Card key={bu.id} className="hover:shadow-md transition-shadow group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {/* BU Symbol/Avatar */}
                      <Avatar className="h-12 w-12 rounded-lg">
                        <AvatarImage
                          src={bu.symbol_url || undefined}
                          alt={bu.name}
                          className="object-contain"
                        />
                        <AvatarFallback
                          className="rounded-lg text-white font-bold"
                          style={{ backgroundColor: bu.primary_color || "#0A3D62" }}
                        >
                          {bu.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
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
                  {/* CNPJ */}
                  {bu.cnpj && (
                    <p className="text-xs text-muted-foreground font-mono">
                      CNPJ: {formatCNPJ(bu.cnpj)}
                    </p>
                  )}

                  {bu.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {bu.description}
                    </p>
                  )}

                  {/* Color Preview */}
                  <div className="flex items-center gap-2">
                    <div
                      className="h-4 w-4 rounded border"
                      style={{ backgroundColor: bu.primary_color || "#0A3D62" }}
                      title="Cor primária"
                    />
                    <div
                      className="h-4 w-4 rounded border"
                      style={{ backgroundColor: bu.secondary_color || "#EAF2FF" }}
                      title="Cor secundária"
                    />
                  </div>

                  {/* Domains */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Globe className="h-4 w-4" />
                      <span>Domínios autorizados</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(bu.allowed_email_domains || []).slice(0, 3).map((domain) => (
                        <Badge key={domain} variant="outline" className="text-xs">
                          @{domain}
                        </Badge>
                      ))}
                      {(bu.allowed_email_domains || []).length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{bu.allowed_email_domains.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={() => handleViewDetails(bu)}
                    >
                      <Eye className="h-4 w-4" />
                      Detalhes
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={() => handleEdit(bu)}
                    >
                      <Edit2 className="h-4 w-4" />
                      Editar
                    </Button>
                  </div>
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

      <EditBuDialog
        bu={selectedBu}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

      <BuDetailDialog
        bu={selectedBu}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onEdit={() => {
          setDetailDialogOpen(false);
          setEditDialogOpen(true);
        }}
      />
    </HubLayout>
  );
}
