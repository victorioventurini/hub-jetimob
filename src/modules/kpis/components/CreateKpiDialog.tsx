import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Lock } from "lucide-react";
import { useKpiData } from "../hooks";
import { useCanCreateKpi } from "../hooks/useCanCreateKpi";
import { useUpsertKpiPrimaryDataEntry } from "../hooks/useKpiPrimaryDataEntry";
import { useTeamArea } from "../hooks/useTeamArea";
import {
  type KpiDirection,
  type KpiIndicatorType,
  type KpiLifecycleStatus,
  type KpiScope,
  getScopeLabels,
} from "../types";
import { useBu } from "@/contexts/BuContext";
import { usePermissions } from "@/hooks/usePermissions";
import {
  createKpiFormSchema,
  DEFAULT_CREATE_KPI_VALUES,
  type CreateKpiFormValues,
} from "./create-kpi/schema";
import { IdentitySection } from "./create-kpi/sections/IdentitySection";
import { TypeStatusSection } from "./create-kpi/sections/TypeStatusSection";
import { UnitFrequencySection } from "./create-kpi/sections/UnitFrequencySection";
import { DirectionTargetSection } from "./create-kpi/sections/DirectionTargetSection";
import { ScopeAreaSection } from "./create-kpi/sections/ScopeAreaSection";
import { OwnershipSection } from "./create-kpi/sections/OwnershipSection";
import { AdvancedSection } from "./create-kpi/sections/AdvancedSection";

/**
 * v2.90.0 - Formulário de criação de Indicadores
 * Refatorado em 2026-05-04: lógica e schema extraídos para create-kpi/*.
 */
interface CreateKpiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateKpiDialog({ open, onOpenChange }: CreateKpiDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { createKpi } = useKpiData();
  const upsertDataEntry = useUpsertKpiPrimaryDataEntry();
  const { has: hasPermission, isLoading: isLoadingPermission, isWildcard } =
    usePermissions();
  const { currentBu } = useBu();

  const scopeLabels = getScopeLabels(currentBu?.name);
  const canCreateIndicator =
    hasPermission("kpis.metric.create:bu") || hasPermission("kpis.settings.manage:bu");
  const canCreateKpi = hasPermission("kpis.settings.manage:bu");
  const canCreateStrategicScopes =
    isWildcard || hasPermission("kpis.settings.manage:bu");

  const form = useForm<CreateKpiFormValues>({
    resolver: zodResolver(createKpiFormSchema),
    defaultValues: DEFAULT_CREATE_KPI_VALUES as CreateKpiFormValues,
  });

  const watchScope = form.watch("scope");
  const watchLifecycleStatus = form.watch("lifecycle_status");
  const watchTeamId = form.watch("team_id");
  const watchAreaId = form.watch("area_id");
  const watchIndicatorType = form.watch("indicator_type");

  const { canCreate: canCreateForCurrentForm, blockedReason } = useCanCreateKpi({
    scope: watchScope,
    areaId: watchAreaId ?? null,
    teamId: watchTeamId ?? null,
    indicatorType: watchIndicatorType,
  });

  const {
    areaId: inferredAreaId,
    areaName: inferredAreaName,
    isLoading: isLoadingArea,
  } = useTeamArea(watchScope === "team" ? watchTeamId : undefined);

  useEffect(() => {
    if (watchScope === "team" && inferredAreaId) {
      form.setValue("area_id", inferredAreaId);
    }
  }, [watchScope, inferredAreaId, form]);

  useEffect(() => {
    if (!isLoadingPermission && canCreateKpi) {
      form.setValue("indicator_type", "kpi");
    }
  }, [isLoadingPermission, canCreateKpi, form]);

  useEffect(() => {
    if (watchIndicatorType === "metric" && watchScope !== "team") {
      form.setValue("scope", "team");
    }
  }, [watchIndicatorType, watchScope, form]);

  if (!isLoadingPermission && !canCreateIndicator) {
    return null;
  }

  const handleScopeChange = (newScope: KpiScope) => {
    if (watchIndicatorType === "metric" && newScope !== "team") return;
    form.setValue("scope", newScope);
    if (newScope !== "team") {
      form.setValue("team_id", undefined);
      form.setValue("area_id", undefined);
    }
    if (newScope !== "org") {
      form.setValue("responsible_area_id", undefined);
    }
    if (newScope === "team") {
      form.setValue("responsible_team_id", undefined);
    }
  };

  const handleIndicatorTypeChange = (type: KpiIndicatorType) => {
    if (type === "kpi" && !canCreateKpi) return;
    form.setValue("indicator_type", type);
    if (type === "metric") {
      form.setValue("scope", "team");
    }
  };

  const onSubmit = async (values: CreateKpiFormValues) => {
    setIsSubmitting(true);
    try {
      const finalAreaId =
        values.scope === "team" ? inferredAreaId : values.area_id;

      const legacyMirror = (
        ["daily", "weekly", "monthly", "quarterly"] as const
      ).includes(values.consolidation_frequency as never)
        ? (values.consolidation_frequency as
            | "daily"
            | "weekly"
            | "monthly"
            | "quarterly")
        : "monthly";

      const created = await createKpi.mutateAsync({
        name: values.name,
        description: values.description || null,
        unit: values.unit,
        direction: values.direction as KpiDirection,
        frequency: legacyMirror,
        consolidation_frequency: values.consolidation_frequency,
        update_frequency: values.update_frequency,
        frequency_migration_reviewed: true,
        team_id: values.scope === "team" ? values.team_id || null : null,
        owner_user_id: values.owner_user_id || null,
        target_value: values.target_value || null,
        status: "active",
        indicator_type: values.indicator_type as KpiIndicatorType,
        lifecycle_status: values.lifecycle_status as KpiLifecycleStatus,
        target_source: values.target_source || null,
        recovery_protocol: values.recovery_protocol || null,
        area_id: finalAreaId || null,
        scope: values.scope as KpiScope,
        responsible_area_id: values.responsible_area_id || null,
        responsible_team_id: values.responsible_team_id || null,
      });

      const newKpiId = (created as { id?: string } | null)?.id;
      if (newKpiId && values.updated_by_user_id) {
        try {
          await upsertDataEntry.mutateAsync({
            kpiId: newKpiId,
            userId: values.updated_by_user_id,
          });
        } catch (err) {
          console.error('[CreateKpiDialog] Falha ao registrar "Atualizado por":', err);
        }
      }

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
            <IdentitySection form={form} />
            <TypeStatusSection
              form={form}
              canCreateKpi={canCreateKpi}
              onIndicatorTypeChange={handleIndicatorTypeChange}
            />
            <UnitFrequencySection form={form} />
            <DirectionTargetSection form={form} />
            <ScopeAreaSection
              form={form}
              scopeLabels={scopeLabels}
              buName={currentBu?.name}
              canCreateStrategicScopes={canCreateStrategicScopes}
              watchIndicatorType={watchIndicatorType}
              watchScope={watchScope}
              watchLifecycleStatus={watchLifecycleStatus}
              watchTeamId={watchTeamId}
              inferredAreaName={inferredAreaName}
              isLoadingArea={isLoadingArea}
              onScopeChange={handleScopeChange}
            />
            <OwnershipSection
              form={form}
              watchScope={watchScope}
              watchLifecycleStatus={watchLifecycleStatus}
            />
            <AdvancedSection
              form={form}
              open={showAdvanced}
              onOpenChange={setShowAdvanced}
            />

            <DialogFooter className="flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
              {!canCreateForCurrentForm && blockedReason && (
                <p className="text-xs text-muted-foreground sm:mr-auto sm:text-left">
                  <Lock className="h-3 w-3 inline mr-1" />
                  {blockedReason}
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                isLoading={isSubmitting}
                loadingText="Criando..."
                disabled={!canCreateForCurrentForm}
                title={!canCreateForCurrentForm ? blockedReason ?? undefined : undefined}
              >
                Criar Indicador
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
