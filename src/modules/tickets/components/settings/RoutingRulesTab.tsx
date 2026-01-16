import { useState } from "react";
import { Route, Plus, Pencil, Trash2, ArrowRight } from "lucide-react";
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
import { useRoutingRules, useDeleteRoutingRule, usePartnerCompanies, useTicketCategories } from "../../hooks";
import { RoutingRuleDialog } from "./RoutingRuleDialog";
import { InternalRoutingSection } from "./InternalRoutingSection";
import { TicketRoutingRule } from "../../types";

export function RoutingRulesTab() {
  const { data: rules = [], isLoading: loadingRules } = useRoutingRules();
  const { data: companies = [] } = usePartnerCompanies();
  const { data: categories = [] } = useTicketCategories();
  const { mutate: deleteRule, isPending: isDeleting } = useDeleteRoutingRule();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<TicketRoutingRule | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleEdit = (rule: TicketRoutingRule) => {
    setEditingRule(rule);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingRule(null);
    setDialogOpen(true);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteRule(deleteId);
      setDeleteId(null);
    }
  };

  const getCompanyName = (id: string) => 
    companies.find((c) => c.id === id)?.name || "Empresa removida";

  const getSubcategoryName = (id: string) => {
    for (const cat of categories) {
      const sub = cat.subcategories?.find((s) => s.id === id);
      if (sub) return `${cat.name} → ${sub.name}`;
    }
    return "Subcategoria removida";
  };

  if (loadingRules) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* External Routing Section */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Roteamento de Tickets Externos</CardTitle>
            <CardDescription>
              Configure atribuição automática de tickets externos por empresa e subcategoria
            </CardDescription>
          </div>
          <Button onClick={handleCreate} disabled={companies.length === 0}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Regra
          </Button>
        </CardHeader>
        <CardContent>
          {companies.length === 0 ? (
            <EmptyState
              icon={Route}
              title="Nenhuma empresa parceira"
              description="Crie empresas parceiras primeiro para configurar regras de roteamento."
              compact
            />
          ) : rules.length === 0 ? (
            <EmptyState
              icon={Route}
              title="Nenhuma regra de roteamento externo"
              description="Crie regras para atribuir automaticamente tickets externos a responsáveis."
              compact
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Subcategoria</TableHead>
                  <TableHead>Responsáveis</TableHead>
                  <TableHead>Observadores</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{getCompanyName(rule.partner_company_id)}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        {getSubcategoryName(rule.subcategory_id)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {rule.assignee_contact_ids?.length || 0} contatos
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {rule.watcher_contact_ids?.length || 0} contatos
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(rule)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(rule.id)}
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

      {/* Internal Routing Section */}
      <InternalRoutingSection />

      <RoutingRuleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        rule={editingRule}
        companies={companies}
        categories={categories}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Remover regra de roteamento?"
        description="Novos tickets não serão mais automaticamente atribuídos por esta regra."
      />
    </div>
  );
}
