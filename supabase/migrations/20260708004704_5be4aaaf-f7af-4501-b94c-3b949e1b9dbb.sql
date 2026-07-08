GRANT SELECT, INSERT, UPDATE, DELETE ON public.analysis_threads TO authenticated;
GRANT ALL ON public.analysis_threads TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analysis_messages TO authenticated;
GRANT ALL ON public.analysis_messages TO service_role;

DROP POLICY IF EXISTS "Users manage own analysis threads" ON public.analysis_threads;
CREATE POLICY "Users manage own analysis threads"
  ON public.analysis_threads FOR ALL TO authenticated
  USING (owner_profile_id = public.my_profile_id())
  WITH CHECK (owner_profile_id = public.my_profile_id());

DROP POLICY IF EXISTS "Users read messages of own threads"    ON public.analysis_messages;
DROP POLICY IF EXISTS "Users insert messages on own threads"  ON public.analysis_messages;
DROP POLICY IF EXISTS "Users delete messages on own threads"  ON public.analysis_messages;

CREATE POLICY "Users read messages of own threads"
  ON public.analysis_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.analysis_threads t
                 WHERE t.id = thread_id AND t.owner_profile_id = public.my_profile_id()));

CREATE POLICY "Users insert messages on own threads"
  ON public.analysis_messages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.analysis_threads t
                      WHERE t.id = thread_id AND t.owner_profile_id = public.my_profile_id()));

CREATE POLICY "Users delete messages on own threads"
  ON public.analysis_messages FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.analysis_threads t
                 WHERE t.id = thread_id AND t.owner_profile_id = public.my_profile_id()));