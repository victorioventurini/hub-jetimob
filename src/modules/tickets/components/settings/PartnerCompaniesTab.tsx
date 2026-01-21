import { useState } from "react";
import { Building2, Plus, Pencil, Trash2, Globe, Settings, User, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePartnerCompanies, useDeletePartnerCompany, usePartnerServices } from "../../hooks";
import { PartnerCompanyDialog } from "./PartnerCompanyDialog";
import { PartnerServicesTab } from "./PartnerServicesTab";
import { FallbackContactsEditor } from "./FallbackContactsEditor";
import { PartnerCompany } from "../../types";
import { Separator } from "@/components/ui/separator";

export function PartnerCompaniesTab() {
  const { data: rawCompanies = [], isLoading } = usePartnerCompanies();
  // Force type to PartnerCompany[] to avoid Supabase type inference issues
  const companies = rawCompanies as unknown as PartnerCompany[];
  const { mutate: deleteCompany, isPending: isDeleting } = useDeletePartnerCompany();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<PartnerCompany | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [servicesCompany, setServicesCompany] = useState<PartnerCompany | null>(null);

  const handleEdit = (company: PartnerCompany) => {
    setEditingCompany(company);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingCompany(null);
    setDialogOpen(true);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteCompany(deleteId);
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Empresas Parceiras</CardTitle>
            <CardDescription>
              Gerencie empresas externas que podem criar tickets
            </CardDescription>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Empresa
          </Button>
        </CardHeader>
        <CardContent>
          {companies.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="Nenhuma empresa parceira"
              description="Adicione empresas parceiras para permitir tickets externos."
              compact
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead>Domínios Permitidos</TableHead>
                  <TableHead>Serviços</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <CompanyRow
                    key={company.id}
                    company={company}
                    onEdit={() => handleEdit(company)}
                    onDelete={() => setDeleteId(company.id)}
                    onConfigureServices={() => setServicesCompany(company)}
                    isDeleting={isDeleting}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PartnerCompanyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        company={editingCompany}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Remover empresa parceira?"
        description="Tickets existentes serão mantidos, mas novos tickets externos não poderão ser criados para esta empresa."
      />

      {/* Dialog de Serviços e Configurações */}
      <Dialog open={!!servicesCompany} onOpenChange={() => setServicesCompany(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurações de {servicesCompany?.name}
            </DialogTitle>
          </DialogHeader>
          {servicesCompany && (
            <div className="space-y-6">
              <PartnerServicesTab partner={servicesCompany} />
              
              <Separator />
              
              <FallbackContactsEditor 
                companyId={servicesCompany.id} 
                companyName={servicesCompany.name}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

interface CompanyRowProps {
  company: PartnerCompany;
  onEdit: () => void;
  onDelete: () => void;
  onConfigureServices: () => void;
  isDeleting: boolean;
}

function CompanyRow({
  company,
  onEdit,
  onDelete,
  onConfigureServices,
  isDeleting,
}: CompanyRowProps) {
  const { data: services = [] } = usePartnerServices(company.id);

  // Contar categorias únicas
  const uniqueCategories = new Set(services.map((s) => s.category_id)).size;

  // Formatar documento
  const formatDocument = (doc: string | null | undefined, type: string | null | undefined) => {
    if (!doc) return null;
    if (type === 'cpf' && doc.length === 11) {
      return `${doc.slice(0, 3)}.${doc.slice(3, 6)}.${doc.slice(6, 9)}-${doc.slice(9)}`;
    }
    if (type === 'cnpj' && doc.length === 14) {
      return `${doc.slice(0, 2)}.${doc.slice(2, 5)}.${doc.slice(5, 8)}/${doc.slice(8, 12)}-${doc.slice(12)}`;
    }
    return doc;
  };

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-start gap-2">
          {company.person_type === 'pf' ? (
            <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          ) : (
            <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          )}
          <div>
            <p className="font-medium">{company.name}</p>
            {company.legal_name && (
              <p className="text-sm text-muted-foreground">{company.legal_name}</p>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        {company.document ? (
          <span className="font-mono text-sm">
            {formatDocument(company.document, company.document_type)}
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {company.allowed_domains?.length ? (
            company.allowed_domains.map((domain) => (
              <Badge key={domain} variant="outline" className="gap-1">
                <Globe className="h-3 w-3" />
                {domain}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground text-sm">—</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        {services.length > 0 ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="secondary"
                className="cursor-pointer"
                onClick={onConfigureServices}
              >
                {uniqueCategories} categoria(s)
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Clique para configurar serviços</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <Badge
            variant="outline"
            className="cursor-pointer text-amber-600 border-amber-300"
            onClick={onConfigureServices}
          >
            Configurar
          </Badge>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={company.status === "active" ? "default" : "secondary"}>
          {company.status === "active" ? "Ativo" : "Inativo"}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onConfigureServices}>
                <Settings className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Configurar Serviços</TooltipContent>
          </Tooltip>
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
