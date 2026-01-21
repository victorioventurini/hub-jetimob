/**
 * PartnersPage - Lista global de empresas parceiras
 */

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Building2, Search, Users, Check, X, Filter } from "lucide-react";
import { Helmet } from "react-helmet-async";

import { HubLayout } from "@/components/layout/HubLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DocumentInput, cleanDocument, validateDocument } from "@/components/ui/document-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useGlobalPartners, useSearchPartnerByDocument, useCreateGlobalPartner, useActivatePartnerInBu } from "../hooks";
import { useBu } from "@/contexts/BuContext";
import type { GlobalPartnerCompany, PersonType } from "../types";

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

function PartnerCard({ partner, currentBuId }: { partner: GlobalPartnerCompany; currentBuId: string | null }) {
  const isActiveInCurrentBu = partner.bu_associations?.some(
    (a) => a.bu_id === currentBuId && a.is_active
  );

  return (
    <Link to={`/partners/${partner.id}`}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary">
                {partner.person_type === "pf" ? (
                  <Users className="h-5 w-5" />
                ) : (
                  <Building2 className="h-5 w-5" />
                )}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium truncate">{partner.name}</h3>
                <Badge variant={partner.person_type === "pf" ? "secondary" : "outline"} className="shrink-0">
                  {partner.person_type === "pf" ? "PF" : "PJ"}
                </Badge>
              </div>

              {partner.legal_name && (
                <p className="text-sm text-muted-foreground truncate">{partner.legal_name}</p>
              )}

              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="font-mono">
                  {formatDocument(partner.document, partner.document_type)}
                </span>
                
                <span className="flex items-center gap-1">
                  {isActiveInCurrentBu ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-500" />
                      <span className="text-emerald-600">Ativo na BU</span>
                    </>
                  ) : (
                    <>
                      <X className="h-3 w-3 text-muted-foreground" />
                      <span>Inativo</span>
                    </>
                  )}
                </span>

                <span>
                  {partner.active_bus_count} BU{partner.active_bus_count !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function PartnerCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PartnersPage() {
  const navigate = useNavigate();
  const { currentBuId, currentBu } = useBu();
  const { data: partners, isLoading } = useGlobalPartners();

  const [searchTerm, setSearchTerm] = useState("");
  const [documentSearch, setDocumentSearch] = useState("");
  const [personTypeFilter, setPersonTypeFilter] = useState<PersonType | "all">("all");
  const [buActiveFilter, setBuActiveFilter] = useState<"all" | "active" | "inactive">("all");

  // Busca por documento
  const cleanDoc = cleanDocument(documentSearch);
  const isValidDocument = validateDocument(cleanDoc);
  const { data: foundPartner, isFetching: isSearchingDoc } = useSearchPartnerByDocument(
    isValidDocument ? cleanDoc : null
  );

  // Mutations para criar e ativar
  const createPartner = useCreateGlobalPartner();
  const activateInBu = useActivatePartnerInBu();

  // Filtrar parceiros
  const filteredPartners = partners?.filter((partner) => {
    // Filtro de texto (nome ou razão social)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesName = partner.name.toLowerCase().includes(term);
      const matchesLegalName = partner.legal_name?.toLowerCase().includes(term);
      if (!matchesName && !matchesLegalName) return false;
    }

    // Filtro de tipo de pessoa
    if (personTypeFilter !== "all" && partner.person_type !== personTypeFilter) {
      return false;
    }

    // Filtro de ativação na BU atual
    if (buActiveFilter !== "all" && currentBuId) {
      const isActiveInBu = partner.bu_associations?.some(
        (a) => a.bu_id === currentBuId && a.is_active
      );
      if (buActiveFilter === "active" && !isActiveInBu) return false;
      if (buActiveFilter === "inactive" && isActiveInBu) return false;
    }

    return true;
  });

  // Handler quando encontra parceiro por documento
  const handleFoundPartner = () => {
    if (foundPartner) {
      navigate(`/partners/${foundPartner.id}`);
    }
  };

  return (
    <HubLayout>
      <Helmet>
        <title>Empresas Parceiras | Hub Jetimob</title>
        <meta name="description" content="Gerencie empresas parceiras globalmente e ative-as por unidade de negócio." />
      </Helmet>

      <div className="space-y-6">
        <PageHeader
          title="Empresas Parceiras"
          description="Cadastro global de parceiros com ativação por unidade de negócio"
          actions={
            <Button asChild>
              <Link to="/partners/new">
                <Plus className="h-4 w-4 mr-2" />
                Novo Parceiro
              </Link>
            </Button>
          }
        />

        {/* Busca por CPF/CNPJ */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4" />
              Buscar por CPF/CNPJ
            </CardTitle>
            <CardDescription>
              Digite o documento para verificar se o parceiro já está cadastrado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <div className="flex-1 max-w-md">
                <DocumentInput
                  value={documentSearch}
                  onChange={(value) => setDocumentSearch(value)}
                  isSearching={isSearchingDoc}
                />
              </div>

              {foundPartner && (
                <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg flex-1">
                  <div className="flex-1">
                    <p className="font-medium">{foundPartner.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Parceiro já cadastrado • {foundPartner.person_type === "pf" ? "Pessoa Física" : "Pessoa Jurídica"}
                    </p>
                  </div>
                  <Button onClick={handleFoundPartner}>
                    Ver detalhes
                  </Button>
                </div>
              )}

              {isValidDocument && !foundPartner && !isSearchingDoc && cleanDoc.length >= 11 && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg flex-1">
                  <div className="flex-1">
                    <p className="font-medium">Documento não encontrado</p>
                    <p className="text-sm text-muted-foreground">
                      Este CPF/CNPJ ainda não está cadastrado no sistema
                    </p>
                  </div>
                  <Button asChild>
                    <Link to={`/partners/new?document=${cleanDoc}`}>
                      Cadastrar parceiro
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] max-w-md">
            <Input
              placeholder="Buscar por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>

          <Select value={personTypeFilter} onValueChange={(v) => setPersonTypeFilter(v as PersonType | "all")}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pf">Pessoa Física</SelectItem>
              <SelectItem value="pj">Pessoa Jurídica</SelectItem>
            </SelectContent>
          </Select>

          <Select value={buActiveFilter} onValueChange={(v) => setBuActiveFilter(v as "all" | "active" | "inactive")}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status na BU" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="active">Ativos na {currentBu?.name || "BU"}</SelectItem>
              <SelectItem value="inactive">Inativos na {currentBu?.name || "BU"}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Lista de parceiros */}
        <div className="grid gap-3">
          {isLoading ? (
            <>
              <PartnerCardSkeleton />
              <PartnerCardSkeleton />
              <PartnerCardSkeleton />
            </>
          ) : filteredPartners?.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">Nenhum parceiro encontrado</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchTerm || personTypeFilter !== "all" || buActiveFilter !== "all"
                    ? "Tente ajustar os filtros de busca"
                    : "Comece cadastrando o primeiro parceiro"}
                </p>
                <Button asChild>
                  <Link to="/partners/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Parceiro
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredPartners?.map((partner) => (
              <PartnerCard key={partner.id} partner={partner} currentBuId={currentBuId} />
            ))
          )}
        </div>
      </div>
    </HubLayout>
  );
}
