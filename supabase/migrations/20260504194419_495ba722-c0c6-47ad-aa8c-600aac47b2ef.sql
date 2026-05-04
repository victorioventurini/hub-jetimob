
-- RPC para resolver a BU de um ticket que o usuário tem acesso, ignorando o header de BU.
-- Usado para detectar quando o usuário abriu um ticket de outra BU e precisa trocar.
CREATE OR REPLACE FUNCTION public.resolve_ticket_bu_for_user(p_ticket_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_profile_id uuid;
  v_ticket_bu uuid;
  v_partner_contact_id uuid;
BEGIN
  IF v_uid IS NULL OR p_ticket_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT bu_id INTO v_ticket_bu
  FROM public.tickets
  WHERE id = p_ticket_id AND deleted_at IS NULL;

  IF v_ticket_bu IS NULL THEN
    RETURN NULL;
  END IF;

  -- Platform admin: sempre devolve
  IF public.is_platform_admin(v_uid) THEN
    RETURN v_ticket_bu;
  END IF;

  SELECT id INTO v_profile_id FROM public.profiles WHERE user_id = v_uid LIMIT 1;

  -- Internal: criador, owner, participante ou membro com visibilidade
  IF v_profile_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = p_ticket_id
        AND (t.created_by_user_id = v_profile_id OR t.owner_user_id = v_profile_id)
    ) THEN
      RETURN v_ticket_bu;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.ticket_participants tp
      WHERE tp.ticket_id = p_ticket_id
        AND tp.profile_id = v_profile_id
        AND tp.is_active = true
    ) THEN
      RETURN v_ticket_bu;
    END IF;

    IF public.is_profile_bu_member(v_profile_id, v_ticket_bu) THEN
      -- Visibilidade: deixa o RLS decidir depois; aqui devolvemos para permitir o switch.
      -- Membro da BU pode ver tickets bu_all/team/users que se aplicarem.
      IF EXISTS (
        SELECT 1 FROM public.tickets t
        WHERE t.id = p_ticket_id
          AND (
            t.visibility = 'bu_all'
            OR (t.visibility = 'users' AND v_profile_id = ANY(t.visibility_user_ids))
            OR (t.visibility = 'teams' AND EXISTS (
              SELECT 1 FROM public.user_team_memberships utm
              WHERE utm.user_id = v_profile_id AND utm.team_id = ANY(t.visibility_team_ids)
            ))
          )
      ) THEN
        RETURN v_ticket_bu;
      END IF;
    END IF;
  END IF;

  -- External: participante via partner_contact
  SELECT pc.id INTO v_partner_contact_id
  FROM public.partner_contacts pc
  JOIN public.partner_contact_bu_associations pcba
    ON pcba.partner_contact_id = pc.id
   AND pcba.bu_id = v_ticket_bu
   AND pcba.is_active = true
   AND pcba.deleted_at IS NULL
  WHERE pc.user_id = v_uid
    AND pc.status = 'active'
    AND pc.deleted_at IS NULL
  LIMIT 1;

  IF v_partner_contact_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.ticket_participants tp
      WHERE tp.ticket_id = p_ticket_id
        AND tp.partner_contact_id = v_partner_contact_id
        AND tp.is_active = true
    ) THEN
      RETURN v_ticket_bu;
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_ticket_bu_for_user(uuid) TO authenticated;
