/**
 * Schema canônico do formulário de "Registrar valor de KPI".
 *
 * SSOT compartilhado entre `AddKpiValueDialog` (modal /kpis) e ritos
 * (`CollaboratorKpiStep` etc.). Não duplicar este schema em outros formulários.
 *
 * Inclui o campo `input_type` (Consolidado | Parcial), obrigatório a partir
 * de v3.0.0 (vide TCR v3.30.0). Diferente de versões anteriores, NÃO existe
 * mais o campo `confidence` em KPIs — a confiabilidade do dado é inferida de
 * `input_type` (Consolidado/Parcial) + `source` (manual/api/...).
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
});

export type KpiValueEntryFormValues = z.infer<typeof kpiValueEntrySchema>;
