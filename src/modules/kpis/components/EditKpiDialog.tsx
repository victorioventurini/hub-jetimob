import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { useKpiMutations } from '../hooks/useKpiMutations';
import { useUpsertKpiPrimaryDataEntry } from '../hooks/useKpiPrimaryDataEntry';
import { useTeamArea } from '../hooks/useTeamArea';
import { useCanChangeKpiScope } from '../hooks/useCanChangeKpiScope';
import {
  getScopeLabels,
  type KpiDirection,
  type KpiIndicatorType,
  type KpiLifecycleStatus,
  type KpiMetric,
  type KpiScope,
} from '../types';
import { useBu } from '@/contexts/BuContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useEditKpiForm } from './edit-kpi/useEditKpiForm';
import type { EditKpiFormValues } from './edit-kpi/editKpiSchema';
import { EditKpiBasicFields } from './edit-kpi/EditKpiBasicFields';
import { EditKpiScopeSection } from './edit-kpi/EditKpiScopeSection';
import { EditKpiOwnershipSection } from './edit-kpi/EditKpiOwnershipSection';

/**
 * v2.82.0 - Formulário de edição de Indicadores
 *
 * Governança:
 * - KPIs: Apenas líderes/admins podem editar tipo
 * - Métricas: Qualquer colaborador pode editar
 *
 * Auto-inferência:
 * - Quando scope=team, a área é inferida automaticamente do time
 *
 * Modularização P1.4: lógica isolada em src/modules/kpis/components/edit-kpi/
 */

interface EditKpiDialogProps {
  kpi: KpiMetric | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditKpiDialog({ kpi, open, onOpenChange }: EditKpiDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { updateKpi } = useKpiMutations();
  const upsertDataEntry = useUpsertKpiPrimaryDataEntry();
  const { has: hasPermission, isLoading: isLoadingPermission } = usePermissions();
  const { currentBu } = useBu();

  // v2.91.0: Scope change permissions
  const scopePermissions = useCanChangeKpiScope(kpi);
  const scopeLabels = getScopeLabels(currentBu?.name);

  const canEditIndicator =
    hasPermission('kpis.metric.update:self_or_owner') ||
    hasPermission('kpis.settings.manage:bu');
  const canCreateKpi = hasPermission('kpis.settings.manage:bu');

  const { form, handleScopeChange } = useEditKpiForm(kpi, open);

  const watchScope = form.watch('scope');
  const watchTeamId = form.watch('team_id');

  // Auto-inferência de área quando scope=team
  const {
    areaId: inferredAreaId,
    areaName: inferredAreaName,
    isLoading: isLoadingArea,
  } = useTeamArea(watchScope === 'team' ? watchTeamId : undefined);

  // Atualizar area_id quando inferido (e não há área já definida)
  if (watchScope === 'team' && inferredAreaId && !form.getValues('area_id')) {
    form.setValue('area_id', inferredAreaId);
  }

  // Defense in Depth: block render if no permission
  if (!isLoadingPermission && !canEditIndicator) {
    return null;
  }

  const onSubmit = async (values: EditKpiFormValues) => {
    if (!kpi) return;

    const finalAreaId = values.scope === 'team' ? inferredAreaId : values.area_id;

    setIsSubmitting(true);
    try {
      // v3.0.0: persistir os dois campos novos. `frequency` legado (NOT NULL no DB)
      // é mantido como espelho de consolidation_frequency até remoção física futura.
      const legacyFrequencyMirror = (
        ['daily', 'weekly', 'monthly', 'quarterly'] as const
      ).includes(values.consolidation_frequency as never)
        ? (values.consolidation_frequency as 'daily' | 'weekly' | 'monthly' | 'quarterly')
        : 'monthly';

      await updateKpi.mutateAsync({
        id: kpi.id,
        name: values.name,
        description: values.description || null,
        category: kpi.category || 'operacoes', // DEPRECATED
        unit: values.unit,
        direction: values.direction as KpiDirection,
        frequency: legacyFrequencyMirror,
        // v3.0.0 split + flag de revisão
        consolidation_frequency: values.consolidation_frequency,
        update_frequency: values.update_frequency,
        frequency_migration_reviewed: true,
        team_id: values.scope === 'team' ? values.team_id || null : null,
        owner_user_id: values.owner_user_id || null,
        target_value: values.target_value || null,
        indicator_type: values.indicator_type as KpiIndicatorType,
        lifecycle_status: values.lifecycle_status as KpiLifecycleStatus,
        target_source: values.target_source || null,
        recovery_protocol: values.recovery_protocol || null,
        area_id: finalAreaId || null,
        scope: values.scope as KpiScope,
        responsible_area_id: values.responsible_area_id || null,
        responsible_team_id: values.responsible_team_id || null,
      });

      // Sincroniza "Atualizado por" (data_entry contributor)
      try {
        await upsertDataEntry.mutateAsync({
          kpiId: kpi.id,
          userId: values.updated_by_user_id ?? null,
        });
      } catch (err) {
        console.error('[EditKpiDialog] Falha ao sincronizar "Atualizado por":', err);
      }

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
            <EditKpiBasicFields form={form} canCreateKpi={canCreateKpi} />

            <EditKpiScopeSection
              form={form}
              kpi={kpi}
              scopeLabels={scopeLabels}
              scopePermissions={scopePermissions}
              onScopeChange={handleScopeChange}
              inferredAreaName={inferredAreaName}
              isLoadingArea={isLoadingArea}
            />

            <EditKpiOwnershipSection
              form={form}
              allowedTeamIds={scopePermissions.allowedTeamIds}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
