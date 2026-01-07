-- ============================================
-- CONTACT-FIRST ROUTING - Tickets Module Evolution
-- TCR v2.4.0 Compliant
-- ============================================

-- 1. CREATE partner_contact_capabilities TABLE
-- ============================================
CREATE TABLE public.partner_contact_capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES public.bu_units(id),
  partner_company_id uuid NOT NULL REFERENCES public.partner_companies(id),
  contact_id uuid NOT NULL REFERENCES public.partner_contacts(id),
  category_id uuid NOT NULL REFERENCES public.ticket_categories(id),
  subcategory_id uuid REFERENCES public.ticket_subcategories(id),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

COMMENT ON TABLE public.partner_contact_capabilities IS 'Maps partner contacts to ticket categories/subcategories they can handle. subcategory_id NULL means contact handles entire category.';

-- 2. CREATE UNIQUE INDEX for active capabilities
-- ============================================
CREATE UNIQUE INDEX idx_partner_contact_capabilities_unique 
ON public.partner_contact_capabilities (contact_id, category_id, COALESCE(subcategory_id, '00000000-0000-0000-0000-000000000000'::uuid))
WHERE is_active = true AND deleted_at IS NULL;

CREATE INDEX idx_partner_contact_capabilities_bu_id ON public.partner_contact_capabilities(bu_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_partner_contact_capabilities_company ON public.partner_contact_capabilities(partner_company_id) WHERE deleted_at IS NULL AND is_active = true;
CREATE INDEX idx_partner_contact_capabilities_contact ON public.partner_contact_capabilities(contact_id) WHERE deleted_at IS NULL AND is_active = true;
CREATE INDEX idx_partner_contact_capabilities_category ON public.partner_contact_capabilities(category_id) WHERE deleted_at IS NULL AND is_active = true;

-- 3. ENABLE RLS
-- ============================================
ALTER TABLE public.partner_contact_capabilities ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES (TCR v2.4.0 pattern)
-- ============================================
CREATE POLICY "partner_contact_capabilities_select" ON public.partner_contact_capabilities
FOR SELECT USING (
  deleted_at IS NULL 
  AND user_has_bu_access(auth.uid(), bu_id) 
  AND is_current_bu(bu_id)
);

CREATE POLICY "partner_contact_capabilities_insert" ON public.partner_contact_capabilities
FOR INSERT WITH CHECK (
  user_has_bu_access(auth.uid(), bu_id) 
  AND is_current_bu(bu_id)
);

CREATE POLICY "partner_contact_capabilities_update" ON public.partner_contact_capabilities
FOR UPDATE USING (
  user_has_bu_access(auth.uid(), bu_id) 
  AND is_current_bu(bu_id)
) WITH CHECK (
  user_has_bu_access(auth.uid(), bu_id) 
  AND is_current_bu(bu_id)
);

CREATE POLICY "partner_contact_capabilities_delete" ON public.partner_contact_capabilities
FOR DELETE USING (
  user_has_bu_access(auth.uid(), bu_id) 
  AND is_current_bu(bu_id)
);

CREATE POLICY "partner_contact_capabilities_admin" ON public.partner_contact_capabilities
FOR ALL USING (is_platform_admin(auth.uid()));

-- 5. BU SCOPE ENFORCEMENT TRIGGER
-- ============================================
CREATE TRIGGER enforce_bu_scope_partner_contact_capabilities
  BEFORE INSERT OR UPDATE ON public.partner_contact_capabilities
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_bu_scope();

CREATE TRIGGER partner_contact_capabilities_updated_at
  BEFORE UPDATE ON public.partner_contact_capabilities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_asset_updated_at();

-- 6. ADD COLUMNS TO TICKETS TABLE
-- ============================================
ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS assigned_contact_id uuid REFERENCES public.partner_contacts(id),
ADD COLUMN IF NOT EXISTS assignment_source text;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'tickets_assignment_source_check'
  ) THEN
    ALTER TABLE public.tickets 
    ADD CONSTRAINT tickets_assignment_source_check 
    CHECK (assignment_source IS NULL OR assignment_source IN ('contact_capability', 'routing_fallback', 'manual'));
  END IF;
END $$;

-- 7. CREATE resolve_ticket_assignee FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.resolve_ticket_assignee(
  p_bu_id uuid,
  p_partner_company_id uuid,
  p_category_id uuid,
  p_subcategory_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_contact_id uuid;
BEGIN
  -- Priority 1: Contact with specific subcategory match
  IF p_subcategory_id IS NOT NULL THEN
    SELECT contact_id INTO v_contact_id
    FROM public.partner_contact_capabilities
    WHERE bu_id = p_bu_id
      AND partner_company_id = p_partner_company_id
      AND category_id = p_category_id
      AND subcategory_id = p_subcategory_id
      AND is_active = true
      AND deleted_at IS NULL
    LIMIT 1;

    IF v_contact_id IS NOT NULL THEN
      RETURN v_contact_id;
    END IF;
  END IF;

  -- Priority 2: Contact that handles entire category
  SELECT contact_id INTO v_contact_id
  FROM public.partner_contact_capabilities
  WHERE bu_id = p_bu_id
    AND partner_company_id = p_partner_company_id
    AND category_id = p_category_id
    AND subcategory_id IS NULL
    AND is_active = true
    AND deleted_at IS NULL
  LIMIT 1;

  RETURN v_contact_id;
END;
$$;

COMMENT ON FUNCTION public.resolve_ticket_assignee IS 'Contact-first routing: finds eligible contact for a ticket based on category/subcategory capabilities.';

-- 8. CREATE apply_ticket_assignment TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.apply_ticket_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_contact_id uuid;
BEGIN
  IF NEW.type = 'external' AND NEW.partner_company_id IS NOT NULL AND NEW.category_id IS NOT NULL THEN
    IF NEW.assignment_source = 'manual' THEN
      RETURN NEW;
    END IF;
    
    v_contact_id := resolve_ticket_assignee(
      NEW.bu_id,
      NEW.partner_company_id,
      NEW.category_id,
      NEW.subcategory_id
    );
    
    IF v_contact_id IS NOT NULL THEN
      NEW.assigned_contact_id := v_contact_id;
      NEW.assignment_source := 'contact_capability';
    ELSE
      NEW.assignment_source := 'routing_fallback';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 9. CREATE TRIGGER for auto-assignment
-- ============================================
CREATE TRIGGER apply_ticket_assignment_trigger
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_ticket_assignment();

-- 10. ADD permission keys to catalog (correct schema)
-- ============================================
INSERT INTO public.permission_catalog (key, module, resource, action, scope, description, status)
VALUES 
  ('tickets.partner_contacts.view', 'tickets', 'partner_contacts', 'view', 'bu', 'Permite visualizar contatos de empresas parceiras', 'active'),
  ('tickets.partner_contacts.manage', 'tickets', 'partner_contacts', 'manage', 'bu', 'Permite gerenciar contatos de empresas parceiras', 'active'),
  ('tickets.contact_capabilities.view', 'tickets', 'contact_capabilities', 'view', 'bu', 'Permite visualizar as categorias que cada contato atende', 'active'),
  ('tickets.contact_capabilities.manage', 'tickets', 'contact_capabilities', 'manage', 'bu', 'Permite configurar quais categorias cada contato atende', 'active'),
  ('tickets.routing.view', 'tickets', 'routing', 'view', 'bu', 'Permite visualizar regras de roteamento de tickets', 'active'),
  ('tickets.routing.manage', 'tickets', 'routing', 'manage', 'bu', 'Permite configurar regras de roteamento de tickets', 'active')
ON CONFLICT (key) DO NOTHING;