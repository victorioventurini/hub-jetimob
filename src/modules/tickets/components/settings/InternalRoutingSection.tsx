// ============================================================
// INTERNAL ROUTING SECTION
// Seção de regras de roteamento interno na página de configurações
// ============================================================

import { useState } from "react";
import { Route, Plus, Pencil, Trash2, Users, Building2, Target } from "lucide-react";
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
import {
  useInternalRoutingRules,
  useDeleteInternalRoutingRule,
} from "../../hooks/useInternalRoutingRules";
import { useTicketCategories } from "../../hooks/useTicketCategories";
import { InternalRoutingRuleDialog } from "./InternalRoutingRuleDialog";
import { TicketInternalRoutingRule } from "../../types";

export function InternalRoutingSection() {
  const { data: rules = [], isLoading: loadingRules } = useInternalRoutingRules();
  const { data: categories = [], isLoading: loadingCategories } = useTicketCategories();
  const { mutate: deleteRule, isPending: isDeleting } = useDeleteInternalRoutingRule();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<TicketInternalRoutingRule | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Filtrar categorias internas ou ambas
  const internalCategories = categories.filter(
    (c) => c.scope === "internal" || c.scope === "both"
  );

  const handleEdit = (rule: TicketInternalRoutingRule) => {
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

  const getRuleScopeName = (rule: TicketInternalRoutingRule): string => {
    if (rule.subcategory) {
      const catName = rule.subcategory.category?.name || "Categoria";
      return `${catName} → ${rule.subcategory.name}`;
    }
    if (rule.category) {
      return `${rule.category.name} (Categoria)`;
    }
    return "Escopo desconhecido";
  };

  const getAssigneeBadges = (rule: TicketInternalRoutingRule) => {
    const badges: { icon: React.ReactNode; label: string; variant: "default" | "secondary" | "outline" }[] = [];

    if (rule.assignee_user_ids?.length > 0) {
      badges.push({
        icon: <Users className="h-3 w-3 mr-1" />,
        label: `${rule.assignee_user_ids.length} usuário(s)`,
        variant: "secondary",
      });
    }
    if (rule.assignee_team_ids?.length > 0) {
      badges.push({
        icon: <Building2 className="h-3 w-3 mr-1" />,
        label: `${rule.assignee_team_ids.length} time(s)`,
        variant: "secondary",
      });
    }
    if (rule.assignee_squad_ids?.length > 0) {
      badges.push({
        icon: <Target className="h-3 w-3 mr-1" />,
        label: `${rule.assignee_squad_ids.length} squad(s)`,
        variant: "secondary",
      });
    }

    return badges;
  };

  const getWatcherBadges = (rule: TicketInternalRoutingRule) => {
    const badges: { icon: React.ReactNode; label: string; variant: "default" | "secondary" | "outline" }[] = [];

    if (rule.watcher_user_ids?.length > 0) {
      badges.push({
        icon: <Users className="h-3 w-3 mr-1" />,
        label: `${rule.watcher_user_ids.length} usuário(s)`,
        variant: "outline",
      });
    }
    if (rule.watcher_team_ids?.length > 0) {
      badges.push({
        icon: <Building2 className="h-3 w-3 mr-1" />,
        label: `${rule.watcher_team_ids.length} time(s)`,
        variant: "outline",
      });
    }
    if (rule.watcher_squad_ids?.length > 0) {
      badges.push({
        icon: <Target className="h-3 w-3 mr-1" />,
        label: `${rule.watcher_squad_ids.length} squad(s)`,
        variant: "outline",
      });
    }

    return badges;
  };

  if (loadingRules || loadingCategories) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Roteamento de Tickets Internos</CardTitle>
            <CardDescription>
              Configure atribuição automática de tickets internos por categoria ou subcategoria
            </CardDescription>
          </div>
          <Button onClick={handleCreate} disabled={internalCategories.length === 0}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Regra
          </Button>
        </CardHeader>
        <CardContent>
          {internalCategories.length === 0 ? (
            <EmptyState
              icon={Route}
              title="Nenhuma categoria interna"
              description="Crie categorias com escopo 'Interno' ou 'Ambos' para configurar regras de roteamento."
              compact
            />
          ) : rules.length === 0 ? (
            <EmptyState
              icon={Route}
              title="Nenhuma regra de roteamento interno"
              description="Crie regras para atribuir automaticamente tickets internos a usuários, times ou squads."
              compact
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria / Subcategoria</TableHead>
                  <TableHead>Responsáveis</TableHead>
                  <TableHead>Observadores</TableHead>
                  <TableHead className="text-center">Prioridade</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => {
                  const assigneeBadges = getAssigneeBadges(rule);
                  const watcherBadges = getWatcherBadges(rule);

                  return (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{getRuleScopeName(rule)}</span>
                          {rule.notes && (
                            <span className="text-xs text-muted-foreground line-clamp-1">
                              {rule.notes}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {assigneeBadges.length > 0 ? (
                            assigneeBadges.map((badge, idx) => (
                              <Badge key={idx} variant={badge.variant} className="text-xs">
                                {badge.icon}
                                {badge.label}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {watcherBadges.length > 0 ? (
                            watcherBadges.map((badge, idx) => (
                              <Badge key={idx} variant={badge.variant} className="text-xs">
                                {badge.icon}
                                {badge.label}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{rule.priority}</Badge>
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
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <InternalRoutingRuleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        rule={editingRule}
        categories={internalCategories}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Remover regra de roteamento interno?"
        description="Novos tickets não serão mais automaticamente atribuídos por esta regra."
      />
    </>
  );
}
