-- Wave Hardening: BU isolation for notifications

-- Drop legacy ownership-only policies (no BU enforcement)
DROP POLICY IF EXISTS notifications_own_v2 ON public.notifications;
DROP POLICY IF EXISTS notifications_select_own_v2 ON public.notifications;
DROP POLICY IF EXISTS notifications_update_own_v2 ON public.notifications;
DROP POLICY IF EXISTS notifications_delete_own_v2 ON public.notifications;
DROP POLICY IF EXISTS notifications_insert_own_v2 ON public.notifications;

-- New v3 policies: ownership + active BU
-- bu_id IS NULL fallback covers legacy/system-wide notifications
CREATE POLICY notifications_select_own_bu_v3
  ON public.notifications
  FOR SELECT
  USING (
    user_id = auth.uid()
    AND (bu_id IS NULL OR public.is_current_bu(bu_id))
  );

CREATE POLICY notifications_insert_own_bu_v3
  ON public.notifications
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (bu_id IS NULL OR public.is_current_bu(bu_id))
  );

CREATE POLICY notifications_update_own_bu_v3
  ON public.notifications
  FOR UPDATE
  USING (
    user_id = auth.uid()
    AND (bu_id IS NULL OR public.is_current_bu(bu_id))
  )
  WITH CHECK (
    user_id = auth.uid()
    AND (bu_id IS NULL OR public.is_current_bu(bu_id))
  );

CREATE POLICY notifications_delete_own_bu_v3
  ON public.notifications
  FOR DELETE
  USING (
    user_id = auth.uid()
    AND (bu_id IS NULL OR public.is_current_bu(bu_id))
  );

-- Harden RPCs to only act within active BU
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.notifications
  SET is_read = true, read_at = now()
  WHERE id = p_notification_id
    AND user_id = auth.uid()
    AND (bu_id IS NULL OR public.is_current_bu(bu_id));

  RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.notifications
  SET is_read = true, read_at = now()
  WHERE user_id = auth.uid()
    AND is_read = false
    AND (bu_id IS NULL OR public.is_current_bu(bu_id));

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;