-- P2: Add performance index on okr_checkins(team_id)
-- Accelerates team-scoped checkin lookups in cycle dashboard queries

CREATE INDEX IF NOT EXISTS idx_okr_checkins_team_id
  ON public.okr_checkins (team_id);
