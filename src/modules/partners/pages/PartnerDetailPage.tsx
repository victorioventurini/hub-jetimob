/**
 * PartnerDetailPage - Detalhes de um parceiro com gestão de BUs
 */

import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Building2, Users, Check, X, Loader2, Edit, Trash2 } from "lucide-react";

import { HubLayout } from "@/components/layout/HubLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import {
  usePartnerDetail,
  usePartnerBuAssociations,
  useTogglePartnerBuAssociation,
  useDeleteGlobalPartner,
} from "../hooks";
import { useBu } from "@/contexts/BuContext";

function formatDocument(doc: string | null, type: string | null): string {
  if (!doc) return "Não informado";
  const clean = doc.replace(/\D/g, "");
  if (type === "cpf" && clean.length === 11) {
    return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
  }
  if (type === "cnpj" && clean.length === 14) {
    return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8, 12)}-${clean.slice(12)}`;
  }
  return doc;
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

export default function PartnerDetailPage() {
  const { partnerId } = useParams<{ partnerId: string }>();
  const navigate = useNavigate();
  const { currentBuId, currentBu, userBus } = useBu();

  const { data: partner, isLoading } = usePartnerDetail(partnerId || null);
  const { data: associations } = usePartnerBuAssociations(partnerId || null);
  const toggleAssociation = useTogglePartnerBuAssociation();
  const deletePartner = useDeleteGlobalPartner();

  if (isLoading) {
    return (
      <HubLayout>
        <div className="space-y-6 max-w-3xl">
          <PageHeader
            title="Carregando..."
            backTo="/settings/partners"
            backLabel="Voltar para Parceiros"
          />
          <DetailSkeleton />
        </div>
      </HubLayout>
    );
  }

  if (!partner) {
    return (
      <HubLayout>
        <div className="space-y-6 max-w-3xl">
          <PageHeader
            title="Parceiro não encontrado"
            backTo="/settings/partners"
            backLabel="Voltar para Parceiros"
          />
          <Card>
            <CardContent className="p-8 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Este parceiro não existe ou você não tem permissão para visualizá-lo.
              </p>
            </CardContent>
          </Card>
        </div>
      </HubLayout>
    );
  }

  const handleToggleBu = (buId: string, currentlyActive: boolean) => {
    if (partnerId) {
      toggleAssociation.mutate(partnerId, buId, currentlyActive);
    }
  };

  const handleDelete = async () => {
    if (partnerId) {
      await deletePartner.mutateAsync(partnerId);
      navigate("/settings/partners");
    }
  };

  const isActiveInCurrentBu = associations?.some(
    (a) => a.bu_id === currentBuId && a.is_active
  );

  return (
    <HubLayout>
      <Helmet>
        <title>{partner.name} | Parceiros | Hub Jetimob</title>
        <meta name="description" content={`Detalhes do parceiro ${partner.name}`} />
      </Helmet>

      <div className="space-y-6 max-w-3xl">
        <PageHeader
          title={partner.name}
          description={partner.legal_name || undefined}
          backTo="/settings/partners"
          backLabel="Voltar para Parceiros"
          actions={
            <div className="flex gap-2">
              <Button variant="outline" size="icon">
                <Edit className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="icon" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir parceiro?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. O parceiro será removido de todas as BUs
                      e não poderá mais ser utilizado em tickets.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deletePartner.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Excluir"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          }
        />

        {/* Informações básicas */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary/10 text-primary text-xl">
                  {partner.person_type === "pf" ? (
                    <Users className="h-7 w-7" />
                  ) : (
                    <Building2 className="h-7 w-7" />
                  )}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold">{partner.name}</h2>
                  <Badge variant={partner.person_type === "pf" ? "secondary" : "outline"}>
                    {partner.person_type === "pf" ? "Pessoa Física" : "Pessoa Jurídica"}
                  </Badge>
                  <Badge variant={partner.status === "active" ? "default" : "secondary"}>
                    {partner.status === "active" ? "Ativo" : "Inativo"}
                  </Badge>
                </div>

                {partner.legal_name && (
                  <p className="text-muted-foreground">{partner.legal_name}</p>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">
                      {partner.document_type === "cpf" ? "CPF" : "CNPJ"}:
                    </span>
                    <span className="ml-2 font-mono">
                      {formatDocument(partner.document, partner.document_type)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status na BU atual:</span>
                    <span className="ml-2">
                      {isActiveInCurrentBu ? (
                        <span className="text-emerald-600 flex items-center gap-1 inline-flex">
                          <Check className="h-3 w-3" /> Ativo
                        </span>
                      ) : (
                        <span className="text-muted-foreground flex items-center gap-1 inline-flex">
                          <X className="h-3 w-3" /> Inativo
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {partner.notes && (
                  <div className="pt-2">
                    <p className="text-sm text-muted-foreground">{partner.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status na BU atual */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status nesta Unidade de Negócio</CardTitle>
            <CardDescription>
              Ative ou desative este parceiro em {currentBu?.name || "sua BU atual"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium bg-primary text-primary-foreground">
                  {currentBu?.name?.slice(0, 2).toUpperCase() || "BU"}
                </div>
                <div>
                  <p className="font-medium">{currentBu?.name || "BU Atual"}</p>
                  <p className="text-xs text-muted-foreground">
                    {isActiveInCurrentBu ? "Parceiro ativo nesta unidade" : "Parceiro inativo nesta unidade"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Label htmlFor="bu-toggle" className="text-sm text-muted-foreground">
                  {isActiveInCurrentBu ? "Ativo" : "Inativo"}
                </Label>
                <Switch
                  id="bu-toggle"
                  checked={isActiveInCurrentBu}
                  onCheckedChange={() => currentBuId && handleToggleBu(currentBuId, isActiveInCurrentBu ?? false)}
                  disabled={toggleAssociation.isPending || !currentBuId}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Serviços / Categorias - placeholder para futuro */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Categorias Atendidas</CardTitle>
            <CardDescription>
              Categorias de tickets que este parceiro pode atender
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center py-4">
              Configure as categorias nas configurações de tickets
            </p>
            <div className="flex justify-center">
              <Button variant="outline" asChild>
                <a href="/tickets/settings?tab=capabilities">Configurar serviços</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </HubLayout>
  );
}
