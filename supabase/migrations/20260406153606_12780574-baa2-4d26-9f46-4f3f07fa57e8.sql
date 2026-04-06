
-- Mark duplicate completed sessions as abandoned, keeping only the most recent one per context
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY wizard_type, COALESCE(team_id, '00000000-0000-0000-0000-000000000000'), started_by, COALESCE(cycle_id, '00000000-0000-0000-0000-000000000000')
      ORDER BY completed_at DESC
    ) as rn
  FROM okr_wizard_sessions
  WHERE status = 'completed'
    AND completed_at IS NOT NULL
)
UPDATE okr_wizard_sessions
SET status = 'abandoned'
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
