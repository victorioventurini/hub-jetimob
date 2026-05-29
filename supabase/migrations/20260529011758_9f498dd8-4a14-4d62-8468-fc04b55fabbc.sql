CREATE TABLE public.ritual_window_overrides (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL REFERENCES public.cycles(id) ON DELETE CASCADE,
  wizard_type text NOT NULL,
  anchor text NOT NULL,
  opens_date date NOT NULL,
  closes_date date NOT NULL,
  reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bu_id, cycle_id, wizard_type, anchor)
);

CREATE INDEX idx_rwo_bu_cycle ON public.ritual_window_overrides(bu_id, cycle_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ritual_window_overrides TO authenticated;
GRANT ALL ON public.ritual_window_overrides TO service_role;

ALTER TABLE public.ritual_window_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rwo_select_bu_members"
ON public.ritual_window_overrides
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bu_user_memberships m
    WHERE m.user_id = auth.uid()
      AND m.bu_id = ritual_window_overrides.bu_id
      AND m.deleted_at IS NULL
  )
);

CREATE POLICY "rwo_insert_bu_admin"
ON public.ritual_window_overrides
FOR INSERT
TO authenticated
WITH CHECK (public.is_bu_admin(auth.uid(), bu_id));

CREATE POLICY "rwo_update_bu_admin"
ON public.ritual_window_overrides
FOR UPDATE
TO authenticated
USING (public.is_bu_admin(auth.uid(), bu_id))
WITH CHECK (public.is_bu_admin(auth.uid(), bu_id));

CREATE POLICY "rwo_delete_bu_admin"
ON public.ritual_window_overrides
FOR DELETE
TO authenticated
USING (public.is_bu_admin(auth.uid(), bu_id));

CREATE OR REPLACE FUNCTION public.validate_ritual_window_override()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.closes_date < NEW.opens_date THEN
    RAISE EXCEPTION 'closes_date (%) must be >= opens_date (%)', NEW.closes_date, NEW.opens_date;
  END IF;
  IF NEW.wizard_type NOT IN ('mbr', 'mbr-pre') THEN
    RAISE EXCEPTION 'wizard_type % not supported (allowed: mbr, mbr-pre)', NEW.wizard_type;
  END IF;
  IF NEW.anchor NOT IN ('review_date', 'review_date_first_month') THEN
    RAISE EXCEPTION 'anchor % not supported (allowed: review_date, review_date_first_month)', NEW.anchor;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_ritual_window_override
BEFORE INSERT OR UPDATE ON public.ritual_window_overrides
FOR EACH ROW EXECUTE FUNCTION public.validate_ritual_window_override();