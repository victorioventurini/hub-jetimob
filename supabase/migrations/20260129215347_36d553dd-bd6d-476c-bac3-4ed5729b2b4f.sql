-- Fix get_bu_by_email_domain: replace legacy partner_companies references with external_companies
-- and align logic with current external associations + internal profile requirement.

CREATE OR REPLACE FUNCTION public.get_bu_by_email_domain(p_email text)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_domain text;
  v_bu_id uuid;
  v_email_lower text;
  v_has_profile boolean;
BEGIN
  v_email_lower := lower(p_email);
  v_domain := split_part(v_email_lower, '@', 2);

  IF v_domain IS NULL OR v_domain = '' THEN
    RETURN NULL;
  END IF;

  -- 1) External user (partner contact) - email must be active and associated to an active BU
  SELECT pca.bu_id INTO v_bu_id
  FROM public.partner_contacts pc
  JOIN public.partner_contact_bu_associations pca
    ON pca.partner_contact_id = pc.id
   AND pca.is_active = true
   AND pca.deleted_at IS NULL
  JOIN public.bu_units bu
    ON bu.id = pca.bu_id
   AND bu.status = 'active'
  JOIN public.external_companies ec
    ON ec.id = pc.external_company_id
   AND ec.status = 'active'
   AND ec.deleted_at IS NULL
  WHERE pc.email = v_email_lower
    AND pc.status = 'active'
    AND pc.deleted_at IS NULL
  LIMIT 1;

  IF v_bu_id IS NOT NULL THEN
    RETURN v_bu_id;
  END IF;

  -- 2) External company domain - domain must be in allowed_domains and associated to an active BU
  SELECT eca.bu_id INTO v_bu_id
  FROM public.external_companies ec
  JOIN public.external_company_bu_associations eca
    ON eca.external_company_id = ec.id
   AND eca.is_active = true
   AND eca.deleted_at IS NULL
   AND eca.role = 'partner'
  JOIN public.bu_units bu
    ON bu.id = eca.bu_id
   AND bu.status = 'active'
  WHERE ec.deleted_at IS NULL
    AND ec.status = 'active'
    AND v_domain = ANY(ec.allowed_domains)
  LIMIT 1;

  IF v_bu_id IS NOT NULL THEN
    RETURN v_bu_id;
  END IF;

  -- 3) Internal user - domain must be allowed AND user must have a pre-created profile
  SELECT bu.id INTO v_bu_id
  FROM public.bu_units bu
  WHERE bu.status = 'active'
    AND v_domain = ANY(bu.allowed_email_domains)
  LIMIT 1;

  IF v_bu_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.work_email = v_email_lower
      AND p.deleted_at IS NULL
  ) INTO v_has_profile;

  IF v_has_profile THEN
    RETURN v_bu_id;
  END IF;

  RETURN NULL;
END;
$function$;

-- Ensure pre-login calls (role=anon) can execute the RPC
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_bu_by_email_domain(text) TO anon, authenticated;
