-- View para teams com nome correto (colunas verificadas)
CREATE OR REPLACE VIEW public.v_teams_clean AS
SELECT 
  id,
  bu_id,
  name,
  description,
  leader_user_id AS leader_profile_id,  -- Renomeado
  parent_team_id,
  area_id,
  checkin_frequency,
  checkin_day,
  checkin_deadline_hour,
  member_count,
  status,
  created_at,
  updated_at,
  deleted_at
FROM public.teams;

COMMENT ON VIEW public.v_teams_clean IS 'View com nomes de coluna corretos. leader_profile_id = teams.leader_user_id';