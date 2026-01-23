/**
 * HubPartnersPage - Gestão global de parceiros (Platform Admin only)
 * 
 * Esta página permite que Platform Admins gerenciem parceiros globalmente,
 * visualizando e controlando associações em todas as BUs.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { 
  Building2, 
  Users, 
  Search, 
  Plus,
  Check,
  X,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { useGlobalPartners } from "@/modules/partners/hooks";

function formatDocument(doc: string | null, type: string | null): string {
  if (!doc) return "—";
  const clean = doc.replace(/\D/g, "");
  if (type === "cpf" && clean.length === 11) {
    return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
  }
  if (type === "cnpj" && clean.length === 14) {
    return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8, 12)}-${clean.slice(12)}`;
  }
  return doc;
}

export default function HubPartnersPage() {
  const [search, setSearch] = useState("");
  const { data: partners, isLoading, error } = useGlobalPartners();

  const filteredPartners = partners?.filter((partner) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      partner.name.toLowerCase().includes(searchLower) ||
      partner.legal_name?.toLowerCase().includes(searchLower) ||
      partner.document?.includes(search.replace(/\D/g, ""))
    );
  });

  return (
    <>
      <Helmet>
        <title>Parceiros | Hub Jetimob</title>
        <meta name="description" content="Gestão global de empresas parceiras da plataforma" />
      </Helmet>

      <div className="space-y-6">
        <PageHeader
          title="Empresas Parceiras"
          description="Gestão global de parceiros — visualize e gerencie associações em todas as BUs"
        />

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Esta é a visão de <strong>Platform Admin</strong>. Parceiros são entidades globais 
            (únicos por CPF/CNPJ) e podem ser ativados em múltiplas Unidades de Negócio.
          </AlertDescription>
        </Alert>

        {/* Search and Actions */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, razão social ou documento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button asChild>
            <Link to="/settings/partners/new">
              <Plus className="h-4 w-4 mr-2" />
              Novo Parceiro
            </Link>
          </Button>
        </div>

        {/* Partners Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-8 text-center text-destructive">
                Erro ao carregar parceiros
              </div>
            ) : filteredPartners?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {search ? "Nenhum parceiro encontrado para esta busca" : "Nenhum parceiro cadastrado"}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parceiro</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status Global</TableHead>
                    <TableHead>BUs Ativas</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPartners?.map((partner) => (
                    <TableRow key={partner.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {partner.person_type === "pf" ? (
                                <Users className="h-4 w-4" />
                              ) : (
                                <Building2 className="h-4 w-4" />
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{partner.name}</p>
                            {partner.legal_name && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {partner.legal_name}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatDocument(partner.document, partner.document_type)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {partner.person_type === "pf" ? "PF" : "PJ"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {partner.status === "active" ? (
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
                      <TableCell>
                        <Badge variant="secondary">
                          {partner.active_bus_count || 0} BU{(partner.active_bus_count || 0) !== 1 ? "s" : ""}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          asChild
                        >
                          <Link to={`/hub/partners/${partner.id}`}>
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
