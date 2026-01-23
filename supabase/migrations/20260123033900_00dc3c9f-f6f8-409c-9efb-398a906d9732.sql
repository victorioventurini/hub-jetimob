-- Create RPC to get ticket stats for a partner contact (for admin profile view)
-- Uses SECURITY DEFINER to allow admins to see all tickets assigned to a contact
-- regardless of their own ticket visibility

CREATE OR REPLACE FUNCTION public.get_partner_contact_ticket_stats(p_contact_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contact_bu_id uuid;
  v_result jsonb;
  v_count int;
  v_waiting int := 0;
  v_in_progress int := 0;
  v_done int := 0;
  v_avg_resolution_days numeric;
BEGIN
  -- Verify contact exists and get their BU
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
  
  -- Verify caller has access to this BU (must be admin or platform admin)
  IF NOT (is_platform_admin(auth.uid()) OR is_bu_admin(auth.uid(), v_contact_bu_id)) THEN
    -- Non-admins only see their own visible tickets
    SELECT 
      COUNT(*),
      COUNT(*) FILTER (WHERE status = 'waiting'),
      COUNT(*) FILTER (WHERE status = 'in_progress'),
      COUNT(*) FILTER (WHERE status = 'done')
    INTO v_count, v_waiting, v_in_progress, v_done
    FROM public.tickets t
    WHERE t.assigned_contact_id = p_contact_id
      AND t.deleted_at IS NULL
      AND can_view_ticket(t.id, my_profile_id());
  ELSE
    -- Admins see all tickets for this contact in their BU
    SELECT 
      COUNT(*),
      COUNT(*) FILTER (WHERE status = 'waiting'),
      COUNT(*) FILTER (WHERE status = 'in_progress'),
      COUNT(*) FILTER (WHERE status = 'done')
    INTO v_count, v_waiting, v_in_progress, v_done
    FROM public.tickets t
    WHERE t.assigned_contact_id = p_contact_id
      AND t.deleted_at IS NULL;
    
    -- Calculate average resolution time for done tickets
    SELECT AVG(EXTRACT(DAY FROM (updated_at - created_at)))
    INTO v_avg_resolution_days
    FROM public.tickets t
    WHERE t.assigned_contact_id = p_contact_id
      AND t.status = 'done'
      AND t.deleted_at IS NULL;
  END IF;
  
  RETURN jsonb_build_object(
    'count', COALESCE(v_count, 0),
    'waiting', COALESCE(v_waiting, 0),
    'in_progress', COALESCE(v_in_progress, 0),
    'done', COALESCE(v_done, 0),
    'avg_resolution_days', CASE WHEN v_avg_resolution_days IS NOT NULL THEN ROUND(v_avg_resolution_days) ELSE null END
  );
END;
$$;

COMMENT ON FUNCTION public.get_partner_contact_ticket_stats(uuid) IS 
'Returns ticket statistics for a partner contact. 
Admins see all tickets assigned to the contact; non-admins only see tickets they have access to.';