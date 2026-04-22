/**
 * EditKpiDialog — Hook que centraliza form state e reset behavior
 * Extraído de EditKpiDialog.tsx (refatoração P1.4)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDialogFormReset } from '@/hooks/useDialogFormReset';
import type { KpiMetric, KpiScope } from '../../types';
import { editKpiSchema, type EditKpiFormValues, type DbKpiFrequency } from './editKpiSchema';

export function useEditKpiForm(kpi: KpiMetric | null, open: boolean) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const lastKpiIdRef = useRef<string | null>(null);

  const form = useForm<EditKpiFormValues>({
    resolver: zodResolver(editKpiSchema),
    defaultValues: {
      name: '',
      description: '',
      unit: '%',
      direction: 'up',
      frequency: 'monthly',
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

  const resetFormWithKpiData = useCallback(() => {
    if (!kpi) return;

    form.reset({
      name: kpi.name,
      description: kpi.description || '',
      unit: kpi.unit,
      direction: kpi.direction,
      frequency:
        kpi.frequency === 'manual' ? 'monthly' : (kpi.frequency as DbKpiFrequency),
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
    });

    if (kpi.target_source || kpi.recovery_protocol) {
      setShowAdvanced(true);
    }

    lastKpiIdRef.current = kpi.id;
  }, [kpi, form]);

  // Canonical: only reset on closed→open transition
  useDialogFormReset(open, resetFormWithKpiData);

  // Also reset when switching KPI mid-dialog
  useEffect(() => {
    if (open && kpi && kpi.id !== lastKpiIdRef.current) {
      resetFormWithKpiData();
    }
  }, [open, kpi, resetFormWithKpiData]);

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
    showAdvanced,
    setShowAdvanced,
    handleScopeChange,
  };
}
