/**
 * EditKpiDialog — Schema Zod e tipos derivados
 * Extraído de EditKpiDialog.tsx (refatoração P1.4)
 */
import { z } from 'zod';

export const editKpiSchema = z
  .object({
    name: z.string().min(1, 'Nome é obrigatório').max(100),
    description: z.string().max(500).optional(),
    unit: z.string().min(1, 'Unidade é obrigatória'),
    direction: z.enum(['up', 'down']),
    frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly']),
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
  });

export type EditKpiFormValues = z.infer<typeof editKpiSchema>;
export type DbKpiFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly';
