import { useState } from "react";
import { Link } from "react-router-dom";
import { Users, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PhoneLink } from "@/components/ui/phone-link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { usePartnerCompanies, usePartnerContacts, useDeletePartnerContact } from "../../hooks/usePartners";
import { PartnerContactDialog } from "./PartnerContactDialog";
import { PartnerContactHoverCard } from "./PartnerContactHoverCard";
import { PartnerContact } from "../../types";

export function PartnerContactsTab() {
  const { data: companies = [], isLoading: loadingCompanies } = usePartnerCompanies();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | undefined>();
  const { data: contacts = [], isLoading: loadingContacts } = usePartnerContacts(selectedCompanyId);
  const { mutate: deleteContact, isPending: isDeleting } = useDeletePartnerContact();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<PartnerContact | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleEdit = (contact: PartnerContact) => {
    setEditingContact(contact);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingContact(null);
    setDialogOpen(true);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteContact(deleteId);
      setDeleteId(null);
    }
  };

  const isLoading = loadingCompanies || loadingContacts;

  if (isLoading && !selectedCompanyId) {
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
            <CardTitle>Contatos Externos</CardTitle>
            <CardDescription>
              Gerencie contatos de empresas parceiras que podem acessar tickets
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={selectedCompanyId || "all"}
              onValueChange={(v) => setSelectedCompanyId(v === "all" ? undefined : v)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as empresas</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleCreate} disabled={companies.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Contato
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {companies.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Nenhuma empresa parceira"
              description="Crie uma empresa parceira primeiro para adicionar contatos."
              compact
            />
          ) : contacts.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Nenhum contato encontrado"
              description={selectedCompanyId ? "Esta empresa ainda não tem contatos cadastrados." : "Adicione contatos às empresas parceiras."}
              compact
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contato</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell>
                      <Link
                        to={`/contacts/${contact.id}`}
                        className="flex items-center gap-3 text-left"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {contact.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground hover:text-primary transition-colors">
                            {contact.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {contact.email}
                          </p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      {companies.find((c) => c.id === contact.partner_company_id)?.name || "-"}
                    </TableCell>
                    <TableCell>
                      <PhoneLink phone={contact.phone} />
                    </TableCell>
                    <TableCell>
                      <Badge variant={contact.status === "active" ? "default" : "secondary"}>
                        {contact.status === "active" ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(contact)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(contact.id)}
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

      <PartnerContactDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contact={editingContact}
        companies={companies}
        defaultCompanyId={selectedCompanyId}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Remover contato?"
        description="O contato perderá acesso aos tickets. Esta ação pode ser revertida adicionando o contato novamente."
      />
    </>
  );
}
