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
import { useKpiMutations } from "../hooks/useKpiMutations";
import {
  KpiCategory,
  KpiDirection,
  KpiFrequency,
  KpiIndicatorType,
  KpiLifecycleStatus,
  KpiScope,
  KpiMetric,
  CATEGORY_LABELS,
  FREQUENCY_LABELS,
  DIRECTION_LABELS,
  INDICATOR_TYPE_LABELS,
  LIFECYCLE_STATUS_LABELS,
  SCOPE_LABELS,
} from "../types";
import { usePermissions } from "@/hooks/usePermissions";
import { ChevronDown } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100),
  description: z.string().max(500).optional(),
  category: z.enum(["financeiro", "growth", "cs", "produto", "operacoes", "pessoas"]),
  unit: z.string().min(1, "Unidade é obrigatória"),
  direction: z.enum(["up", "down"]),
  frequency: z.enum(["daily", "weekly", "monthly", "quarterly"]),
  team_id: z.string().optional(),
  owner_user_id: z.string().optional(),
  target_value: z.coerce.number().optional(),
  // v2.1 fields
  indicator_type: z.enum(["kpi", "metric"]),
  lifecycle_status: z.enum(["proposed", "active", "observing", "deprecated"]),
  target_source: z.string().max(500).optional(),
  recovery_protocol: z.string().max(1000).optional(),
  // v2.2 governance fields
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
        message: "Responsável é obrigatório para KPIs ativos",
        path: ["owner_user_id"],
      });
    }
    if (!data.area_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Área é obrigatória para KPIs ativos",
        path: ["area_id"],
      });
    }
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
  const canManageKpis = hasPermission("kpis:manage");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "financeiro",
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

  // Reset form when KPI changes
  useEffect(() => {
    if (kpi && open) {
      form.reset({
        name: kpi.name,
        description: kpi.description || "",
        category: kpi.category,
        unit: kpi.unit,
        direction: kpi.direction,
        frequency: kpi.frequency === 'manual' ? 'monthly' : kpi.frequency as DbKpiFrequency,
        team_id: kpi.team_id || undefined,
        owner_user_id: kpi.owner_user_id || undefined,
        target_value: kpi.target_value || undefined,
        // v2.1 fields
        indicator_type: kpi.indicator_type || "kpi",
        lifecycle_status: kpi.lifecycle_status || "active",
        target_source: kpi.target_source || "",
        recovery_protocol: kpi.recovery_protocol || "",
        // v2.2 governance fields
        area_id: kpi.area_id || undefined,
        scope: kpi.scope || "team",
      });
      // Open advanced if there are values
      if (kpi.target_source || kpi.recovery_protocol) {
        setShowAdvanced(true);
      }
    }
  }, [kpi, open, form]);

  // Defense in Depth: block render if no permission
  if (!isLoadingPermission && !canManageKpis) {
    return null;
  }

  const handleScopeChange = (newScope: KpiScope) => {
    form.setValue("scope", newScope);
    if (newScope !== "team") {
      form.setValue("team_id", undefined);
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!kpi) return;
    
    setIsSubmitting(true);
    try {
      await updateKpi.mutateAsync({
        id: kpi.id,
        name: values.name,
        description: values.description || null,
        category: values.category as KpiCategory,
        unit: values.unit,
        direction: values.direction as KpiDirection,
        frequency: values.frequency as DbKpiFrequency,
        team_id: values.scope === 'team' ? values.team_id || null : null,
        owner_user_id: values.owner_user_id || null,
        target_value: values.target_value || null,
        // v2.1 fields
        indicator_type: values.indicator_type as KpiIndicatorType,
        lifecycle_status: values.lifecycle_status as KpiLifecycleStatus,
        target_source: values.target_source || null,
        recovery_protocol: values.recovery_protocol || null,
        // v2.2 governance fields
        area_id: values.area_id || null,
        scope: values.scope as KpiScope,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar KPI</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do KPI</FormLabel>
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
                      placeholder="Defina como esse KPI é calculado..."
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
                    <FormLabel>Tipo de Indicador</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(INDICATOR_TYPE_LABELS) as KpiIndicatorType[]).map((type) => (
                          <SelectItem key={type} value={type}>
                            {INDICATOR_TYPE_LABELS[type]}
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
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(CATEGORY_LABELS) as KpiCategory[]).map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {CATEGORY_LABELS[cat]}
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
                name="lifecycle_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status do Ciclo</FormLabel>
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

            <FormField
              control={form.control}
              name="target_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meta indicativa (opcional)</FormLabel>
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

            {/* v2.2 Governance: Escopo e Área */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="scope"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Escopo</FormLabel>
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

            {/* Campos avançados v2.1 em Collapsible */}
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
                      <FormLabel>Fonte da Meta (opcional)</FormLabel>
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
                      <FormLabel>Protocolo de Recuperação (opcional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descreva o plano de ação caso o KPI fique amarelo ou vermelho..."
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
