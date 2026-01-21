-- Fix get_user_partner_contact_id to use user_id instead of profile_user_id
-- The user_id field stores auth.users.id which is what auth.uid() returns

CREATE OR REPLACE FUNCTION public.get_user_partner_contact_id(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT pc.id
  FROM public.partner_contacts pc
  WHERE pc.user_id = p_user_id
    AND pc.status = 'active'
    AND pc.deleted_at IS NULL
  LIMIT 1
$function$;

COMMENT ON FUNCTION public.get_user_partner_contact_id IS 
'Returns the partner_contact.id for a given auth.users.id. 
Used in RLS policies to allow external users to perform operations as their contact identity.';