import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Plus, Calendar, Edit2, Trash2, ChevronRight, CalendarDays } from "lucide-react";
import { useOptionalBuClient } from "@/integrations/supabase/getOptionalBuClient";
import { queryKeys } from "@/lib/queryKeys";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { CycleFormDialog } from "./CycleFormDialog";

interface Cycle {
  id: string;
  name: string;
  type: string;
  start_date: string;
  end_date: string;
  planning_date: string | null;
  review_date: string | null;
  retro_date: string | null;
  parent_cycle_id: string | null;
  created_at: string;
}

export function CyclesTab() {
  const { client: supabase, buId } = useOptionalBuClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<Cycle | null>(null);
  const [deleteDialogCycle, setDeleteDialogCycle] = useState<Cycle | null>(null);
  const queryClient = useQueryClient();

  // Fetch all cycles
  const { data: cycles, isLoading } = useQuery({
    queryKey: queryKeys.okrs.settingsCycles(buId ?? null),
    queryFn: async () => {
      if (!supabase || !buId) return [];

      const { data, error } = await supabase
        .from("cycles")
        .select("id, name, type, start_date, end_date, planning_date, review_date, retro_date, parent_cycle_id, bu_id, created_at")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data as Cycle[];
    },
    enabled: !!buId && !!supabase,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (cycleId: string) => {
      if (!supabase || !buId) throw new Error('Nenhuma BU selecionada');
      const { error } = await supabase.from("cycles").delete().eq("id", cycleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.settingsCycles(null) });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.cyclesList(null) });
      toast.success("Ciclo removido com sucesso");
      setDeleteDialogCycle(null);
    },
    onError: (error) => {
      toast.error("Erro ao remover ciclo");
      console.error(error);
    },
  });

  const yearCycles = cycles?.filter((c) => c.type === "year") ?? [];
  const quarterCycles = cycles?.filter((c) => c.type === "quarter") ?? [];

  const getQuartersForYear = (yearCycleId: string) => {
    return quarterCycles.filter((q) => q.parent_cycle_id === yearCycleId);
  };

  const formatDate = (dateStr: string) => {
    return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR });
  };

  const isCurrentCycle = (startDate: string, endDate: string) => {
    const now = new Date();
    return now >= parseISO(startDate) && now <= parseISO(endDate);
  };

  const handleEdit = (cycle: Cycle) => {
    setEditingCycle(cycle);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingCycle(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Gerenciar Ciclos</h2>
          <p className="text-sm text-muted-foreground">
            Configure os ciclos anuais e trimestrais para os OKRs
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Ciclo
        </Button>
      </div>

      {/* Year Cycles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-5 w-5 text-primary" />
            Ciclos Anuais
          </CardTitle>
          <CardDescription>
            Ciclos anuais são usados para Objetivos Organizacionais
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : yearCycles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>Nenhum ciclo anual configurado</p>
              <Button
                variant="link"
                onClick={() => setIsFormOpen(true)}
                className="mt-2"
              >
                Criar primeiro ciclo
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {yearCycles.map((cycle) => {
                const quarters = getQuartersForYear(cycle.id);
                const isCurrent = isCurrentCycle(cycle.start_date, cycle.end_date);

                return (
                  <div
                    key={cycle.id}
                    className="border rounded-lg overflow-hidden"
                  >
                    {/* Year Header */}
                    <div className="p-4 bg-muted/30 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <CalendarDays className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{cycle.name}</span>
                            {isCurrent && (
                              <Badge className="bg-success/10 text-success">
                                Atual
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(cycle.start_date)} - {formatDate(cycle.end_date)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(cycle)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteDialogCycle(cycle)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Quarters */}
                    {quarters.length > 0 && (
                      <div className="divide-y">
                        {quarters.map((quarter) => {
                          const isQuarterCurrent = isCurrentCycle(
                            quarter.start_date,
                            quarter.end_date
                          );
                          return (
                            <div
                              key={quarter.id}
                              className="px-4 py-3 flex items-center justify-between hover:bg-muted/20"
                            >
                              <div className="flex items-center gap-3">
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">
                                      {quarter.name}
                                    </span>
                                    {isQuarterCurrent && (
                                      <Badge
                                        variant="outline"
                                        className="text-success border-success/30"
                                      >
                                        Atual
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {formatDate(quarter.start_date)} -{" "}
                                    {formatDate(quarter.end_date)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleEdit(quarter)}
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => setDeleteDialogCycle(quarter)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {quarters.length === 0 && (
                      <div className="px-4 py-3 text-sm text-muted-foreground border-t">
                        Nenhum trimestre vinculado a este ano
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Standalone Quarter Cycles */}
      {quarterCycles.filter((q) => !q.parent_cycle_id).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5 text-amber-500" />
              Ciclos Trimestrais (sem vínculo)
            </CardTitle>
            <CardDescription>
              Trimestres que não estão vinculados a um ciclo anual
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {quarterCycles
                .filter((q) => !q.parent_cycle_id)
                .map((quarter) => (
                  <div
                    key={quarter.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <span className="font-medium">{quarter.name}</span>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(quarter.start_date)} -{" "}
                        {formatDate(quarter.end_date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(quarter)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteDialogCycle(quarter)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form Dialog */}
      <CycleFormDialog
        open={isFormOpen}
        onOpenChange={handleCloseForm}
        cycle={editingCycle}
        yearCycles={yearCycles}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={!!deleteDialogCycle}
        onOpenChange={(open) => !open && setDeleteDialogCycle(null)}
        title="Remover ciclo"
        description={`Tem certeza que deseja remover o ciclo "${deleteDialogCycle?.name}"? Esta ação não pode ser desfeita.`}
        onConfirm={() => deleteDialogCycle && deleteMutation.mutate(deleteDialogCycle.id)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
