import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Plus, Calendar, Edit2, Trash2, ChevronRight, CalendarDays, Play, Square, AlertTriangle, RefreshCw, Sparkles } from "lucide-react";
import { useOptionalBuClient } from "@/integrations/supabase/getOptionalBuClient";
import { queryKeys } from "@/lib/queryKeys";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
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
import { CycleFormDialog } from "./CycleFormDialog";
import { CycleRitualDates } from "./CycleRitualDates";
import { useCycleActions } from "@/modules/okrs/hooks/useCycleActions";
import { generateCyclesForYears, filterNewCycles } from "@/modules/okrs/utils/generateCycles";

interface Cycle {
  id: string;
  name: string;
  type: string;
  start_date: string;
  end_date: string;
  planning_date: string | null;
  review_date: string | null;
  review_date_first_month: string | null;
  retro_date: string | null;
  parent_cycle_id: string | null;
  created_at: string;
  status: 'planning' | 'active' | 'closed';
  qbr_status?: string;
}

const STATUS_CONFIG = {
  planning: { label: 'Planejamento', variant: 'outline' as const, className: 'border-warning/50 text-warning' },
  active: { label: 'Em execução', variant: 'default' as const, className: 'bg-success/10 text-success border-success/30' },
  closed: { label: 'Encerrado', variant: 'secondary' as const, className: 'text-muted-foreground' },
};

export function CyclesTab() {
  const { client: supabase, buId } = useOptionalBuClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<Cycle | null>(null);
  const [deleteDialogCycle, setDeleteDialogCycle] = useState<Cycle | null>(null);
  const [activateDialogCycle, setActivateDialogCycle] = useState<Cycle | null>(null);
  const [closeDialogCycle, setCloseDialogCycle] = useState<Cycle | null>(null);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const queryClient = useQueryClient();
  const { activateCycle, closeCycle } = useCycleActions();

  // Auto-transition toggle query
  const { data: autoTransitionEnabled, isLoading: isLoadingToggle } = useQuery({
    queryKey: ['okr-auto-cycle-transition', buId],
    queryFn: async () => {
      if (!supabase || !buId) return false;
      const { data, error } = await supabase
        .from('bu_module_configs')
        .select('config')
        .eq('bu_id', buId)
        .eq('module_id', (
          await supabase.from('modules').select('id').eq('slug', 'okrs').single()
        ).data?.id ?? '')
        .maybeSingle();
      if (error) return false;
      return (data?.config as Record<string, unknown>)?.auto_cycle_transition === true;
    },
    enabled: !!buId && !!supabase,
  });

  // Auto-transition toggle mutation
  const toggleAutoTransition = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!supabase || !buId) throw new Error('No BU');
      const { data: mod } = await supabase.from('modules').select('id').eq('slug', 'okrs').single();
      if (!mod) throw new Error('Module not found');

      // Get current config
      const { data: existing } = await supabase
        .from('bu_module_configs')
        .select('config')
        .eq('bu_id', buId)
        .eq('module_id', mod.id)
        .maybeSingle();

      const currentConfig = (existing?.config as Record<string, unknown>) ?? {};
      const newConfig = { ...currentConfig, auto_cycle_transition: enabled };

      const { error } = await supabase
        .from('bu_module_configs')
        .update({ config: newConfig } as any)
        .eq('bu_id', buId)
        .eq('module_id', mod.id);

      if (error) throw error;
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ['okr-auto-cycle-transition', buId] });
      toast.success(enabled ? 'Transição automática ativada' : 'Transição automática desativada');
    },
    onError: () => {
      toast.error('Erro ao salvar configuração');
    },
  });

  // Fetch all cycles
  const { data: cycles, isLoading } = useQuery({
    queryKey: queryKeys.okrs.settingsCycles(buId ?? null),
    queryFn: async () => {
      if (!supabase || !buId) return [];

      const { data, error } = await supabase
        .from("cycles")
        .select("id, name, type, start_date, end_date, planning_date, review_date, review_date_first_month, retro_date, parent_cycle_id, bu_id, created_at, status, qbr_status")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data as Cycle[];
    },
    enabled: !!buId && !!supabase,
  });

  // ── Auto-generation logic ──
  const currentYear = new Date().getFullYear();
  const targetYears = [currentYear, currentYear + 1, currentYear + 2];

  const existingAnnualYears = useMemo(() => {
    if (!cycles) return [];
    return cycles
      .filter(c => c.type === 'year')
      .map(c => {
        const match = c.name.match(/^(\d{4})/);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter((y): y is number => y !== null);
  }, [cycles]);

  const missingYears = useMemo(() => {
    const existingSet = new Set(existingAnnualYears);
    return targetYears.filter(y => !existingSet.has(y));
  }, [existingAnnualYears, targetYears]);

  const showGenerateButton = !isLoading && missingYears.length > 0;

  const cyclesToGenerate = useMemo(() => {
    if (missingYears.length === 0) return [];
    return filterNewCycles(
      generateCyclesForYears(currentYear, 3),
      existingAnnualYears,
    );
  }, [missingYears, existingAnnualYears, currentYear]);

  const generateCyclesMutation = useMutation({
    mutationFn: async () => {
      if (!supabase || !buId || cyclesToGenerate.length === 0) throw new Error('No data');

      // Separate annuals and quarters
      const annuals = cyclesToGenerate.filter(c => c.type === 'year');
      const quarters = cyclesToGenerate.filter(c => c.type === 'quarter');

      // Insert annuals first
      const annualInserts = annuals.map(c => ({
        bu_id: buId,
        name: c.name,
        type: c.type,
        start_date: c.start_date,
        end_date: c.end_date,
        planning_date: c.planning_date,
        review_date: c.review_date,
        review_date_first_month: c.review_date_first_month,
        retro_date: c.retro_date,
        status: c.status,
      }));

      const { data: insertedAnnuals, error: annualError } = await supabase
        .from('cycles')
        .insert(annualInserts)
        .select('id, name');

      if (annualError) throw annualError;

      // Build parent map: _tempKey → real id
      const parentMap = new Map<string, string>();
      for (const inserted of insertedAnnuals || []) {
        const match = inserted.name.match(/^(\d{4})-Annual$/);
        if (match) {
          parentMap.set(`annual-${match[1]}`, inserted.id);
        }
      }

      // Insert quarters with real parent_cycle_id
      if (quarters.length > 0) {
        const quarterInserts = quarters.map(c => ({
          bu_id: buId,
          name: c.name,
          type: c.type,
          start_date: c.start_date,
          end_date: c.end_date,
          planning_date: c.planning_date,
          review_date: c.review_date,
          review_date_first_month: c.review_date_first_month,
          retro_date: c.retro_date,
          status: c.status,
          parent_cycle_id: c._tempParentKey ? parentMap.get(c._tempParentKey) || null : null,
        }));

        const { error: quarterError } = await supabase
          .from('cycles')
          .insert(quarterInserts);

        if (quarterError) throw quarterError;
      }

      // ── Unification: Upsert ritual cadences for MBR (1st Tuesday) ──
      // Update existing MBR cadence to use month_week_ordinal=1, day_of_week=2 (1st Tuesday)
      const { data: existingMbr } = await supabase
        .from('ritual_cadences')
        .select('id')
        .eq('bu_id', buId)
        .eq('wizard_type', 'mbr')
        .eq('is_active', true)
        .maybeSingle();

      if (existingMbr) {
        await supabase
          .from('ritual_cadences')
          .update({ month_week_ordinal: 1, day_of_week: 2, day_of_month: null } as any)
          .eq('id', existingMbr.id);

        // Regenerate occurrences
        await supabase.functions.invoke('generate-ritual-occurrences', {
          body: { cadence_id: existingMbr.id, bu_id: buId },
        });
      }

      // Ensure mbr-pre cadence exists (if not, create it)
      const { data: existingMbrPre } = await supabase
        .from('ritual_cadences')
        .select('id')
        .eq('bu_id', buId)
        .eq('wizard_type', 'mbr-pre')
        .eq('is_active', true)
        .maybeSingle();

      if (!existingMbrPre) {
        const { data: newMbrPre } = await supabase
          .from('ritual_cadences')
          .insert({
            bu_id: buId,
            wizard_type: 'mbr-pre',
            frequency: 'monthly',
            month_week_ordinal: 1,
            day_of_week: 2,
            start_date: new Date().toISOString().split('T')[0],
            is_active: true,
          })
          .select('id')
          .single();

        if (newMbrPre) {
          await supabase.functions.invoke('generate-ritual-occurrences', {
            body: { cadence_id: newMbrPre.id, bu_id: buId },
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.settingsCycles(null), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.cyclesList(null), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.activeCycle(null) });
      toast.success(`Ciclos gerados com sucesso para ${missingYears.join(', ')}!`);
      setShowGenerateDialog(false);
    },
    onError: () => {
      toast.error('Erro ao gerar ciclos automaticamente');
    },
  });

  // Delete mutation
  const handleDelete = async (cycleId: string) => {
    if (!supabase || !buId) return;
    const cycle = cycles?.find(c => c.id === cycleId);
    if (cycle?.status === 'active') {
      toast.error('Não é possível remover um ciclo ativo. Encerre-o primeiro.');
      return;
    }
    try {
      const { error } = await supabase.from("cycles").delete().eq("id", cycleId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.settingsCycles(null), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.cyclesList(null), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.activeCycle(null) });
      toast.success("Ciclo removido com sucesso");
      setDeleteDialogCycle(null);
    } catch {
      toast.error("Erro ao remover ciclo");
    }
  };

  const handleActivate = () => {
    if (!activateDialogCycle) return;
    activateCycle.mutate(activateDialogCycle.id, {
      onSettled: () => setActivateDialogCycle(null),
    });
  };

  const handleClose = () => {
    if (!closeDialogCycle) return;
    closeCycle.mutate(closeDialogCycle.id, {
      onSettled: () => setCloseDialogCycle(null),
    });
  };

  // Check for existing active cycle of same type
  const getActiveOfType = (type: string) => cycles?.find(c => c.status === 'active' && c.type === type);

  const yearCycles = cycles?.filter((c) => c.type === "year") ?? [];
  const quarterCycles = cycles?.filter((c) => c.type === "quarter") ?? [];

  // Sort: active first, then planning, then closed
  const statusOrder = { active: 0, planning: 1, closed: 2 };
  const sortedYearCycles = [...yearCycles].sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  const getQuartersForYear = (yearCycleId: string) => {
    return quarterCycles
      .filter((q) => q.parent_cycle_id === yearCycleId)
      .sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
  };

  const formatDate = (dateStr: string) => {
    return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR });
  };

  const handleEdit = (cycle: Cycle) => {
    setEditingCycle(cycle);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingCycle(null);
  };

  const renderStatusBadge = (status: 'planning' | 'active' | 'closed') => {
    const config = STATUS_CONFIG[status];
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const renderCycleActions = (cycle: Cycle) => (
    <div className="flex items-center gap-1">
      {cycle.status === 'planning' && (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-success hover:text-success"
          onClick={() => setActivateDialogCycle(cycle)}
        >
          <Play className="h-3.5 w-3.5" />
          Ativar
        </Button>
      )}
      {cycle.status === 'active' && (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-warning hover:text-warning"
          onClick={() => setCloseDialogCycle(cycle)}
        >
          <Square className="h-3.5 w-3.5" />
          Encerrar
        </Button>
      )}
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(cycle)}>
        <Edit2 className="h-3.5 w-3.5" />
      </Button>
      {cycle.status !== 'active' && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => setDeleteDialogCycle(cycle)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Auto-transition toggle */}
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <RefreshCw className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Transição automática de ciclos</p>
              <p className="text-xs text-muted-foreground">
                Ciclos em planejamento serão ativados automaticamente na data de início. Ciclos ativos serão encerrados na data final.
              </p>
            </div>
          </div>
          <Switch
            checked={autoTransitionEnabled ?? false}
            onCheckedChange={(checked) => toggleAutoTransition.mutate(checked)}
            disabled={isLoadingToggle || toggleAutoTransition.isPending}
          />
        </CardContent>
      </Card>

      {/* Auto-generate cycles */}
      {showGenerateButton && (
        <Card className="border-dashed border-primary/40 bg-primary/5">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Gerar ciclos automaticamente</p>
                <p className="text-xs text-muted-foreground">
                  Criar ciclos para {missingYears.join(', ')} com todas as datas de rituais pré-preenchidas
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="gap-2"
              onClick={() => setShowGenerateDialog(true)}
            >
              <Sparkles className="h-4 w-4" />
              Gerar
            </Button>
          </CardContent>
        </Card>
      )}

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
          ) : sortedYearCycles.length === 0 ? (
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
              {sortedYearCycles.map((cycle) => {
                const quarters = getQuartersForYear(cycle.id);

                return (
                  <div
                    key={cycle.id}
                    className={`border rounded-lg overflow-hidden ${cycle.status === 'active' ? 'border-success/40 ring-1 ring-success/20' : ''}`}
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
                            {renderStatusBadge(cycle.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(cycle.start_date)} - {formatDate(cycle.end_date)}
                          </p>
                        </div>
                      </div>
                      {renderCycleActions(cycle)}
                    </div>

                    {/* Quarters */}
                    {quarters.length > 0 && (
                      <div className="divide-y">
                        {quarters.map((quarter) => (
                          <div
                            key={quarter.id}
                            className={`px-4 py-3 flex items-center justify-between hover:bg-muted/20 ${quarter.status === 'active' ? 'bg-success/5' : ''}`}
                          >
                            <div className="flex items-center gap-3">
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">
                                    {quarter.name}
                                  </span>
                                  {renderStatusBadge(quarter.status)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(quarter.start_date)} -{" "}
                                  {formatDate(quarter.end_date)}
                                </p>
                                <CycleRitualDates
                                  review_date_first_month={quarter.review_date_first_month}
                                  planning_date={quarter.planning_date}
                                  review_date={quarter.review_date}
                                  retro_date={quarter.retro_date}
                                />
                              </div>
                            </div>
                            {renderCycleActions(quarter)}
                          </div>
                        ))}
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
              <Calendar className="h-5 w-5 text-warning" />
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
                .sort((a, b) => statusOrder[a.status] - statusOrder[b.status])
                .map((quarter) => (
                  <div
                    key={quarter.id}
                    className={`flex items-center justify-between p-3 border rounded-lg ${quarter.status === 'active' ? 'border-success/40 bg-success/5' : ''}`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{quarter.name}</span>
                        {renderStatusBadge(quarter.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(quarter.start_date)} -{" "}
                        {formatDate(quarter.end_date)}
                      </p>
                    </div>
                    {renderCycleActions(quarter)}
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
        onConfirm={() => deleteDialogCycle && handleDelete(deleteDialogCycle.id)}
      />

      {/* Activate Confirmation */}
      <AlertDialog open={!!activateDialogCycle} onOpenChange={(open) => !open && setActivateDialogCycle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ativar ciclo</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span>
                Deseja ativar o ciclo <strong>{activateDialogCycle?.name}</strong>?
              </span>
              {activateDialogCycle && getActiveOfType(activateDialogCycle.type) && (
                <span className="flex items-center gap-2 text-warning mt-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Já existe um ciclo {activateDialogCycle.type === 'quarter' ? 'trimestral' : 'anual'} ativo: <strong>{getActiveOfType(activateDialogCycle.type)?.name}</strong>. Ele será encerrado automaticamente ao ativar este.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleActivate}
              disabled={activateCycle.isPending}
              className="bg-success hover:bg-success/90"
            >
              {activateCycle.isPending ? 'Ativando...' : 'Ativar ciclo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Close Confirmation */}
      <AlertDialog open={!!closeDialogCycle} onOpenChange={(open) => !open && setCloseDialogCycle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar ciclo</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span>
                Deseja encerrar o ciclo <strong>{closeDialogCycle?.name}</strong>?
              </span>
              {closeDialogCycle?.qbr_status && closeDialogCycle.qbr_status !== 'done' && closeDialogCycle.type === 'quarter' && (
                <span className="flex items-center gap-2 text-warning mt-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  O QBR deste ciclo ainda não foi concluído. Encerrar mesmo assim?
                </span>
              )}
              <span className="block text-sm">
                Dados históricos serão preservados. Nenhum novo OKR ou check-in será vinculado a este ciclo.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClose}
              disabled={closeCycle.isPending}
              className="bg-warning hover:bg-warning/90 text-warning-foreground"
            >
              {closeCycle.isPending ? 'Encerrando...' : 'Encerrar ciclo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Generate Cycles Confirmation */}
      <AlertDialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gerar ciclos automaticamente</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Serão criados ciclos para os anos <strong>{missingYears.join(', ')}</strong> com todas as datas de rituais pré-preenchidas.
                </p>
                <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
                  {missingYears.map(year => (
                    <div key={year}>
                      <span className="font-medium">{year}:</span>{' '}
                      1 anual + 4 trimestrais (Q1–Q4)
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Todos os ciclos serão criados com status "Planejamento". As datas podem ser editadas manualmente depois.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => generateCyclesMutation.mutate()}
              disabled={generateCyclesMutation.isPending}
            >
              {generateCyclesMutation.isPending ? 'Gerando...' : `Gerar ${cyclesToGenerate.length} ciclos`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
