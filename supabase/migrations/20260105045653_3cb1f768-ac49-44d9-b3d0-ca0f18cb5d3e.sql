
-- Create enum for initiative status
CREATE TYPE public.initiative_status AS ENUM ('planned', 'in_progress', 'blocked', 'completed');

-- Create enum for initiative priority
CREATE TYPE public.initiative_priority AS ENUM ('low', 'medium', 'high');

-- Create initiatives table
CREATE TABLE public.okr_initiatives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  kr_id UUID NOT NULL REFERENCES public.okr_team_key_results(id) ON DELETE CASCADE,
  bu_id UUID REFERENCES public.bu_units(id),
  owner_user_id UUID NOT NULL,
  status public.initiative_status NOT NULL DEFAULT 'planned',
  priority public.initiative_priority DEFAULT 'medium',
  start_date DATE,
  expected_end_date DATE,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  contributors UUID[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster lookups
CREATE INDEX idx_initiatives_kr_id ON public.okr_initiatives(kr_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_initiatives_owner ON public.okr_initiatives(owner_user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_initiatives_bu_id ON public.okr_initiatives(bu_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_initiatives_status ON public.okr_initiatives(status) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE public.okr_initiatives ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view initiatives in their BU"
ON public.okr_initiatives
FOR SELECT
USING (
  deleted_at IS NULL AND (
    bu_id IS NULL OR
    bu_id IN (
      SELECT bu_id FROM public.bu_user_memberships WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can create initiatives"
ON public.okr_initiatives
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    bu_id IS NULL OR
    bu_id IN (
      SELECT bu_id FROM public.bu_user_memberships WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update their own initiatives or as team leader"
ON public.okr_initiatives
FOR UPDATE
USING (
  deleted_at IS NULL AND (
    owner_user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.okr_team_key_results kr
      JOIN public.teams t ON kr.team_id = t.id
      WHERE kr.id = okr_initiatives.kr_id AND t.leader_user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete their own initiatives or as team leader"
ON public.okr_initiatives
FOR DELETE
USING (
  owner_user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.okr_team_key_results kr
    JOIN public.teams t ON kr.team_id = t.id
    WHERE kr.id = okr_initiatives.kr_id AND t.leader_user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_initiatives_updated_at
BEFORE UPDATE ON public.okr_initiatives
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
