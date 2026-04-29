/**
 * Edge Function: sync-ritual-calendar-from-cycles
 *
 * Sincroniza cadências de ritos a partir dos ciclos de OKR da BU
 * e dispara regeneração de ocorrências (full rebuild por padrão).
 */

import { withMiddleware, logRequestCompletion } from '../_shared/middleware.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';

type RebuildMode = 'incremental' | 'full';

type CadenceTemplate = {
  wizard_type: string;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
  month_week_ordinal: number | null;
  day_of_week: number | null;
  day_of_month: number | null;
  start_date: string;
  cycle_derived: boolean;
};

const ALL_WIZARD_TYPES = [
  'collaborator',
  'leader-prep',
  'team-checkin',
  // 'managers-checkin' removido — rito descontinuado.
  // 'clevel-checkin' removido — rito descontinuado.
  'team-okr-creation',
  'team-kr-creation',
  'mbr',
  'mbr-pre',
  // 'mbr-first' / 'mbr-pre-first' unificados em 'mbr'/'mbr-pre' com cadência mensal (1ª terça).
  'qbr-pre',
  'qbr-pre-clevel',
  'qbr-meeting',
  'qbr-post',
] as const;

function dayOfMonth(dateStr: string): number {
  return Number(dateStr.split('-')[2] ?? '1');
}

function clampDay(day: number): number {
  if (Number.isNaN(day)) return 1;
  return Math.min(28, Math.max(1, day));
}

Deno.serve(async (req) => {
  const mw = await withMiddleware(req, {
    requireAuth: true,
    requireBu: true,
    validateBuAccess: true,
  });

  if (!mw.success) return mw.error!;
  const { context } = mw;

  try {
    const body = await req.json().catch(() => ({}));
    const rebuildMode: RebuildMode = body.rebuild_mode === 'incremental' ? 'incremental' : 'full';
    const { serviceClient, buId } = context;

    const { data: quarterCycles, error: cycleErr } = await serviceClient
      .from('cycles')
      .select('id, bu_id, start_date, planning_date, review_date, review_date_first_month, retro_date')
      .eq('bu_id', buId)
      .eq('type', 'quarter')
      .order('start_date', { ascending: true });

    if (cycleErr) {
      return errorResponse('Failed to load cycles', 500, 'CYCLES_FETCH_FAILED');
    }

    if (!quarterCycles || quarterCycles.length === 0) {
      return successResponse({
        cadences_synced: 0,
        occurrences_generated: 0,
        message: 'Nenhum ciclo trimestral encontrado para sincronizar ritos',
      });
    }

    interface QuarterCycleRow {
      start_date: string;
      planning_date?: string | null;
      review_date?: string | null;
      review_date_first_month?: string | null;
      retro_date?: string | null;
    }
    const cycles = quarterCycles as QuarterCycleRow[];
    const firstQuarterStart = cycles[0].start_date;
    const firstPlanning = cycles.find((c) => !!c.planning_date)?.planning_date ?? firstQuarterStart;
    const firstReview = cycles.find((c) => !!c.review_date)?.review_date ?? firstQuarterStart;
    const firstReviewMonth1 = cycles.find((c) => !!c.review_date_first_month)?.review_date_first_month ?? firstReview;
    const firstRetro = cycles.find((c) => !!c.retro_date)?.retro_date ?? firstReview;

    const qbrPreDay = clampDay(dayOfMonth(firstPlanning));
    const mbrFirstDay = clampDay(dayOfMonth(firstReviewMonth1));
    const qbrMeetingDay = clampDay(dayOfMonth(firstReview));
    const qbrPostDay = clampDay(dayOfMonth(firstRetro));
    const mbrPreFirstDay = clampDay(mbrFirstDay - 2);
    const qbrPreClevelDay = clampDay(qbrPreDay + 3);

    const desiredCadences: CadenceTemplate[] = [
      {
        wizard_type: 'collaborator',
        frequency: 'weekly',
        month_week_ordinal: null,
        day_of_week: 5,
        day_of_month: null,
        start_date: firstQuarterStart,
        cycle_derived: false,
      },
      {
        wizard_type: 'leader-prep',
        frequency: 'weekly',
        month_week_ordinal: null,
        day_of_week: 1,
        day_of_month: null,
        start_date: firstQuarterStart,
        cycle_derived: false,
      },
      {
        wizard_type: 'team-checkin',
        frequency: 'weekly',
        month_week_ordinal: null,
        day_of_week: 1,
        day_of_month: null,
        start_date: firstQuarterStart,
        cycle_derived: false,
      },
      // managers-checkin removido — rito descontinuado (substituído pelo MBR).
      // clevel-checkin removido — rito descontinuado.
      {
        wizard_type: 'team-okr-creation',
        frequency: 'quarterly',
        month_week_ordinal: null,
        day_of_week: null,
        day_of_month: qbrPreDay,
        start_date: firstPlanning,
        cycle_derived: true,
      },
      {
        wizard_type: 'team-kr-creation',
        frequency: 'monthly',
        month_week_ordinal: 1,
        day_of_week: 2,
        day_of_month: null,
        start_date: firstQuarterStart,
        cycle_derived: false,
      },
      {
        wizard_type: 'mbr',
        frequency: 'monthly',
        month_week_ordinal: 1,
        day_of_week: 2,
        day_of_month: null,
        start_date: firstReviewMonth1,
        cycle_derived: true,
      },
      {
        wizard_type: 'mbr-pre',
        frequency: 'monthly',
        month_week_ordinal: 1,
        day_of_week: 2,
        day_of_month: null,
        start_date: firstReviewMonth1,
        cycle_derived: true,
      },
      // 'mbr-first' e 'mbr-pre-first' removidos — cadência unificada em 'mbr'/'mbr-pre'
      // (monthly, 1ª terça-feira). M1 e M2 do quarter recebem uma ocorrência cada;
      // M3 é bloqueado pela regra QBR (today >= planning_date) no frontend.
      {
        wizard_type: 'qbr-pre',
        frequency: 'quarterly',
        month_week_ordinal: null,
        day_of_week: null,
        day_of_month: qbrPreDay,
        start_date: firstPlanning,
        cycle_derived: true,
      },
      {
        wizard_type: 'qbr-pre-clevel',
        frequency: 'quarterly',
        month_week_ordinal: null,
        day_of_week: null,
        day_of_month: qbrPreClevelDay,
        start_date: firstPlanning,
        cycle_derived: true,
      },
      {
        wizard_type: 'qbr-meeting',
        frequency: 'quarterly',
        month_week_ordinal: null,
        day_of_week: null,
        day_of_month: qbrMeetingDay,
        start_date: firstReview,
        cycle_derived: true,
      },
      {
        wizard_type: 'qbr-post',
        frequency: 'quarterly',
        month_week_ordinal: null,
        day_of_week: null,
        day_of_month: qbrPostDay,
        start_date: firstRetro,
        cycle_derived: true,
      },
    ];

    const templateByType = new Map<string, CadenceTemplate>(
      desiredCadences.map((cadence) => [cadence.wizard_type, cadence])
    );

    const { data: existingCadences } = await serviceClient
      .from('ritual_cadences')
      .select('id, wizard_type, team_id, responsible_profile_id, frequency, month_week_ordinal, day_of_week, day_of_month, start_date, is_active')
      .eq('bu_id', buId)
      .in('wizard_type', [...ALL_WIZARD_TYPES])
      .is('team_id', null)
      .order('created_at', { ascending: true });

    interface ExistingCadenceRow {
      id: string;
      wizard_type: string;
      team_id: string | null;
      responsible_profile_id: string | null;
      frequency: string;
      month_week_ordinal: number | null;
      day_of_week: number | null;
      day_of_month: number | null;
      start_date: string;
      is_active: boolean;
    }
    const byType = new Map<string, ExistingCadenceRow>(
      ((existingCadences ?? []) as ExistingCadenceRow[]).map((c) => [c.wizard_type, c])
    );

    const cadenceIds = new Set<string>();
    const createdWizardTypes: string[] = [];
    const reactivatedWizardTypes: string[] = [];
    const updatedWizardTypes: string[] = [];

    for (const cadence of desiredCadences) {
      const existing = byType.get(cadence.wizard_type);

      if (existing) {
        const shouldApplyTemplate = cadence.cycle_derived;
        const nextValues = shouldApplyTemplate
          ? {
              frequency: cadence.frequency,
              month_week_ordinal: cadence.month_week_ordinal,
              day_of_week: cadence.day_of_week,
              day_of_month: cadence.day_of_month,
              start_date: cadence.start_date,
            }
          : {
              frequency: existing.frequency,
              month_week_ordinal: existing.month_week_ordinal,
              day_of_week: existing.day_of_week,
              day_of_month: existing.day_of_month,
              start_date: existing.start_date,
            };

        const changed =
          existing.frequency !== nextValues.frequency ||
          existing.month_week_ordinal !== nextValues.month_week_ordinal ||
          existing.day_of_week !== nextValues.day_of_week ||
          existing.day_of_month !== nextValues.day_of_month ||
          existing.start_date !== nextValues.start_date ||
          existing.is_active !== true;

        if (changed) {
        const { error: updateErr } = await serviceClient
          .from('ritual_cadences')
          .update({
            frequency: nextValues.frequency,
            month_week_ordinal: nextValues.month_week_ordinal,
            day_of_week: nextValues.day_of_week,
            day_of_month: nextValues.day_of_month,
            start_date: nextValues.start_date,
            end_date: null,
            is_active: true,
          })
          .eq('id', existing.id);

        if (updateErr) {
          return errorResponse('Failed to update cadence', 500, 'CADENCE_UPDATE_FAILED');
        }

          if (!existing.is_active) {
            reactivatedWizardTypes.push(cadence.wizard_type);
          } else {
            updatedWizardTypes.push(cadence.wizard_type);
          }
        }

        cadenceIds.add(existing.id);
      } else {
        const { data: created, error: insertErr } = await serviceClient
          .from('ritual_cadences')
          .insert({
            bu_id: buId,
            wizard_type: cadence.wizard_type,
            team_id: null,
            frequency: cadence.frequency,
            month_week_ordinal: cadence.month_week_ordinal,
            day_of_week: cadence.day_of_week,
            day_of_month: cadence.day_of_month,
            start_date: cadence.start_date,
            end_date: null,
            is_active: true,
          })
          .select('id')
          .single();

        if (insertErr || !created?.id) {
          return errorResponse('Failed to create cadence', 500, 'CADENCE_INSERT_FAILED');
        }

        cadenceIds.add(created.id);
        createdWizardTypes.push(cadence.wizard_type);
      }
    }

    const { data: verifiedCadences } = await serviceClient
      .from('ritual_cadences')
      .select('id, wizard_type')
      .eq('bu_id', buId)
      .in('wizard_type', [...ALL_WIZARD_TYPES])
      .is('team_id', null);

    const verifiedByType = new Map<string, string>(
      ((verifiedCadences ?? []) as Array<{ wizard_type: string; id: string }>).map((c) => [c.wizard_type, c.id])
    );
    const missingAfterUpsert = ALL_WIZARD_TYPES.filter((type) => !verifiedByType.has(type));

    if (missingAfterUpsert.length > 0) {
      for (const wizardType of missingAfterUpsert) {
        const template = templateByType.get(wizardType);
        if (!template) continue;

        const { data: created, error: insertErr } = await serviceClient
          .from('ritual_cadences')
          .insert({
            bu_id: buId,
            wizard_type: template.wizard_type,
            team_id: null,
            frequency: template.frequency,
            month_week_ordinal: template.month_week_ordinal,
            day_of_week: template.day_of_week,
            day_of_month: template.day_of_month,
            start_date: template.start_date,
            end_date: null,
            is_active: true,
          })
          .select('id')
          .single();

        if (insertErr || !created?.id) {
          return errorResponse('Failed to heal missing cadence', 500, 'CADENCE_HEAL_FAILED');
        }

        cadenceIds.add(created.id);
        createdWizardTypes.push(template.wizard_type);
      }
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization') ?? '';

    let generatedTotal = 0;
    for (const cadenceId of cadenceIds) {
      const res = await fetch(`${supabaseUrl}/functions/v1/generate-ritual-occurrences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
          apikey: anonKey,
        },
        body: JSON.stringify({
          cadence_id: cadenceId,
          bu_id: buId,
          rebuild_mode: rebuildMode,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload?.success === false) {
        return errorResponse('Failed to rebuild ritual occurrences', 500, 'OCCURRENCE_REBUILD_FAILED');
      }

      generatedTotal += Number(payload?.data?.generated ?? 0);
    }

    logRequestCompletion(
      context,
      'success',
      `Synced ${cadenceIds.size} cadences with rebuild_mode=${rebuildMode}; generated=${generatedTotal}`
    );

    return successResponse({
      cadences_synced: cadenceIds.size,
      occurrences_generated: generatedTotal,
      rebuild_mode: rebuildMode,
      created_wizard_types: createdWizardTypes,
      reactivated_wizard_types: reactivatedWizardTypes,
      updated_wizard_types: updatedWizardTypes,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logRequestCompletion(context, 'error', msg);
    return errorResponse('Internal error', 500, 'INTERNAL_ERROR');
  }
});
