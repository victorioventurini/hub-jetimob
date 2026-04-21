DELETE FROM public.ritual_cadences
WHERE wizard_type = 'managers-checkin';

UPDATE public.ritual_occurrences
SET status = 'cancelled',
    updated_at = now()
WHERE wizard_type = 'managers-checkin'
  AND status = 'scheduled';