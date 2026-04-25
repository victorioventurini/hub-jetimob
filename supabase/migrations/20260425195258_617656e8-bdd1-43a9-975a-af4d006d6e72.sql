CREATE OR REPLACE FUNCTION public._tmp_replicate_ferrigolo_caps(p_target_bu uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_inserted integer := 0;
BEGIN
  ALTER TABLE public.partner_contact_capabilities DISABLE TRIGGER USER;

  WITH inserted AS (
    INSERT INTO public.partner_contact_capabilities (bu_id, external_company_id, contact_id, category_id, subcategory_id, is_active)
    SELECT
      p_target_bu,
      '92ba2f29-28b3-4c9e-a23a-d8daf926db5a'::uuid,
      src.contact_id,
      target_cat.id,
      target_sub.id,
      true
    FROM partner_contact_capabilities src
    JOIN ticket_categories src_cat ON src_cat.id = src.category_id
    LEFT JOIN ticket_subcategories src_sub ON src_sub.id = src.subcategory_id
    JOIN ticket_categories target_cat
      ON target_cat.bu_id = p_target_bu
     AND target_cat.name = src_cat.name
     AND target_cat.deleted_at IS NULL
    LEFT JOIN ticket_subcategories target_sub
      ON target_sub.category_id = target_cat.id
     AND target_sub.name = src_sub.name
     AND target_sub.deleted_at IS NULL
    WHERE src.external_company_id = '92ba2f29-28b3-4c9e-a23a-d8daf926db5a'
      AND src.bu_id = 'a0000000-0000-0000-0000-000000000001'
      AND src.deleted_at IS NULL
      AND src.is_active = true
      AND (src.subcategory_id IS NULL OR target_sub.id IS NOT NULL)
      AND NOT EXISTS (
        SELECT 1 FROM partner_contact_capabilities e
        WHERE e.bu_id = p_target_bu
          AND e.external_company_id = '92ba2f29-28b3-4c9e-a23a-d8daf926db5a'
          AND e.contact_id = src.contact_id
          AND e.category_id = target_cat.id
          AND e.subcategory_id IS NOT DISTINCT FROM target_sub.id
          AND e.deleted_at IS NULL
      )
    RETURNING 1
  )
  SELECT count(*) INTO v_inserted FROM inserted;

  ALTER TABLE public.partner_contact_capabilities ENABLE TRIGGER USER;
  RETURN v_inserted;
EXCEPTION WHEN OTHERS THEN
  ALTER TABLE public.partner_contact_capabilities ENABLE TRIGGER USER;
  RAISE;
END;
$$;

SELECT public._tmp_replicate_ferrigolo_caps('f3d2d8a5-2143-42f0-8738-9b51fb74b49f'::uuid) AS jet_experience_inserted;

DROP FUNCTION public._tmp_replicate_ferrigolo_caps(uuid);