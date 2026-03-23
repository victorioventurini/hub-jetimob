
ALTER TABLE public.asset_phone_lines
  ADD COLUMN responsible_team_id UUID REFERENCES public.teams(id);

CREATE INDEX idx_asset_phone_lines_responsible_team_id
  ON public.asset_phone_lines(responsible_team_id)
  WHERE responsible_team_id IS NOT NULL;
