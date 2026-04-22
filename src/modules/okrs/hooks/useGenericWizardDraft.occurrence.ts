/**
 * useGenericWizardDraft — Auto-associação com ritual_occurrences
 *
 * Extraído do hook monolítico (refatoração P1). Lógica isolada
 * para facilitar teste e leitura.
 */

import type { WizardPersona } from '@/modules/okrs/types/wizard';

const OCCURRENCE_WINDOW_DAYS: Record<string, number> = {
  weekly: 7,
  biweekly: 10,
  monthly: 15,
  quarterly: 30,
  semester: 45,
};

export async function associateCompletedSessionToOccurrence({
  supabase,
  sessionId,
  wizardType,
  buId,
  teamId,
  completionDateIso,
}: {
  supabase: any;
  sessionId: string;
  wizardType: WizardPersona;
  buId: string;
  teamId: string | null;
  completionDateIso: string;
}): Promise<void> {
  try {
    const completionDate = new Date(completionDateIso);
    const completionDateStr = completionDate.toISOString().split('T')[0];

    const fetchCadence = async () => {
      if (teamId) {
        const { data: teamCadence } = await supabase
          .from('ritual_cadences')
          .select('frequency')
          .eq('wizard_type', wizardType)
          .eq('bu_id', buId)
          .eq('is_active', true)
          .eq('team_id', teamId)
          .limit(1)
          .maybeSingle();

        if (teamCadence) return teamCadence;
      }

      const { data: globalCadence } = await supabase
        .from('ritual_cadences')
        .select('frequency')
        .eq('wizard_type', wizardType)
        .eq('bu_id', buId)
        .eq('is_active', true)
        .is('team_id', null)
        .limit(1)
        .maybeSingle();

      return globalCadence;
    };

    const cadence = await fetchCadence();
    const windowDays = OCCURRENCE_WINDOW_DAYS[cadence?.frequency ?? ''] ?? 7;

    const windowStart = new Date(completionDate);
    windowStart.setDate(windowStart.getDate() - windowDays);
    const windowEnd = new Date(completionDate);
    windowEnd.setDate(windowEnd.getDate() + windowDays);

    const windowStartStr = windowStart.toISOString().split('T')[0];
    const windowEndStr = windowEnd.toISOString().split('T')[0];

    const buildOccurrenceQuery = (scope: 'team' | 'global') => {
      let query = supabase
        .from('ritual_occurrences')
        .select('id, planned_date')
        .eq('wizard_type', wizardType)
        .eq('bu_id', buId)
        .in('status', ['scheduled', 'missed'])
        .is('session_id', null)
        .gte('planned_date', windowStartStr)
        .lte('planned_date', windowEndStr)
        .order('planned_date', { ascending: true })
        .limit(1);

      if (scope === 'team' && teamId) {
        query = query.eq('team_id', teamId);
      } else {
        query = query.is('team_id', null);
      }

      return query;
    };

    let occurrence: { id: string; planned_date: string } | null = null;

    if (teamId) {
      const { data: teamOccurrence } = await buildOccurrenceQuery('team').maybeSingle();
      occurrence = teamOccurrence;

      if (!occurrence) {
        const { data: globalOccurrence } = await buildOccurrenceQuery('global').maybeSingle();
        occurrence = globalOccurrence;
      }
    } else {
      const { data: globalOccurrence } = await buildOccurrenceQuery('global').maybeSingle();
      occurrence = globalOccurrence;
    }

    if (!occurrence) return;

    const isLate = completionDateStr > occurrence.planned_date;

    await supabase
      .from('ritual_occurrences')
      .update({
        session_id: sessionId,
        actual_date: completionDateStr,
        status: isLate ? 'completed_late' : 'completed_on_time',
      })
      .eq('id', occurrence.id);
  } catch (err) {
    console.warn('[useGenericWizardDraft] Auto-association with ritual occurrence failed:', err);
  }
}
