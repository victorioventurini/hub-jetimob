CREATE OR REPLACE FUNCTION public.update_user_global_role(target_user_id uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  executor_role text;
BEGIN
  IF NOT is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Only platform admins can update global roles';
  END IF;

  SELECT role INTO executor_role FROM user_roles WHERE user_id = auth.uid() LIMIT 1;

  IF new_role = 'super_admin' AND executor_role IS DISTINCT FROM 'super_admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only super_admin can promote to super_admin';
  END IF;

  IF new_role IS NULL OR new_role = '' THEN
    DELETE FROM user_roles WHERE user_id = target_user_id;
  ELSE
    DELETE FROM user_roles
      WHERE user_id = target_user_id
        AND role <> new_role::app_role;

    INSERT INTO user_roles (user_id, role)
    VALUES (target_user_id, new_role::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$function$;