-- =============================================
-- Migration: Partner Contacts Global Email Model (Fix)
-- =============================================

-- 1. Create partner_contact_bu_associations table
CREATE TABLE public.partner_contact_bu_associations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_contact_id UUID NOT NULL REFERENCES public.partner_contacts(id) ON DELETE CASCADE,
  bu_id UUID NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  
  CONSTRAINT partner_contact_bu_assoc_unique UNIQUE (partner_contact_id, bu_id)
);

-- Add FK constraint for created_by with ON DELETE SET NULL
-- Using profiles.id per project convention (IDENTITY_CONVENTION.md)
ALTER TABLE public.partner_contact_bu_associations
  ADD CONSTRAINT fk_partner_contact_bu_assoc_created_by 
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Enable RLS
ALTER TABLE public.partner_contact_bu_associations ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for partner_contact_bu_associations (BU-scoped)
CREATE POLICY "Users can view associations in their BU"
ON public.partner_contact_bu_associations
FOR SELECT
USING (bu_id = public.current_bu_id());

CREATE POLICY "Users can insert associations in their BU"
ON public.partner_contact_bu_associations
FOR INSERT
WITH CHECK (bu_id = public.current_bu_id());

CREATE POLICY "Users can update associations in their BU"
ON public.partner_contact_bu_associations
FOR UPDATE
USING (bu_id = public.current_bu_id());

CREATE POLICY "Users can delete associations in their BU"
ON public.partner_contact_bu_associations
FOR DELETE
USING (bu_id = public.current_bu_id());

-- 4. Trigger for updated_at
CREATE TRIGGER update_partner_contact_bu_associations_updated_at
BEFORE UPDATE ON public.partner_contact_bu_associations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Migrate existing data: create associations for all existing contacts
-- Set created_by to NULL if not found in profiles (orphan data)
INSERT INTO public.partner_contact_bu_associations (partner_contact_id, bu_id, is_active, created_by, created_at)
SELECT 
  pc.id,
  pc.bu_id,
  CASE WHEN pc.status = 'active' THEN true ELSE false END,
  CASE WHEN p.id IS NOT NULL THEN pc.created_by ELSE NULL END,
  pc.created_at
FROM public.partner_contacts pc
LEFT JOIN public.profiles p ON p.id = pc.created_by
WHERE pc.bu_id IS NOT NULL 
  AND pc.deleted_at IS NULL;

-- 6. Alter partner_contacts: make bu_id nullable (contacts become global)
ALTER TABLE public.partner_contacts ALTER COLUMN bu_id DROP NOT NULL;

-- 7. Drop old unique constraint if exists (email + bu_id)
DROP INDEX IF EXISTS partner_contacts_email_bu_unique;
DROP INDEX IF EXISTS partner_contacts_email_bu_id_key;

-- 8. Create new global unique constraint on email
CREATE UNIQUE INDEX partner_contacts_email_global_unique 
ON public.partner_contacts (lower(email)) 
WHERE deleted_at IS NULL AND email IS NOT NULL;

-- 9. Update RLS on partner_contacts to allow reading global contacts
-- First drop existing SELECT policy
DROP POLICY IF EXISTS "partner_contacts_select" ON public.partner_contacts;
DROP POLICY IF EXISTS "Users can view partner contacts in their BU" ON public.partner_contacts;

-- New SELECT policy: can view if has association with current BU
CREATE POLICY "Users can view partner contacts with BU association"
ON public.partner_contacts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.partner_contact_bu_associations pcba
    WHERE pcba.partner_contact_id = id
      AND pcba.bu_id = public.current_bu_id()
      AND pcba.deleted_at IS NULL
  )
  OR bu_id = public.current_bu_id() -- backward compat during transition
);

-- Keep INSERT open (contacts are global now)
DROP POLICY IF EXISTS "partner_contacts_insert" ON public.partner_contacts;
DROP POLICY IF EXISTS "Users can insert partner contacts in their BU" ON public.partner_contacts;

CREATE POLICY "Authenticated users can insert partner contacts"
ON public.partner_contacts
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: allow if user has association with current BU
DROP POLICY IF EXISTS "partner_contacts_update" ON public.partner_contacts;
DROP POLICY IF EXISTS "Users can update partner contacts in their BU" ON public.partner_contacts;

CREATE POLICY "Users can update partner contacts with BU association"
ON public.partner_contacts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.partner_contact_bu_associations pcba
    WHERE pcba.partner_contact_id = id
      AND pcba.bu_id = public.current_bu_id()
      AND pcba.deleted_at IS NULL
  )
  OR bu_id = public.current_bu_id()
);

-- 10. Add indexes for performance
CREATE INDEX idx_partner_contact_bu_assoc_bu_id ON public.partner_contact_bu_associations(bu_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_partner_contact_bu_assoc_contact_id ON public.partner_contact_bu_associations(partner_contact_id) WHERE deleted_at IS NULL;