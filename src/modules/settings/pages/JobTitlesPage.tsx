import { useState, useMemo } from "react";
import { useLocalSearch } from "@/shared/url";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
  Briefcase,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { useJobTitles, useUpdateJobTitle, useDeleteJobTitle } from "../hooks/useJobTitles";
import { JobTitleDialog } from "../components/JobTitleDialog";
import type { JobTitleWithUsageCount } from "../types";

export default function JobTitlesPage() {
  usePageTitle("Cargos", { 
    skipBu: true, 
    customDescription: "Gerencie a lista de cargos padronizados da plataforma." 
  });

  // Local state for instant feedback, synced with URL
  const { value: localSearch, setValue: setLocalSearch } = useLocalSearch("q");
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingJobTitle, setEditingJobTitle] = useState<JobTitleWithUsageCount | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [jobTitleToDelete, setJobTitleToDelete] = useState<JobTitleWithUsageCount | null>(null);

  const { data: jobTitles, isLoading } = useJobTitles();
  const updateMutation = useUpdateJobTitle();
  const deleteMutation = useDeleteJobTitle();

  // Filter using local state for instant feedback
  const filteredJobTitles = useMemo(() => {
    if (!localSearch) return jobTitles || [];
    const lowerSearch = localSearch.toLowerCase();
    return (jobTitles || []).filter((jt) =>
      jt.name.toLowerCase().includes(lowerSearch) ||
      jt.description?.toLowerCase().includes(lowerSearch)
    );
  }, [jobTitles, localSearch]);

  const handleEdit = (jobTitle: JobTitleWithUsageCount) => {
    setEditingJobTitle(jobTitle);
    setDialogOpen(true);
  };

  const handleToggleActive = (jobTitle: JobTitleWithUsageCount) => {
    updateMutation.mutate({
      id: jobTitle.id,
      is_active: !jobTitle.is_active,
    });
  };

  const handleDeleteClick = (jobTitle: JobTitleWithUsageCount) => {
    setJobTitleToDelete(jobTitle);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (jobTitleToDelete) {
      deleteMutation.mutate(jobTitleToDelete.id, {
        onSettled: () => {
          setDeleteConfirmOpen(false);
          setJobTitleToDelete(null);
        },
      });
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingJobTitle(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cargos"
        description="Gerencie a lista de cargos padronizados desta Business Unit"
        backTo="/hub"
        backLabel="Voltar para Hub"
      />

      <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou descrição..."
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={() => setDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Cargo
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : filteredJobTitles.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-medium text-lg mb-1">
                  {localSearch ? "Nenhum cargo encontrado" : "Nenhum cargo cadastrado"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {localSearch
                    ? "Tente buscar por outro termo"
                    : "Crie o primeiro cargo para começar a padronizar os títulos"}
                </p>
                {!localSearch && (
                  <Button onClick={() => setDialogOpen(true)} variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Criar primeiro cargo
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-[100px] text-center">Usuários</TableHead>
                    <TableHead className="w-[100px] text-center">Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobTitles.map((jobTitle) => (
                    <TableRow key={jobTitle.id}>
                      <TableCell className="font-medium">{jobTitle.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {jobTitle.description || "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>{jobTitle.usage_count}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={jobTitle.is_active ? "default" : "secondary"}>
                          {jobTitle.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(jobTitle)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleActive(jobTitle)}>
                              {jobTitle.is_active ? (
                                <>
                                  <ToggleLeft className="h-4 w-4 mr-2" />
                                  Desativar
                                </>
                              ) : (
                                <>
                                  <ToggleRight className="h-4 w-4 mr-2" />
                                  Ativar
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(jobTitle)}
                              className="text-destructive focus:text-destructive"
                              disabled={jobTitle.usage_count > 0}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

      <JobTitleDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        editingJobTitle={editingJobTitle}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cargo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cargo "{jobTitleToDelete?.name}"? Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
