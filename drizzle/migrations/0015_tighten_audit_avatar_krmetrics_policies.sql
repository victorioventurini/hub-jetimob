DROP POLICY IF EXISTS "permission_audit_log_insert" ON public.permission_audit_log;
DROP POLICY IF EXISTS "Audit logs insertable by authenticated" ON public.notification_template_audit_log;

DROP POLICY IF EXISTS "okr_kr_metrics_select" ON public.okr_kr_metrics;
CREATE POLICY "okr_kr_metrics_select" ON public.okr_kr_metrics FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.okr_team_key_results k WHERE k.id = okr_kr_metrics.kr_id)
  OR EXISTS (SELECT 1 FROM public.okr_org_key_results k WHERE k.id = okr_kr_metrics.kr_id)
);

DROP POLICY IF EXISTS "Users can upload own profile avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own profile avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own profile avatar" ON storage.objects;
CREATE POLICY "Users can upload own profile avatar" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'profiles' AND (storage.foldername(name))[1] = 'avatars'
  AND auth.uid() IS NOT NULL AND storage.filename(name) LIKE public.current_profile_id()::text || '-%');
CREATE POLICY "Users can update own profile avatar" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'profiles' AND (storage.foldername(name))[1] = 'avatars' AND owner_id = (select auth.uid()::text));
CREATE POLICY "Users can delete own profile avatar" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'profiles' AND (storage.foldername(name))[1] = 'avatars' AND owner_id = (select auth.uid()::text));