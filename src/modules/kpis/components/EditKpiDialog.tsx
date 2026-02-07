import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TeamSelect, BuUserSelect, AreaSelect } from "@/components/selects";
import { Badge } from "@/components/ui/badge";
import { useKpiMutations } from "../hooks/useKpiMutations";
import { useTeamArea } from "../hooks/useTeamArea";
import {
  KpiDirection,
  KpiFrequency,
  KpiIndicatorType,
  KpiLifecycleStatus,
  KpiScope,
  KpiMetric,
  FREQUENCY_LABELS,
  DIRECTION_LABELS,
  INDICATOR_TYPE_LABELS,
  LIFECYCLE_STATUS_LABELS,
  getScopeLabels,
} from "../types";
import { useBu } from "@/contexts/BuContext";
import { usePermissions } from "@/hooks/usePermissions";
import { ChevronDown, Info } from "lucide-react";
import { HelpTooltip } from "@/components/ui/help-tooltip";

/**
 * v2.82.0 - Formulário de edição de Indicadores
 * 
 * Governança:
 * - KPIs: Apenas líderes/admins podem editar tipo
 * - Métricas: Qualquer colaborador pode editar
 * 
 * Auto-inferência:
 * - Quando scope=team, a área é inferida automaticamente do time
 */

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100),
  description: z.string().max(500).optional(),
  unit: z.string().min(1, "Unidade é obrigatória"),
  direction: z.enum(["up", "down"]),
  frequency: z.enum(["daily", "weekly", "monthly", "quarterly"]),
  team_id: z.string().optional(),
  owner_user_id: z.string().optional(),
  target_value: z.coerce.number().optional(),
  // Governance fields
  indicator_type: z.enum(["kpi", "metric"]),
  lifecycle_status: z.enum(["proposed", "active", "observing", "deprecated"]),
  target_source: z.string().max(500).optional(),
  recovery_protocol: z.string().max(1000).optional(),
  // Scope and ownership
  area_id: z.string().optional(),
  scope: z.enum(["team", "area", "org"]),
}).superRefine((data, ctx) => {
  if (data.scope === 'team' && !data.team_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Time é obrigatório para escopo 'Time'",
      path: ["team_id"],
    });
  }
  if (data.lifecycle_status === 'active') {
    if (!data.owner_user_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Responsável é obrigatório para indicadores ativos",
        path: ["owner_user_id"],
      });
    }
    // Área obrigatória apenas para scope=area (e ativos)
    // scope=team: área é auto-inferida do time
    // scope=org: indicador global, não pertence a uma área específica
    if (data.scope === 'area' && !data.area_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Área é obrigatória para indicadores de escopo 'Área'",
        path: ["area_id"],
      });
    }
  }
  // v2.86.0: Fonte da meta obrigatória quando meta preenchida
  if (data.target_value !== undefined && data.target_value !== null && !data.target_source?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Fonte da meta é obrigatória quando há meta definida",
      path: ["target_source"],
    });
  }
});

type DbKpiFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly';
type FormValues = z.infer<typeof formSchema>;

interface EditKpiDialogProps {
  kpi: KpiMetric | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditKpiDialog({ kpi, open, onOpenChange }: EditKpiDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { updateKpi } = useKpiMutations();
  const { has: hasPermission, isLoading: isLoadingPermission } = usePermissions();
  const { currentBu } = useBu();
  
  // Dynamic scope labels with BU name
  const scopeLabels = getScopeLabels(currentBu?.name);
  
  // Pode editar indicadores (owner/líder ou admin)
  const canEditIndicator = hasPermission("kpis.metric.update:self_or_owner") || hasPermission("kpis.settings.manage:bu");
  // Pode mudar tipo para KPI (apenas admin)
  const canCreateKpi = hasPermission("kpis.settings.manage:bu");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      unit: "%",
      direction: "up",
      frequency: "monthly",
      indicator_type: "kpi",
      lifecycle_status: "active",
      target_source: "",
      recovery_protocol: "",
      area_id: undefined,
      scope: "team",
    },
  });

  const watchScope = form.watch("scope");
  const watchLifecycleStatus = form.watch("lifecycle_status");
  const watchTeamId = form.watch("team_id");

  // Auto-inferência de área quando scope=team
  const { areaId: inferredAreaId, areaName: inferredAreaName, isLoading: isLoadingArea } = useTeamArea(
    watchScope === 'team' ? watchTeamId : undefined
  );

  // Reset form when KPI changes
  useEffect(() => {
    if (kpi && open) {
      form.reset({
        name: kpi.name,
        description: kpi.description || "",
        unit: kpi.unit,
        direction: kpi.direction,
        frequency: kpi.frequency === 'manual' ? 'monthly' : kpi.frequency as DbKpiFrequency,
        team_id: kpi.team_id || undefined,
        owner_user_id: kpi.owner_user_id || undefined,
        target_value: kpi.target_value || undefined,
        // Governance fields
        indicator_type: kpi.indicator_type || "kpi",
        lifecycle_status: kpi.lifecycle_status || "active",
        target_source: kpi.target_source || "",
        recovery_protocol: kpi.recovery_protocol || "",
        // Scope and ownership
        area_id: kpi.area_id || undefined,
        scope: kpi.scope || "team",
      });
      // Open advanced if there are values
      if (kpi.target_source || kpi.recovery_protocol) {
        setShowAdvanced(true);
      }
    }
  }, [kpi, open, form]);

  // Atualizar area_id quando inferido (e não há área já definida)
  useEffect(() => {
    if (watchScope === 'team' && inferredAreaId && !form.getValues("area_id")) {
      form.setValue("area_id", inferredAreaId);
    }
  }, [watchScope, inferredAreaId, form]);

  // Defense in Depth: block render if no permission
  if (!isLoadingPermission && !canEditIndicator) {
    return null;
  }

  const handleScopeChange = (newScope: KpiScope) => {
    form.setValue("scope", newScope);
    if (newScope !== "team") {
      form.setValue("team_id", undefined);
      form.setValue("area_id", undefined);
    }
  };

  // Governança: quando usuário sem permissão tenta selecionar KPI
  const handleIndicatorTypeChange = (type: KpiIndicatorType) => {
    if (type === 'kpi' && !canCreateKpi) {
      return;
    }
    form.setValue("indicator_type", type);
  };

  const onSubmit = async (values: FormValues) => {
    if (!kpi) return;
    
    // Determinar area_id final (inferido ou selecionado)
    const finalAreaId = values.scope === 'team' ? inferredAreaId : values.area_id;
    
    setIsSubmitting(true);
    try {
      await updateKpi.mutateAsync({
        id: kpi.id,
        name: values.name,
        description: values.description || null,
        category: kpi.category || "operacoes", // DEPRECATED: manter valor existente
        unit: values.unit,
        direction: values.direction as KpiDirection,
        frequency: values.frequency as DbKpiFrequency,
        team_id: values.scope === 'team' ? values.team_id || null : null,
        owner_user_id: values.owner_user_id || null,
        target_value: values.target_value || null,
        // Governance fields
        indicator_type: values.indicator_type as KpiIndicatorType,
        lifecycle_status: values.lifecycle_status as KpiLifecycleStatus,
        target_source: values.target_source || null,
        recovery_protocol: values.recovery_protocol || null,
        // Scope and ownership
        area_id: finalAreaId || null,
        scope: values.scope as KpiScope,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>Editar Indicador</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Indicador</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: NPS, CAC, Churn Rate..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Defina como esse indicador é calculado..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="indicator_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Tipo
                      <HelpTooltip 
                        content={
                          <div className="space-y-1">
                            <p><strong>KPI:</strong> Indicador-chave de performance.</p>
                            <p><strong>Métrica:</strong> Medição operacional.</p>
                            {!canCreateKpi && (
                              <p className="text-muted-foreground text-xs mt-2">
                                <Info className="h-3 w-3 inline mr-1" />
                                KPIs só podem ser editados por líderes ou admins.
                              </p>
                            )}
                          </div>
                        }
                      />
                    </FormLabel>
                    <Select 
                      onValueChange={handleIndicatorTypeChange} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(INDICATOR_TYPE_LABELS) as KpiIndicatorType[]).map((type) => (
                          <SelectItem 
                            key={type} 
                            value={type}
                            disabled={type === 'kpi' && !canCreateKpi}
                          >
                            {INDICATOR_TYPE_LABELS[type]}
                            {type === 'kpi' && !canCreateKpi && (
                              <span className="text-muted-foreground ml-1">(restrito)</span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lifecycle_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Status do Ciclo
                      <HelpTooltip 
                        content={
                          <div className="space-y-1">
                            <p><strong>Proposto:</strong> Em análise.</p>
                            <p><strong>Ativo:</strong> Em uso oficial.</p>
                            <p><strong>Em Observação:</strong> Avaliando descontinuação.</p>
                            <p><strong>Depreciado:</strong> Mantido apenas para histórico.</p>
                          </div>
                        }
                      />
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(LIFECYCLE_STATUS_LABELS) as KpiLifecycleStatus[]).map((status) => (
                          <SelectItem key={status} value={status}>
                            {LIFECYCLE_STATUS_LABELS[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="%">%</SelectItem>
                        <SelectItem value="R$">R$</SelectItem>
                        <SelectItem value="pontos">Pontos</SelectItem>
                        <SelectItem value="dias">Dias</SelectItem>
                        <SelectItem value="número">Número</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequência</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(FREQUENCY_LABELS) as KpiFrequency[])
                          .filter(f => f !== 'manual')
                          .map((freq) => (
                            <SelectItem key={freq} value={freq}>
                              {FREQUENCY_LABELS[freq]}
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="direction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Direção</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(DIRECTION_LABELS) as KpiDirection[]).map((dir) => (
                          <SelectItem key={dir} value={dir}>
                            {DIRECTION_LABELS[dir]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="target_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Meta ou Benchmark
                      <HelpTooltip 
                        content={
                          <div className="space-y-1">
                            <p>Valor de referência usado para avaliar o desempenho deste indicador.</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Pode ser uma meta interna, um benchmark de mercado, um recorde histórico da empresa ou outra referência estratégica.
                            </p>
                          </div>
                        }
                      />
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Ex: 70"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* v2.86.0: Fonte da Meta - obrigatória quando target_value preenchido */}
            <FormField
              control={form.control}
              name="target_source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Fonte da Meta ou Benchmark {form.watch("target_value") ? <span className="text-destructive">*</span> : "(opcional)"}
                    <HelpTooltip 
                      content={
                        <div className="space-y-1">
                          <p>Explique de onde vem esta referência.</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Exemplos: estudo de mercado, benchmark setorial, OKR do ciclo, decisão estratégica interna, recorde histórico ou link para material de referência.
                          </p>
                        </div>
                      }
                    />
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: OKR Q1 2026, Benchmark Gartner, Decisão Board..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Governance: Escopo e Área */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="scope"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Escopo
                      <HelpTooltip 
                        content={
                          <div className="space-y-1">
                            <p><strong>Time:</strong> Indicador específico (área inferida).</p>
                            <p><strong>Área:</strong> Indicador compartilhado.</p>
                            <p><strong>{currentBu?.name || 'Organização'}:</strong> Indicador global.</p>
                          </div>
                        }
                      />
                    </FormLabel>
                    <Select onValueChange={handleScopeChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(scopeLabels) as KpiScope[]).map((sc) => (
                          <SelectItem key={sc} value={sc}>
                            {scopeLabels[sc]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Área: mostrar seletor apenas quando scope === 'area' */}
              {/* scope=team: área é inferida do time */}
              {/* scope=org: indicador global, não pertence a área específica */}
              {watchScope === 'area' ? (
                <FormField
                  control={form.control}
                  name="area_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Área {watchLifecycleStatus === 'active' && <span className="text-destructive">*</span>}
                      </FormLabel>
                      <FormControl>
                        <AreaSelect
                          value={field.value}
                          onValueChange={(val) => field.onChange(val ?? undefined)}
                          placeholder="Selecione..."
                          triggerClassName="w-full"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : watchScope === 'team' ? (
                <FormItem>
                  <FormLabel>Área (inferida)</FormLabel>
                  <div className="h-10 flex items-center">
                    {isLoadingArea ? (
                      <span className="text-sm text-muted-foreground">Carregando...</span>
                    ) : inferredAreaName ? (
                      <Badge variant="secondary" className="text-sm">
                        {inferredAreaName}
                      </Badge>
                    ) : watchTeamId ? (
                      <span className="text-sm text-muted-foreground">Time sem área definida</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Selecione um time</span>
                    )}
                  </div>
                </FormItem>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {watchScope === 'team' && (
                <FormField
                  control={form.control}
                  name="team_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <TeamSelect
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Selecione..."
                          triggerClassName="w-full"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="owner_user_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Responsável {watchLifecycleStatus === 'active' && <span className="text-destructive">*</span>}
                    </FormLabel>
                    <FormControl>
                      <BuUserSelect
                        value={field.value}
                        onValueChange={(val) => field.onChange(val ?? undefined)}
                        placeholder="Selecione..."
                        className="w-full"
                        excludeExternal
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Campos avançados em Collapsible */}
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between text-muted-foreground"
                >
                  Configurações avançadas
                  <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-2">

                <FormField
                  control={form.control}
                  name="recovery_protocol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Protocolo de Recuperação (opcional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descreva o plano de ação caso o indicador fique amarelo ou vermelho..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Ações a serem tomadas quando o indicador ficar fora da meta
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CollapsibleContent>
            </Collapsible>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" isLoading={isSubmitting} loadingText="Salvando...">
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
