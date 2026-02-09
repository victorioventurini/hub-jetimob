import { useState, useEffect } from "react";
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
import { TeamSelect, BuUserSelect, AreaSelect, UnitSelect } from "@/components/selects";
import { Badge } from "@/components/ui/badge";
import { InfoNotice } from "@/components/ui/info-notice";
import { useKpiData } from "../hooks";
import { useTeamArea } from "../hooks/useTeamArea";
import {
  KpiDirection,
  KpiFrequency,
  KpiIndicatorType,
  KpiLifecycleStatus,
  KpiScope,
  FREQUENCY_LABELS,
  DIRECTION_LABELS,
  INDICATOR_TYPE_LABELS,
  LIFECYCLE_STATUS_LABELS,
  getScopeLabels,
} from "../types";
import { useBu } from "@/contexts/BuContext";
import { VicActionButton } from "@/modules/vic";
import { usePermissions } from "@/hooks/usePermissions";
import { ChevronDown, Info, Lock } from "lucide-react";
import { HelpTooltip } from "@/components/ui/help-tooltip";

/**
 * v2.90.0 - Formulário de criação de Indicadores
 * 
 * Governança por Escopo vs Responsabilidade Operacional:
 * - Escopo (org/area/team): Define ONDE o indicador impacta
 * - Responsabilidade: Define QUEM cuida no dia a dia
 * 
 * Regras de Permissão:
 * - scope=org: Apenas Admin/Super Admin
 * - scope=area: Apenas Admin/Super Admin  
 * - scope=team: Admin/Super Admin, Líder do time
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
  target_value: z.preprocess(
    (val) => (val === '' || val === null || val === undefined) ? undefined : Number(val),
    z.number().optional()
  ),
  // Governance fields
  indicator_type: z.enum(["kpi", "metric"]),
  lifecycle_status: z.enum(["proposed", "active", "observing", "deprecated"]),
  target_source: z.string().max(500).optional(),
  recovery_protocol: z.string().max(1000).optional(),
  // Scope and ownership
  area_id: z.string().optional(),
  scope: z.enum(["team", "area", "org"]),
  // v2.90.0: Operational responsibility
  responsible_area_id: z.string().optional(),
  responsible_team_id: z.string().optional(),
}).superRefine((data, ctx) => {
  // Validação: se scope='team', exigir team_id
  if (data.scope === 'team' && !data.team_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Time é obrigatório para escopo 'Time'",
      path: ["team_id"],
    });
  }
  // Validação: se lifecycle_status='active', exigir owner
  if (data.lifecycle_status === 'active') {
    if (!data.owner_user_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Responsável é obrigatório para indicadores ativos",
        path: ["owner_user_id"],
      });
    }
    // Área obrigatória apenas para scope=area (e ativos)
    if (data.scope === 'area' && !data.area_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Área é obrigatória para indicadores de escopo 'Área'",
        path: ["area_id"],
      });
    }
    // v2.90.0: scope=org ativo → responsible_area_id OBRIGATÓRIO
    if (data.scope === 'org' && !data.responsible_area_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Área Responsável é obrigatória para KPIs Globais ativos",
        path: ["responsible_area_id"],
      });
    }
  }
  // v2.86.0: Fonte da meta obrigatória quando meta preenchida
  const hasValidTarget = data.target_value !== undefined && 
                         data.target_value !== null && 
                         !Number.isNaN(data.target_value);
  if (hasValidTarget && !data.target_source?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Fonte da meta é obrigatória quando há meta definida",
      path: ["target_source"],
    });
  }
});

type DbKpiFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly';

type FormValues = z.infer<typeof formSchema>;

interface CreateKpiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateKpiDialog({ open, onOpenChange }: CreateKpiDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { createKpi } = useKpiData();
  const { has: hasPermission, isLoading: isLoadingPermission, isWildcard } = usePermissions();
  const { currentBu } = useBu();
  
  // Dynamic scope labels with BU name
  const scopeLabels = getScopeLabels(currentBu?.name);
  
  // Governança: verificar permissões
  const canCreateIndicator = hasPermission("kpis.metric.create:bu") || hasPermission("kpis.settings.manage:bu");
  const canCreateKpi = hasPermission("kpis.settings.manage:bu");
  
  // v2.90.0: Apenas admins podem criar KPIs Globais e de Área
  const canCreateStrategicScopes = isWildcard || hasPermission("kpis.settings.manage:bu");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      unit: "%",
      direction: "up",
      frequency: "monthly",
      indicator_type: "metric",
      lifecycle_status: "proposed",
      target_source: "",
      recovery_protocol: "",
      area_id: undefined,
      scope: "team",
      responsible_area_id: undefined,
      responsible_team_id: undefined,
    },
  });

  const watchScope = form.watch("scope");
  const watchLifecycleStatus = form.watch("lifecycle_status");
  const watchTeamId = form.watch("team_id");
  const watchIndicatorType = form.watch("indicator_type");

  // Auto-inferência de área quando scope=team
  const { areaId: inferredAreaId, areaName: inferredAreaName, isLoading: isLoadingArea } = useTeamArea(
    watchScope === 'team' ? watchTeamId : undefined
  );

  // Atualizar area_id quando inferido
  useEffect(() => {
    if (watchScope === 'team' && inferredAreaId) {
      form.setValue("area_id", inferredAreaId);
    }
  }, [watchScope, inferredAreaId, form]);

  // Set default indicator type based on permission once loaded
  useEffect(() => {
    if (!isLoadingPermission && canCreateKpi) {
      form.setValue("indicator_type", "kpi");
    }
  }, [isLoadingPermission, canCreateKpi, form]);

  // Defense in Depth: block render if no permission
  if (!isLoadingPermission && !canCreateIndicator) {
    return null;
  }

  // Limpar campos quando mudar escopo
  const handleScopeChange = (newScope: KpiScope) => {
    form.setValue("scope", newScope);
    if (newScope !== "team") {
      form.setValue("team_id", undefined);
      form.setValue("area_id", undefined);
    }
    // Limpar responsible fields ao mudar escopo
    if (newScope !== "org") {
      form.setValue("responsible_area_id", undefined);
    }
    if (newScope === "team") {
      form.setValue("responsible_team_id", undefined);
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
    setIsSubmitting(true);
    try {
      // Determinar area_id final (inferido ou selecionado)
      const finalAreaId = values.scope === 'team' ? inferredAreaId : values.area_id;

      await createKpi.mutateAsync({
        name: values.name,
        description: values.description || null,
        unit: values.unit,
        direction: values.direction as KpiDirection,
        frequency: values.frequency as DbKpiFrequency,
        team_id: values.scope === 'team' ? values.team_id || null : null,
        owner_user_id: values.owner_user_id || null,
        target_value: values.target_value || null,
        status: "active",
        indicator_type: values.indicator_type as KpiIndicatorType,
        lifecycle_status: values.lifecycle_status as KpiLifecycleStatus,
        target_source: values.target_source || null,
        recovery_protocol: values.recovery_protocol || null,
        area_id: finalAreaId || null,
        scope: values.scope as KpiScope,
        // v2.90.0: operational responsibility
        responsible_area_id: values.responsible_area_id || null,
        responsible_team_id: values.responsible_team_id || null,
      });
      form.reset();
      setShowAdvanced(false);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Indicador</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Nome do Indicador</FormLabel>
                    {field.value && (
                      <VicActionButton
                        agentSlug="analista-kpis"
                        actionContext="kpi-create"
                        context={{
                          type: watchIndicatorType === 'kpi' ? 'KPI' : 'Métrica',
                          title: field.value,
                          description: form.watch("description") || undefined,
                          targetValue: form.watch("target_value") || undefined,
                          unit: form.watch("unit"),
                          additionalData: {
                            direction: form.watch("direction"),
                            frequency: form.watch("frequency"),
                            indicator_type: form.watch("indicator_type"),
                          },
                        }}
                        label="Validar"
                        compact
                      />
                    )}
                  </div>
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
                            <p><strong>KPI:</strong> Indicador-chave de performance vinculado a objetivos estratégicos.</p>
                            <p><strong>Métrica:</strong> Medição operacional usada para monitoramento contínuo.</p>
                            {!canCreateKpi && (
                              <p className="text-muted-foreground text-xs mt-2">
                                <Info className="h-3 w-3 inline mr-1" />
                                KPIs só podem ser criados por líderes ou admins.
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
                    {!canCreateKpi && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted p-3 rounded-md mt-2">
                        <Info className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>
                          <strong>KPIs</strong> são indicadores estratégicos e só podem ser criados por <strong>líderes de time</strong> ou <strong>administradores</strong>. 
                          Você pode criar <strong>Métricas</strong> para acompanhamento operacional.
                        </span>
                      </div>
                    )}
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
                            <p><strong>Proposto:</strong> Em análise, ainda não aprovado.</p>
                            <p><strong>Ativo:</strong> Em uso oficial (requer responsável).</p>
                            <p><strong>Em Observação:</strong> Sendo avaliado para possível descontinuação.</p>
                            <p><strong>Depreciado:</strong> Descontinuado, mantido apenas para histórico.</p>
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
                    <FormLabel>
                      Unidade
                    </FormLabel>
                    <FormControl>
                      <UnitSelect
                        value={field.value}
                        onChange={field.onChange}
                        showLabel={false}
                        showCustomOption={true}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Frequência
                      <HelpTooltip content="Periodicidade esperada de atualização do indicador. Influencia alertas de dados desatualizados." />
                    </FormLabel>
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
                name="direction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Direção
                      <HelpTooltip 
                        content={
                          <div className="space-y-1">
                            <p><strong>Maior é melhor:</strong> Valores acima da meta são positivos (ex: NPS, receita).</p>
                            <p><strong>Menor é melhor:</strong> Valores abaixo da meta são positivos (ex: churn, CAC).</p>
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
                            <p><strong>Time:</strong> Indicador específico de um time (área inferida automaticamente).</p>
                            <p><strong>Área:</strong> Indicador compartilhado por toda uma área.</p>
                            <p><strong>{currentBu?.name || 'Organização'}:</strong> Indicador global visível para toda a BU.</p>
                            {!canCreateStrategicScopes && (
                              <p className="text-muted-foreground text-xs mt-2">
                                <Lock className="h-3 w-3 inline mr-1" />
                                Escopos Área e Global requerem permissões de administrador.
                              </p>
                            )}
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
                          <SelectItem 
                            key={sc} 
                            value={sc}
                            disabled={(sc === 'org' || sc === 'area') && !canCreateStrategicScopes}
                          >
                            {scopeLabels[sc]}
                            {(sc === 'org' || sc === 'area') && !canCreateStrategicScopes && (
                              <Lock className="h-3 w-3 inline ml-1 text-muted-foreground" />
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Área: mostrar seletor apenas quando scope === 'area' */}
              {watchScope === 'area' ? (
                <FormField
                  control={form.control}
                  name="area_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Área {watchLifecycleStatus === 'active' && <span className="text-destructive">*</span>}
                        <HelpTooltip content="Domínio estratégico responsável por este indicador." />
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
                  <FormLabel>
                    Área (inferida)
                    <HelpTooltip content="A área é automaticamente inferida do time selecionado." />
                  </FormLabel>
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

            {/* v2.90.0: Seção de Responsabilidade Operacional para scope=org */}
            {watchScope === 'org' && (
              <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-info" />
                  <span className="text-sm font-medium">Responsabilidade Operacional</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Esta KPI é Global, mas quem responde por ela no dia a dia é:
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="responsible_area_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Área Responsável {watchLifecycleStatus === 'active' && <span className="text-destructive">*</span>}
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

                  <FormField
                    control={form.control}
                    name="responsible_team_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Time Responsável (opcional)
                        </FormLabel>
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
                </div>

                <InfoNotice variant="info">
                  KPIs Globais impactam toda a organização e requerem uma área 
                  operacionalmente responsável por acompanhar e agir em desvios.
                </InfoNotice>
              </div>
            )}

            {/* v2.90.0: Seção opcional de Responsabilidade para scope=area */}
            {watchScope === 'area' && (
              <FormField
                control={form.control}
                name="responsible_team_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Time Responsável (opcional)
                      <HelpTooltip content="Qual time é o principal responsável por acompanhar este indicador?" />
                    </FormLabel>
                    <FormControl>
                      <TeamSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Selecione..."
                        triggerClassName="w-full"
                      />
                    </FormControl>
                    <FormDescription>
                      Recomendado para delegar o acompanhamento operacional a um time específico.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
                      <HelpTooltip content="Pessoa accountable pela saúde deste indicador. Será notificada em caso de desvios." />
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
                      <FormLabel>
                        Protocolo de Recuperação (opcional)
                        <HelpTooltip content="Plano de ação pré-definido a ser executado quando o indicador entrar em status amarelo ou vermelho." />
                      </FormLabel>
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
              <Button type="submit" isLoading={isSubmitting} loadingText="Criando...">
                Criar Indicador
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
