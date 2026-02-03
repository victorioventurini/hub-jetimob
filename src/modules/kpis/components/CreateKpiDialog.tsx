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
import { TeamSelect, BuUserSelect, AreaSelect } from "@/components/selects";
import { Badge } from "@/components/ui/badge";
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
  SCOPE_LABELS,
} from "../types";
import { VicActionButton } from "@/modules/vic";
import { usePermissions } from "@/hooks/usePermissions";
import { ChevronDown, Info } from "lucide-react";
import { HelpTooltip } from "@/components/ui/help-tooltip";

/**
 * v2.82.0 - Formulário de criação de Indicadores
 * 
 * Governança:
 * - KPIs: Apenas líderes/admins podem criar
 * - Métricas: Qualquer colaborador pode criar
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
    // Área obrigatória para ativos, mas é auto-inferida quando scope=team
    // Só valida se scope não é team (porque será inferido)
    if (data.scope !== 'team' && !data.area_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Área é obrigatória para indicadores ativos",
        path: ["area_id"],
      });
    }
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
  const { has: hasPermission, isLoading: isLoadingPermission } = usePermissions();
  
  // Governança: verificar permissões
  const canManageKpis = hasPermission("kpis:manage");
  const canCreateKpi = hasPermission("kpis.settings.manage:bu");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      unit: "%",
      direction: "up",
      frequency: "monthly",
      // Governance defaults - métricas são mais acessíveis
      indicator_type: "metric",
      lifecycle_status: "proposed",
      target_source: "",
      recovery_protocol: "",
      // Scope defaults
      area_id: undefined,
      scope: "team",
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
  if (!isLoadingPermission && !canManageKpis) {
    return null;
  }


  // Limpar team_id quando mudar escopo para area/org
  const handleScopeChange = (newScope: KpiScope) => {
    form.setValue("scope", newScope);
    if (newScope !== "team") {
      form.setValue("team_id", undefined);
      // Limpar área inferida quando mudar de scope
      form.setValue("area_id", undefined);
    }
  };

  // Governança: quando usuário sem permissão tenta selecionar KPI
  const handleIndicatorTypeChange = (type: KpiIndicatorType) => {
    if (type === 'kpi' && !canCreateKpi) {
      // Não permitir, manter como métrica
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
        // category removed v2.82.0
        unit: values.unit,
        direction: values.direction as KpiDirection,
        frequency: values.frequency as DbKpiFrequency,
        team_id: values.scope === 'team' ? values.team_id || null : null,
        owner_user_id: values.owner_user_id || null,
        target_value: values.target_value || null,
        status: "active",
        // Governance fields
        indicator_type: values.indicator_type as KpiIndicatorType,
        lifecycle_status: values.lifecycle_status as KpiLifecycleStatus,
        target_source: values.target_source || null,
        recovery_protocol: values.recovery_protocol || null,
        // Scope and ownership
        area_id: finalAreaId || null,
        scope: values.scope as KpiScope,
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
                      <HelpTooltip content="Formato de exibição do valor (%, R$, pontos, dias ou número absoluto)." />
                    </FormLabel>
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
                      Meta indicativa (opcional)
                      <HelpTooltip content="Valor de referência usado para calcular o status RAG (verde/amarelo/vermelho)." />
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
                            <p><strong>Organização:</strong> Indicador global visível para toda a BU.</p>
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
                        {(Object.keys(SCOPE_LABELS) as KpiScope[]).map((sc) => (
                          <SelectItem key={sc} value={sc}>
                            {SCOPE_LABELS[sc]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Área: mostrar seletor apenas quando scope !== team */}
              {watchScope !== 'team' ? (
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
              ) : (
                /* Quando scope=team, mostrar área inferida como badge read-only */
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
              )}
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
                  name="target_source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Fonte da Meta (opcional)
                        <HelpTooltip content="Registre a origem do target para auditoria (ex: OKR, benchmark de mercado, decisão do board)." />
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: OKR Q1 2026, Benchmark Setorial, Board Deck..."
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        URL ou referência de onde o target/benchmark foi definido
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
