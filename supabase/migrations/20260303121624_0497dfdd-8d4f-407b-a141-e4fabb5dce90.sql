-- Reset summary_sent_at para re-testar a sessão mais recente
UPDATE okr_wizard_sessions
SET summary_sent_at = NULL
WHERE id = 'e61c5e45-8037-4a94-934b-eef19dda4ead';