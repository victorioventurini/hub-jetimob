-- Add shared OKR fields to okr_team_objectives
ALTER TABLE public.okr_team_objectives
ADD COLUMN is_shared BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN responsibility_model TEXT CHECK (responsibility_model IN ('collaborative', 'primary_led')) DEFAULT 'collaborative';

-- Create junction table for contributing teams
CREATE TABLE public.okr_team_objective_contributors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  objective_id UUID NOT NULL REFERENCES public.okr_team_objectives(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(objective_id, team_id)
);

-- Enable RLS
ALTER TABLE public.okr_team_objective_contributors ENABLE ROW LEVEL SECURITY;

-- RLS policies for contributors table
CREATE POLICY "Users can view objective contributors"
ON public.okr_team_objective_contributors
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can manage contributors"
ON public.okr_team_objective_contributors
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Create index for better query performance
CREATE INDEX idx_okr_objective_contributors_objective ON public.okr_team_objective_contributors(objective_id);
CREATE INDEX idx_okr_objective_contributors_team ON public.okr_team_objective_contributors(team_id);