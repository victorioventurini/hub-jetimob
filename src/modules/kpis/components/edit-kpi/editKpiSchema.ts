/**
 * EditKpiDialog — Schema Zod e tipos derivados
 * Extraído de EditKpiDialog.tsx (refatoração P1.4)
 * v3.0.0 — Frequency split: consolidation_frequency × update_frequency.
 */
import { z } from 'zod';
import { isUpdateFrequencyValid } from '../../utils/frequency';

const FREQUENCY_VALUES = [
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'semiannual',
  'annual',
] as const;

export const editKpiSchema = z
  .object({
    name: z.string().min(1, 'Nome é obrigatório').max(100),
    description: z.string().max(500).optional(),
    unit: z.string().min(1, 'Unidade é obrigatória'),
    direction: z.enum(['up', 'down']),
    // v3.0.0: split into two cadences
    consolidation_frequency: z.enum(FREQUENCY_VALUES),
    update_frequency: z.enum(FREQUENCY_VALUES),
    team_id: z.string().optional(),
    owner_user_id: z.string().optional(),
    target_value: z.preprocess(
      (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
      z.number().optional(),
    ),
    indicator_type: z.enum(['kpi', 'metric']),
    lifecycle_status: z.enum(['proposed', 'active', 'observing', 'deprecated']),
    target_source: z.string().max(500).optional(),
    recovery_protocol: z.string().max(1000).optional(),
    area_id: z.string().optional(),
    scope: z.enum(['team', 'area', 'org']),
    responsible_area_id: z.string().optional(),
    responsible_team_id: z.string().optional(),
    /** v2.92.0 — usuário data_entry (1 por KPI). Persistido em kpi_data_contributors. */
    updated_by_user_id: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.scope === 'team' && !data.team_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Time é obrigatório para escopo 'Time'",
        path: ['team_id'],
      });
    }
    if (data.lifecycle_status === 'active') {
      if (!data.owner_user_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Responsável é obrigatório para indicadores ativos',
          path: ['owner_user_id'],
        });
      }
      if (data.scope === 'area' && !data.area_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Área é obrigatória para indicadores de escopo 'Área'",
          path: ['area_id'],
        });
      }
      if (data.scope === 'org' && !data.responsible_area_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Área Responsável é obrigatória para KPIs Globais ativos',
          path: ['responsible_area_id'],
        });
      }
    }
    const hasValidTarget =
      data.target_value !== undefined &&
      data.target_value !== null &&
      !Number.isNaN(data.target_value);
    if (hasValidTarget && !data.target_source?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Fonte da meta é obrigatória quando há meta definida',
        path: ['target_source'],
      });
    }
    // v3.0.0: update_frequency não pode ser menos frequente que consolidation_frequency
    if (!isUpdateFrequencyValid(data.consolidation_frequency, data.update_frequency)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Frequência de atualização não pode ser menos frequente que a de consolidação',
        path: ['update_frequency'],
      });
    }
  });

export type EditKpiFormValues = z.infer<typeof editKpiSchema>;
/** @deprecated v3.0.0 — campo legado preservado para escrita-espelho enquanto o banco ainda exige `frequency` NOT NULL. */
export type DbKpiFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly';
