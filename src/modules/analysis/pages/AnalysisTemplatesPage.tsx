/**
 * AnalysisTemplatesPage — galeria + CRUD de templates da BU
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { HubLayout } from "@/components/layout/HubLayout";
import { PageHeader } from "@/components/ui/page-header";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useHasPermission } from "@/hooks/usePermissions";
import { useAnalysisTemplates } from "../hooks/useAnalysisTemplates";
import { useDeleteTemplate } from "../hooks/useAnalysisTemplateMutations";
import { TemplateFormDialog } from "../components/templates/TemplateFormDialog";
import type { AnalysisTemplate } from "../types";

export default function AnalysisTemplatesPage() {
  usePageTitle("Templates de análise");
  const navigate = useNavigate();
  const { data: templates = [], isLoading } = useAnalysisTemplates();
  const canManage = useHasPermission("analysis.template.manage:bu");
  const deleteTemplate = useDeleteTemplate();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AnalysisTemplate | null>(null);
  const [toDelete, setToDelete] = useState<AnalysisTemplate | null>(null);

  const grouped = templates.reduce<Record<string, typeof templates>>((acc, t) => {
    (acc[t.category] ||= []).push(t);
    return acc;
  }, {});

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (t: AnalysisTemplate) => {
    setEditing(t);
    setFormOpen(true);
  };

  return (
    <HubLayout>
      <div className="space-y-6">
        <PageHeader
          title="Templates de análise"
        description="Use um template para iniciar rapidamente."
        backTo="/analysis"
        backLabel="Voltar para Análise"
        actions={
          canManage ? (
            <Button onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" />
              Novo template
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : !templates.length ? (
        <p className="text-sm text-muted-foreground">Nenhum template disponível.</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, list]) => (
            <section key={cat} className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {cat}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((t) => {
                  const isBu = t.scope === "bu";
                  const showMenu = canManage && isBu;
                  return (
                    <Card key={t.id} className="flex flex-col">
                      <CardContent className="flex flex-1 flex-col gap-3 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-medium text-foreground">{t.name}</h3>
                          <div className="flex items-center gap-1.5">
                            <Badge variant={isBu ? "default" : "secondary"} className="text-[10px]">
                              {isBu ? "BU" : "Global"}
                            </Badge>
                            {t.is_admin_only && (
                              <Badge variant="secondary" className="text-[10px]">
                                Admin
                              </Badge>
                            )}
                            {showMenu && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon-sm">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEdit(t)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setToDelete(t)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                        <p className="line-clamp-3 flex-1 text-xs text-muted-foreground">
                          {t.premise}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/analysis?template_id=${t.id}`)}
                        >
                          Usar este template
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <TemplateFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        template={editing}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir template"
        description={
          toDelete
            ? `Deseja realmente excluir "${toDelete.name}"? Esta ação não pode ser desfeita.`
            : ""
        }
        variant="destructive"
        isLoading={deleteTemplate.isPending}
        onConfirm={async () => {
          if (!toDelete) return;
          await deleteTemplate.mutateAsync(toDelete.id);
          setToDelete(null);
        }}
      />
      </div>
    </HubLayout>
  );
}
