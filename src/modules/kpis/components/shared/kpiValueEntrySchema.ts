/**
 * Schema canônico do formulário de "Registrar valor de KPI".
 *
 * SSOT compartilhado entre `AddKpiValueDialog` (modal /kpis) e ritos
 * (`CollaboratorKpiStep` etc.). Não duplicar este schema em outros formulários.
 *
 * Inclui o campo `input_type` (Consolidado | Parcial), obrigatório a partir
 * de v3.0.0 (vide TCR v3.29.1). O trigger DB `trg_kpi_value_derive_confidence`
 * usa `input_type` para derivar a `confidence` default — por isso o valor
 * SEMPRE deve ser enviado no insert em `kpi_values`.
 */
import { z } from 'zod';
import { startOfDay, isBefore } from 'date-fns';
import { validation } from '@/lib/validationMessages';

export const kpiValueEntrySchema = z.object({
  value: z.coerce.number({ required_error: validation.required('Valor') }),
  reference_date: z
    .string()
    .min(1, validation.required('Data de referência'))
    .refine(
      (date) => {
        const selected = startOfDay(new Date(date));
        const today = startOfDay(new Date());
        return isBefore(selected, today);
      },
      { message: validation.consolidatedDate('Data de referência') },
    ),
  input_type: z.enum(['consolidated', 'partial']),
  notes: z.string().max(500).optional(),
  override_confidence: z.boolean().optional(),
  confidence: z.enum(['high', 'medium', 'low']).optional(),
});

export type KpiValueEntryFormValues = z.infer<typeof kpiValueEntrySchema>;
