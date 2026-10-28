CREATE OR REPLACE FUNCTION public.validate_external_capability_scope()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM partner_service_mappings m
    WHERE m.bu_id = NEW.bu_id AND m.external_company_id = NEW.external_company_id
      AND m.category_id = NEW.category_id AND m.deleted_at IS NULL AND m.status = 'active'
      AND (m.subcategory_id IS NULL OR m.subcategory_id = NEW.subcategory_id)
  ) THEN
    RAISE EXCEPTION 'Categoria não atendida pela empresa nesta unidade' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $function$;