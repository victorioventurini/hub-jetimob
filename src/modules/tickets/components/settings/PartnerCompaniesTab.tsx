import { useState } from "react";
import { Building2, Plus, Pencil, Trash2, Globe } from "lucide-react";
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
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { usePartnerCompanies, useDeletePartnerCompany } from "../../hooks/usePartners";
import { PartnerCompanyDialog } from "./PartnerCompanyDialog";
import { PartnerCompany } from "../../types";

export function PartnerCompaniesTab() {
  const { data: companies = [], isLoading } = usePartnerCompanies();
  const { mutate: deleteCompany, isPending: isDeleting } = useDeletePartnerCompany();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<PartnerCompany | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
                  <TableHead>Domínios Permitidos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{company.name}</p>
                        {company.legal_name && (
                          <p className="text-sm text-muted-foreground">
                            {company.legal_name}
                          </p>
                        )}
                      </div>
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
                          <span className="text-muted-foreground text-sm">Nenhum domínio</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={company.status === "active" ? "default" : "secondary"}>
                        {company.status === "active" ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(company)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(company.id)}
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
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
    </>
  );
}
