/**
 * HubPartnerDetailPage - Detalhes de parceiro com gestão cross-BU (Platform Admin)
 * 
 * Esta página permite que Platform Admins vejam e gerenciem as associações
 * de um parceiro em todas as BUs do sistema.
 */

import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { 
  Building2, 
  Users, 
  Check, 
  X, 
  Loader2, 
  Edit, 
  Trash2,
  ArrowLeft,
} from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  usePartnerDetail,
  usePartnerBuAssociations,
  useDeleteGlobalPartner,
  useActivatePartnerInBuGlobal,
  useDeactivatePartnerInBuGlobal,
} from "@/modules/partners/hooks";
import { supabase } from "@/integrations/supabase/globalClient";
import { useQuery } from "@tanstack/react-query";

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

// Hook para buscar todas as BUs (Platform Admin)
function useAllBus() {
  return useQuery({
    queryKey: ["all-bus"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bu_units")
        .select("id, name, status")
        .eq("status", "active")
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });
}

export default function HubPartnerDetailPage() {
  const { partnerId } = useParams<{ partnerId: string }>();
  const navigate = useNavigate();

  const { data: partner, isLoading } = usePartnerDetail(partnerId || null);
  const { data: associations } = usePartnerBuAssociations(partnerId || null);
  const { data: allBus } = useAllBus();
  const deletePartner = useDeleteGlobalPartner();
  const activateMutation = useActivatePartnerInBuGlobal();
  const deactivateMutation = useDeactivatePartnerInBuGlobal();

  const isPending = activateMutation.isPending || deactivateMutation.isPending;

  const handleToggleBu = (buId: string, currentlyActive: boolean) => {
    if (!partnerId) return;
    
    if (currentlyActive) {
      deactivateMutation.mutate({ partnerId, buId });
    } else {
      activateMutation.mutate({
        external_company_id: partnerId,
        bu_id: buId,
        is_active: true,
      });
    }
  };

  const handleDelete = async () => {
    if (partnerId) {
      await deletePartner.mutateAsync(partnerId);
      navigate("/hub/partners");
    }
  };

  if (isLoading) {
    return (
      <>
        <div className="space-y-6">
          <PageHeader
            title="Carregando..."
            backTo="/hub/partners"
            backLabel="Voltar para Parceiros"
          />
          <DetailSkeleton />
        </div>
      </>
    );
  }

  if (!partner) {
    return (
      <>
        <div className="space-y-6">
          <PageHeader
            title="Parceiro não encontrado"
            backTo="/hub/partners"
            backLabel="Voltar para Parceiros"
          />
          <Card>
            <CardContent className="p-8 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Este parceiro não existe ou foi removido.
              </p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  // Mapear associações por BU para fácil lookup
  const associationsByBu = new Map(
    associations?.map((a) => [a.bu_id, a]) || []
  );

  return (
    <>
      <Helmet>
        <title>{partner.name} | Parceiros | Hub Jetimob</title>
        <meta name="description" content={`Gestão global do parceiro ${partner.name}`} />
      </Helmet>

      <div className="space-y-6">
        <PageHeader
          title={partner.name}
          description={partner.legal_name || undefined}
          backTo="/hub/partners"
          backLabel="Voltar para Parceiros"
          actions={
            <div className="flex gap-2">
              <Button variant="outline" size="icon" asChild>
                <Link to={`/partners/${partnerId}/edit`}>
                  <Edit className="h-4 w-4" />
                </Link>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="icon" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir parceiro globalmente?</AlertDialogTitle>
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
                        "Excluir Permanentemente"
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
                    <span className="text-muted-foreground">BUs Ativas:</span>
                    <span className="ml-2 font-medium">
                      {associations?.filter((a) => a.is_active).length || 0}
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

        {/* Gestão de BUs (Platform Admin - todas as BUs) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Associações por Unidade de Negócio</CardTitle>
            <CardDescription>
              Gerencie em quais BUs este parceiro está ativo. Esta é uma visão de Platform Admin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unidade de Negócio</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allBus?.map((bu) => {
                  const association = associationsByBu.get(bu.id);
                  const isActive = association?.is_active ?? false;

                  return (
                    <TableRow key={bu.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium bg-primary/10 text-primary">
                            {bu.name.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-medium">{bu.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 text-success">
                            <Check className="h-3.5 w-3.5" />
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <X className="h-3.5 w-3.5" />
                            Inativo
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Label htmlFor={`bu-${bu.id}`} className="text-sm text-muted-foreground">
                            {isActive ? "Desativar" : "Ativar"}
                          </Label>
                          <Switch
                            id={`bu-${bu.id}`}
                            checked={isActive}
                            onCheckedChange={() => handleToggleBu(bu.id, isActive)}
                            disabled={isPending}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
