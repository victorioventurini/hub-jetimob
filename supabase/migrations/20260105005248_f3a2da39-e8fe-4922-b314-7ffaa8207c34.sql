-- Add check-in ritual configuration to teams table
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS checkin_frequency text NOT NULL DEFAULT 'weekly' CHECK (checkin_frequency IN ('weekly', 'biweekly')),
ADD COLUMN IF NOT EXISTS checkin_day integer NOT NULL DEFAULT 1 CHECK (checkin_day >= 0 AND checkin_day <= 6),
ADD COLUMN IF NOT EXISTS checkin_deadline_hour integer NOT NULL DEFAULT 18 CHECK (checkin_deadline_hour >= 0 AND checkin_deadline_hour <= 23);

-- Add last_checkin_at to team key results for tracking
ALTER TABLE public.okr_team_key_results
ADD COLUMN IF NOT EXISTS last_checkin_at timestamp with time zone;

-- Create a view for pending check-ins (KRs that need updates)
CREATE OR REPLACE VIEW public.v_pending_checkins AS
SELECT 
  kr.id as kr_id,
  kr.title as kr_title,
  kr.owner_user_id,
  kr.co_responsibles,
  kr.team_id,
  kr.current_value,
  kr.target,
  kr.baseline,
  kr.direction,
  kr.unit,
  kr.status,
  kr.last_checkin_at,
  t.name as team_name,
  t.checkin_frequency,
  t.checkin_day,
  t.checkin_deadline_hour,
  obj.title as objective_title,
  obj.id as objective_id,
  -- Calculate if check-in is overdue
  CASE 
    WHEN kr.last_checkin_at IS NULL THEN true
    WHEN t.checkin_frequency = 'weekly' AND kr.last_checkin_at < (CURRENT_DATE - INTERVAL '7 days') THEN true
    WHEN t.checkin_frequency = 'biweekly' AND kr.last_checkin_at < (CURRENT_DATE - INTERVAL '14 days') THEN true
    ELSE false
  END as is_overdue,
  -- Calculate days since last check-in
  CASE 
    WHEN kr.last_checkin_at IS NULL THEN NULL
    ELSE EXTRACT(DAY FROM (CURRENT_TIMESTAMP - kr.last_checkin_at))::integer
  END as days_since_checkin
FROM okr_team_key_results kr
JOIN teams t ON t.id = kr.team_id
LEFT JOIN okr_team_objectives obj ON obj.id = kr.team_objective_id
WHERE kr.deleted_at IS NULL 
  AND kr.status != 'not_started'
  AND t.deleted_at IS NULL;

-- Create function to update last_checkin_at when a check-in is created
CREATE OR REPLACE FUNCTION public.update_kr_last_checkin()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE okr_team_key_results
  SET 
    last_checkin_at = NEW.created_at,
    current_value = NEW.current_value,
    updated_at = now()
  WHERE id = NEW.kr_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic update on check-in
DROP TRIGGER IF EXISTS trigger_update_kr_on_checkin ON okr_checkins;
CREATE TRIGGER trigger_update_kr_on_checkin
  AFTER INSERT ON okr_checkins
  FOR EACH ROW
  EXECUTE FUNCTION public.update_kr_last_checkin();

-- Grant access to the view
GRANT SELECT ON public.v_pending_checkins TO authenticated;