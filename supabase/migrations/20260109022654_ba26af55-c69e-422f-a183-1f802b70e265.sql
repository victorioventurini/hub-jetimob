-- Enable RLS on notification_health_runbooks (public read only)
ALTER TABLE public.notification_health_runbooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "runbooks_select" ON public.notification_health_runbooks;
CREATE POLICY "runbooks_select" ON public.notification_health_runbooks
  FOR SELECT TO authenticated USING (true);