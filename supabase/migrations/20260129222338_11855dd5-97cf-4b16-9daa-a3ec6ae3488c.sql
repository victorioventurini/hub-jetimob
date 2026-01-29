
-- Fix: Update SQL functions to use external_company_id instead of partner_company_id
-- These functions reference the old column name that no longer exists in the tickets table

-- 1. Fix apply_ticket_assignment() function
CREATE OR REPLACE FUNCTION public.apply_ticket_assignment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_contact_id uuid;
BEGIN
  -- Changed: partner_company_id → external_company_id
  IF NEW.type = 'external' AND NEW.external_company_id IS NOT NULL AND NEW.category_id IS NOT NULL THEN
    IF NEW.assignment_source = 'manual' THEN
      RETURN NEW;
    END IF;
    
    -- resolve_ticket_assignee still uses p_partner_company_id parameter name
    v_contact_id := resolve_ticket_assignee(
      NEW.bu_id,
      NEW.external_company_id,  -- Changed: was partner_company_id
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
$function$;

-- 2. Fix validate_external_ticket_partner_service() function
CREATE OR REPLACE FUNCTION public.validate_external_ticket_partner_service()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_partner_active_in_bu BOOLEAN;
  v_has_mapping BOOLEAN;
BEGIN
  -- Só valida tickets externos
  IF NEW.type != 'external' THEN 
    RETURN NEW; 
  END IF;
  
  -- Changed: partner_company_id → external_company_id
  -- Ticket externo requer empresa parceira
  IF NEW.external_company_id IS NULL THEN
    RAISE EXCEPTION 'Tickets externos requerem uma empresa parceira';
  END IF;
  
  -- Changed: partner_company_bu_associations → external_company_bu_associations
  -- Verificar se parceiro está ativo na BU do ticket
  SELECT EXISTS (
    SELECT 1 FROM external_company_bu_associations
    WHERE external_company_id = NEW.external_company_id
      AND bu_id = NEW.bu_id
      AND is_active = true
      AND deleted_at IS NULL
  ) INTO v_partner_active_in_bu;
  
  IF NOT v_partner_active_in_bu THEN
    RAISE EXCEPTION 'Esse parceiro não está ativo nesta unidade de negócio';
  END IF;
  
  -- Changed: partner_company_id → external_company_id
  -- Verificar se parceiro atende a categoria (mapeamento global)
  SELECT EXISTS (
    SELECT 1 FROM partner_service_mappings psm
    WHERE psm.external_company_id = NEW.external_company_id
      AND psm.category_id = NEW.category_id
      AND (psm.subcategory_id IS NULL OR psm.subcategory_id = NEW.subcategory_id)
      AND psm.status = 'active'
      AND psm.deleted_at IS NULL
  ) INTO v_has_mapping;
  
  IF NOT v_has_mapping THEN
    RAISE EXCEPTION 'Parceiro não atende esta categoria/subcategoria';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Note: resolve_ticket_assignee is NOT updated because changing parameter names requires DROP + CREATE
-- The function still works correctly - it receives external_company_id values and queries partner_contact_capabilities.partner_company_id
-- which is a FK to external_companies.id (same table, just legacy column name)
