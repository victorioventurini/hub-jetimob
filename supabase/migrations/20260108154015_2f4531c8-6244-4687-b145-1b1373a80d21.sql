
-- Wave 5: Normalize squad_memberships table
-- Add bu_id and deleted_at for proper BU scoping and soft delete

-- 1. Add bu_id column (derived from squad)
ALTER TABLE public.squad_memberships 
ADD COLUMN bu_id uuid REFERENCES public.bu_units(id) ON DELETE CASCADE;

-- 2. Add deleted_at for soft delete
ALTER TABLE public.squad_memberships 
ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;

-- 3. Backfill bu_id from squads table (for any existing records)
UPDATE public.squad_memberships sm
SET bu_id = s.bu_id
FROM public.squads s
WHERE sm.squad_id = s.id
AND sm.bu_id IS NULL;

-- 4. Make bu_id NOT NULL after backfill
ALTER TABLE public.squad_memberships 
ALTER COLUMN bu_id SET NOT NULL;

-- 5. Create index for BU-scoped queries
CREATE INDEX IF NOT EXISTS idx_squad_memberships_bu_id ON public.squad_memberships(bu_id);
CREATE INDEX IF NOT EXISTS idx_squad_memberships_user_bu ON public.squad_memberships(user_id, bu_id);

-- 6. Create trigger to auto-set bu_id from squad on INSERT
CREATE OR REPLACE FUNCTION public.set_squad_membership_bu_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.bu_id IS NULL THEN
    SELECT bu_id INTO NEW.bu_id FROM public.squads WHERE id = NEW.squad_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_squad_membership_set_bu_id
  BEFORE INSERT ON public.squad_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.set_squad_membership_bu_id();

-- 7. Drop old RLS policies
DROP POLICY IF EXISTS "BU members can view squad memberships" ON public.squad_memberships;
DROP POLICY IF EXISTS "BU admins can manage squad memberships" ON public.squad_memberships;

-- 8. Create new RLS policies using direct bu_id
CREATE POLICY "BU members can view squad memberships"
  ON public.squad_memberships FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      user_has_bu_access(auth.uid(), bu_id)
      OR is_platform_admin(auth.uid())
    )
  );

CREATE POLICY "BU admins can insert squad memberships"
  ON public.squad_memberships FOR INSERT
  TO authenticated
  WITH CHECK (
    is_bu_admin(auth.uid(), bu_id)
    OR is_platform_admin(auth.uid())
  );

CREATE POLICY "BU admins can update squad memberships"
  ON public.squad_memberships FOR UPDATE
  TO authenticated
  USING (
    is_bu_admin(auth.uid(), bu_id)
    OR is_platform_admin(auth.uid())
  )
  WITH CHECK (
    is_bu_admin(auth.uid(), bu_id)
    OR is_platform_admin(auth.uid())
  );

CREATE POLICY "BU admins can delete squad memberships"
  ON public.squad_memberships FOR DELETE
  TO authenticated
  USING (
    is_bu_admin(auth.uid(), bu_id)
    OR is_platform_admin(auth.uid())
  );

-- 9. Create enforce_bu_scope trigger
CREATE OR REPLACE FUNCTION public.enforce_squad_membership_bu_scope()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure bu_id matches squad's bu_id
  IF NEW.bu_id != (SELECT bu_id FROM public.squads WHERE id = NEW.squad_id) THEN
    RAISE EXCEPTION 'bu_id mismatch: squad membership bu_id must match squad bu_id';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_enforce_squad_membership_bu_scope
  BEFORE INSERT OR UPDATE ON public.squad_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_squad_membership_bu_scope();
