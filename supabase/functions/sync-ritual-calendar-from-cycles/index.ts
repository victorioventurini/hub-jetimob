/**
 * Edge Function: sync-ritual-calendar-from-cycles
 *
 * Sincroniza cadências de ritos a partir dos ciclos de OKR da BU
 * e dispara regeneração de ocorrências (full rebuild por padrão).
 */

import { withMiddleware, logRequestCompletion } from '../_shared/middleware.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';

type RebuildMode = 'incremental' | 'full';

function dayOfMonth(dateStr: string): number {
  return Number(dateStr.split('-')[2] ?? '1');
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
      .select('id, bu_id, start_date, planning_date')
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

    const firstQuarterStart = quarterCycles[0].start_date;
    const firstPlanning = quarterCycles.find((c: any) => !!c.planning_date)?.planning_date ?? firstQuarterStart;
    const qbrPreDay = dayOfMonth(firstPlanning);

    const desiredCadences = [
      {
        wizard_type: 'mbr',
        frequency: 'monthly',
        month_week_ordinal: 1,
        day_of_week: 2,
        day_of_month: null,
        start_date: firstQuarterStart,
      },
      {
        wizard_type: 'mbr-pre',
        frequency: 'monthly',
        month_week_ordinal: 1,
        day_of_week: 2,
        day_of_month: null,
        start_date: firstQuarterStart,
      },
      {
        wizard_type: 'qbr-pre',
        frequency: 'quarterly',
        month_week_ordinal: null,
        day_of_week: null,
        day_of_month: qbrPreDay,
        start_date: firstPlanning,
      },
    ] as const;

    const { data: existingCadences } = await serviceClient
      .from('ritual_cadences')
      .select('id, wizard_type, team_id, responsible_profile_id')
      .eq('bu_id', buId)
      .in('wizard_type', ['mbr', 'mbr-pre', 'qbr-pre'])
      .is('team_id', null)
      .order('created_at', { ascending: true });

    const byType = new Map<string, any>((existingCadences ?? []).map((c: any) => [c.wizard_type, c]));

    const cadenceIds: string[] = [];
    for (const cadence of desiredCadences) {
      const existing = byType.get(cadence.wizard_type);

      if (existing) {
        const { error: updateErr } = await serviceClient
          .from('ritual_cadences')
          .update({
            frequency: cadence.frequency,
            month_week_ordinal: cadence.month_week_ordinal,
            day_of_week: cadence.day_of_week,
            day_of_month: cadence.day_of_month,
            start_date: cadence.start_date,
            end_date: null,
            is_active: true,
          })
          .eq('id', existing.id);

        if (updateErr) {
          return errorResponse('Failed to update cadence', 500, 'CADENCE_UPDATE_FAILED');
        }

        cadenceIds.push(existing.id);
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

        cadenceIds.push(created.id);
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
      `Synced ${cadenceIds.length} cadences with rebuild_mode=${rebuildMode}; generated=${generatedTotal}`
    );

    return successResponse({
      cadences_synced: cadenceIds.length,
      occurrences_generated: generatedTotal,
      rebuild_mode: rebuildMode,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logRequestCompletion(context, 'error', msg);
    return errorResponse('Internal error', 500, 'INTERNAL_ERROR');
  }
});
