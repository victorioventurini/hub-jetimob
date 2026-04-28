/**
 * EditKpiDialog — Hook que centraliza form state e reset behavior
 * Extraído de EditKpiDialog.tsx (refatoração P1.4)
 */
import { useCallback, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDialogFormReset } from '@/hooks/useDialogFormReset';
import type { KpiMetric, KpiScope } from '../../types';
import { editKpiSchema, type EditKpiFormValues } from './editKpiSchema';
import { legacyFrequencyToValue } from '../../utils/frequency';
import { useKpiPrimaryDataEntry } from '../../hooks/useKpiPrimaryDataEntry';

export function useEditKpiForm(kpi: KpiMetric | null, open: boolean) {
  const lastKpiIdRef = useRef<string | null>(null);

  const form = useForm<EditKpiFormValues>({
    resolver: zodResolver(editKpiSchema),
    defaultValues: {
      name: '',
      description: '',
      unit: '%',
      direction: 'up',
      consolidation_frequency: 'monthly',
      update_frequency: 'monthly',
      indicator_type: 'kpi',
      lifecycle_status: 'active',
      target_source: '',
      recovery_protocol: '',
      area_id: undefined,
      scope: 'team',
      responsible_area_id: undefined,
      responsible_team_id: undefined,
    },
  });

  // Hidrata "Atualizado por" a partir do contribuidor data_entry ativo
  const { data: primaryDataEntry } = useKpiPrimaryDataEntry(kpi?.id, open);

  const resetFormWithKpiData = useCallback(() => {
    if (!kpi) return;

    // v3.0.0: prefer new fields, fallback to legacy `frequency`
    const legacyMapped = legacyFrequencyToValue(kpi.frequency) ?? 'monthly';
    const consolidation = kpi.consolidation_frequency ?? legacyMapped;
    const update = kpi.update_frequency ?? consolidation;

    form.reset({
      name: kpi.name,
      description: kpi.description || '',
      unit: kpi.unit,
      direction: kpi.direction,
      consolidation_frequency: consolidation,
      update_frequency: update,
      team_id: kpi.team_id || undefined,
      owner_user_id: kpi.owner_user_id || undefined,
      target_value: kpi.target_value || undefined,
      indicator_type: kpi.indicator_type || 'kpi',
      lifecycle_status: kpi.lifecycle_status || 'active',
      target_source: kpi.target_source || '',
      recovery_protocol: kpi.recovery_protocol || '',
      area_id: kpi.area_id || undefined,
      scope: kpi.scope || 'team',
      responsible_area_id: kpi.responsible_area_id || undefined,
      responsible_team_id: kpi.responsible_team_id || undefined,
      updated_by_user_id:
        primaryDataEntry?.contributor_user_id ?? kpi.owner_user_id ?? undefined,
    });

    lastKpiIdRef.current = kpi.id;
  }, [kpi, form, primaryDataEntry]);

  // Canonical: only reset on closed→open transition
  useDialogFormReset(open, resetFormWithKpiData);

  // Also reset when switching KPI mid-dialog
  useEffect(() => {
    if (open && kpi && kpi.id !== lastKpiIdRef.current) {
      resetFormWithKpiData();
    }
  }, [open, kpi, resetFormWithKpiData]);

  // Quando a query do data_entry resolver depois do open inicial, atualiza só esse campo
  useEffect(() => {
    if (!open || !kpi) return;
    if (primaryDataEntry?.contributor_user_id) {
      const current = form.getValues('updated_by_user_id');
      if (!current) {
        form.setValue('updated_by_user_id', primaryDataEntry.contributor_user_id, {
          shouldDirty: false,
        });
      }
    }
  }, [open, kpi, primaryDataEntry, form]);

  // Deterministic scope change handler
  const handleScopeChange = useCallback(
    (newScope: KpiScope) => {
      form.setValue('scope', newScope, { shouldDirty: true });

      if (newScope !== 'team') {
        form.setValue('team_id', undefined, { shouldDirty: true });
      }

      if (newScope === 'team' || newScope === 'org') {
        form.setValue('area_id', undefined, { shouldDirty: true });
      }
    },
    [form],
  );

  return {
    form,
    handleScopeChange,
  };
}
