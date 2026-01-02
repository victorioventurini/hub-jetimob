-- Add onboarding_completed to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- Update existing profiles to mark onboarding as completed (they already have data)
UPDATE public.profiles 
SET onboarding_completed = true 
WHERE first_name IS NOT NULL 
  AND last_name IS NOT NULL 
  AND job_title IS NOT NULL 
  AND job_title != 'A definir'
  AND city IS NOT NULL
  AND team_id IS NOT NULL;

-- Create user_team_memberships table for multi-team support
CREATE TABLE IF NOT EXISTS public.user_team_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, team_id)
);

-- Enable RLS
ALTER TABLE public.user_team_memberships ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_team_memberships
CREATE POLICY "Users can view team memberships"
  ON public.user_team_memberships
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage team memberships"
  ON public.user_team_memberships
  FOR ALL
  USING (is_admin_or_ceo(auth.uid()));

CREATE POLICY "Team leaders can manage their team memberships"
  ON public.user_team_memberships
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = user_team_memberships.team_id
        AND t.leader_user_id = auth.uid()
    )
  );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_user_team_memberships_user_id ON public.user_team_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_team_memberships_team_id ON public.user_team_memberships(team_id);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON public.profiles(onboarding_completed) WHERE onboarding_completed = false;

-- Migrate existing team_id from profiles to user_team_memberships
INSERT INTO public.user_team_memberships (user_id, team_id, is_primary)
SELECT id, team_id, true
FROM public.profiles
WHERE team_id IS NOT NULL
  AND deleted_at IS NULL
ON CONFLICT (user_id, team_id) DO NOTHING;

-- Trigger to update updated_at
CREATE TRIGGER update_user_team_memberships_updated_at
  BEFORE UPDATE ON public.user_team_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Audit trigger for user_team_memberships
CREATE OR REPLACE FUNCTION public.audit_team_membership_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_values, created_at)
    VALUES (auth.uid(), 'create', 'team_membership', NEW.id, to_jsonb(NEW), now());
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, created_at)
    VALUES (auth.uid(), 'update', 'team_membership', NEW.id, to_jsonb(OLD), to_jsonb(NEW), now());
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, created_at)
    VALUES (auth.uid(), 'delete', 'team_membership', OLD.id, to_jsonb(OLD), now());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER audit_team_membership_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.user_team_memberships
  FOR EACH ROW EXECUTE FUNCTION public.audit_team_membership_changes();