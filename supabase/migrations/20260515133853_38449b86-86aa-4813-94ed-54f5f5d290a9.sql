DELETE FROM public.assessment_answers WHERE run_id = '63cd3f0d-ad03-49d0-b636-cf0cf3e9c8af';
DELETE FROM public.assessment_runs WHERE id = '63cd3f0d-ad03-49d0-b636-cf0cf3e9c8af';
UPDATE public.assessment_invites SET status = 'pending', started_at = NULL, submitted_at = NULL WHERE id IN (SELECT invite_id FROM public.assessment_runs WHERE id = '63cd3f0d-ad03-49d0-b636-cf0cf3e9c8af');