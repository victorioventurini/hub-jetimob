CREATE OR REPLACE FUNCTION public.get_partner_contact_ticket_stats(
  p_contact_id uuid,
  p_bu_id uuid DEFAULT NULL
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_contact_bu_id uuid;
  v_count int := 0;
  v_waiting int := 0;
  v_in_progress int := 0;
  v_done int := 0;
  v_avg_resolution_days numeric;
BEGIN
  -- Verify contact exists and get their BU (used for permission check fallback)
  SELECT bu_id INTO v_contact_bu_id
  FROM public.partner_contacts
  WHERE id = p_contact_id AND deleted_at IS NULL;

  IF v_contact_bu_id IS NULL THEN
    RETURN jsonb_build_object(
      'count', 0,
      'waiting', 0,
      'in_progress', 0,
      'done', 0,
      'avg_resolution_days', null
    );
  END IF;

  -- Permission gate: caller must be platform admin OR bu_admin of the BU we are scoping to
  -- (defaults to the contact's BU when p_bu_id is null)
  IF NOT (
    is_platform_admin(auth.uid())
    OR is_bu_admin(auth.uid(), COALESCE(p_bu_id, v_contact_bu_id))
  ) THEN
    SELECT 
      COUNT(*),
      COUNT(*) FILTER (WHERE status = 'waiting'),
      COUNT(*) FILTER (WHERE status = 'in_progress'),
      COUNT(*) FILTER (WHERE status = 'done')
    INTO v_count, v_waiting, v_in_progress, v_done
    FROM public.tickets t
    WHERE t.assigned_contact_id = p_contact_id
      AND t.deleted_at IS NULL
      AND (p_bu_id IS NULL OR t.bu_id = p_bu_id)
      AND can_view_ticket(t.id, my_profile_id());
  ELSE
    SELECT 
      COUNT(*),
      COUNT(*) FILTER (WHERE status = 'waiting'),
      COUNT(*) FILTER (WHERE status = 'in_progress'),
      COUNT(*) FILTER (WHERE status = 'done')
    INTO v_count, v_waiting, v_in_progress, v_done
    FROM public.tickets t
    WHERE t.assigned_contact_id = p_contact_id
      AND t.deleted_at IS NULL
      AND (p_bu_id IS NULL OR t.bu_id = p_bu_id);

    SELECT AVG(EXTRACT(DAY FROM (updated_at - created_at)))
    INTO v_avg_resolution_days
    FROM public.tickets t
    WHERE t.assigned_contact_id = p_contact_id
      AND t.status = 'done'
      AND t.deleted_at IS NULL
      AND (p_bu_id IS NULL OR t.bu_id = p_bu_id);
  END IF;

  RETURN jsonb_build_object(
    'count', COALESCE(v_count, 0),
    'waiting', COALESCE(v_waiting, 0),
    'in_progress', COALESCE(v_in_progress, 0),
    'done', COALESCE(v_done, 0),
    'avg_resolution_days', CASE WHEN v_avg_resolution_days IS NOT NULL THEN ROUND(v_avg_resolution_days) ELSE null END
  );
END;
$function$;