-- Fix: get_bu_by_email_domain should also check partner_contacts
-- This allows external users (partner contacts) to login via magic link

CREATE OR REPLACE FUNCTION public.get_bu_by_email_domain(p_email text)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_domain TEXT;
  v_bu_id UUID;
  v_email_lower TEXT;
BEGIN
  v_email_lower := lower(p_email);
  v_domain := split_part(v_email_lower, '@', 2);
  
  -- 1. First check if email is a partner contact (external users)
  SELECT pc.bu_id INTO v_bu_id
  FROM public.partner_contacts pc
  JOIN public.partner_companies pco ON pc.partner_company_id = pco.id
  JOIN public.bu_units bu ON pc.bu_id = bu.id
  WHERE pc.email = v_email_lower
    AND pc.status = 'active'
    AND pc.deleted_at IS NULL
    AND pco.status = 'active'
    AND bu.status = 'active'
  LIMIT 1;
  
  IF v_bu_id IS NOT NULL THEN
    RETURN v_bu_id;
  END IF;
  
  -- 2. Fall back to domain-based check (internal users)
  SELECT id INTO v_bu_id
  FROM public.bu_units
  WHERE v_domain = ANY(allowed_email_domains)
    AND status = 'active'
  LIMIT 1;
  
  RETURN v_bu_id;
END;
$function$;