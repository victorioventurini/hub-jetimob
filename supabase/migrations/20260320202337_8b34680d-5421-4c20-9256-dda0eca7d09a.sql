
-- Add optional responsible_user_id to asset_phone_lines
ALTER TABLE public.asset_phone_lines
  ADD COLUMN responsible_user_id uuid REFERENCES public.profiles(id) DEFAULT NULL;

-- Index for join performance
CREATE INDEX idx_asset_phone_lines_responsible_user_id
  ON public.asset_phone_lines(responsible_user_id)
  WHERE responsible_user_id IS NOT NULL;

COMMENT ON COLUMN public.asset_phone_lines.responsible_user_id IS 'Optional: user responsible for this phone line (independent of loan status)';
