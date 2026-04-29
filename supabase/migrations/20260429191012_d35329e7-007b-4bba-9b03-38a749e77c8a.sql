CREATE OR REPLACE FUNCTION public.can_pin_ticket_message(p_ticket_id uuid, p_profile_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ticket RECORD;
  v_contact_profile_id uuid;
BEGIN
  SELECT created_by_user_id, owner_user_id, assigned_contact_id, type, bu_id
  INTO v_ticket
  FROM public.tickets
  WHERE id = p_ticket_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Admin override: espelha can_update_ticket_status (tickets.settings.manage:bu cobre
  -- super_admin/BU admin/tickets_admin_v2 via wildcard '*'). Sem isso, a RLS de
  -- ticket_messages_update_v3 bloqueia admins de fixar mensagens de outras pessoas.
  IF has_permission(p_profile_id, v_ticket.bu_id, 'tickets.settings.manage:bu') THEN
    RETURN true;
  END IF;

  -- Criador / owner
  IF v_ticket.created_by_user_id = p_profile_id THEN
    RETURN true;
  END IF;
  IF v_ticket.owner_user_id = p_profile_id THEN
    RETURN true;
  END IF;

  -- Tickets externos: contato assignee (mesmo critério atual)
  IF v_ticket.type = 'external' AND v_ticket.assigned_contact_id IS NOT NULL THEN
    SELECT pr.id INTO v_contact_profile_id
    FROM public.partner_contacts pc
    JOIN public.profiles pr ON pr.user_id = pc.user_id
    WHERE pc.id = v_ticket.assigned_contact_id
      AND pc.user_id IS NOT NULL;

    IF v_contact_profile_id = p_profile_id THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$function$;

COMMENT ON FUNCTION public.can_pin_ticket_message IS
'Pinning gate para ticket_messages: admin (tickets.settings.manage:bu), criador, owner ou contato externo assignado. Espelha can_update_ticket_status.';