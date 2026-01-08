-- Batch 4: OKR tables (corrected)

-- Tables WITH bu_id
CREATE POLICY "okr_org_objectives_select" ON public.okr_org_objectives FOR SELECT TO authenticated USING (public.is_bu_member(auth.uid(), bu_id));
CREATE POLICY "okr_org_objectives_manage" ON public.okr_org_objectives FOR ALL TO authenticated USING (public.is_bu_member(auth.uid(), bu_id));

CREATE POLICY "okr_org_key_results_select" ON public.okr_org_key_results FOR SELECT TO authenticated USING (public.is_bu_member(auth.uid(), bu_id));
CREATE POLICY "okr_org_key_results_manage" ON public.okr_org_key_results FOR ALL TO authenticated USING (public.is_bu_member(auth.uid(), bu_id));

CREATE POLICY "okr_team_objectives_select" ON public.okr_team_objectives FOR SELECT TO authenticated USING (public.is_bu_member(auth.uid(), bu_id));
CREATE POLICY "okr_team_objectives_manage" ON public.okr_team_objectives FOR ALL TO authenticated USING (public.is_bu_member(auth.uid(), bu_id));

CREATE POLICY "okr_team_key_results_select" ON public.okr_team_key_results FOR SELECT TO authenticated USING (public.is_bu_member(auth.uid(), bu_id));
CREATE POLICY "okr_team_key_results_manage" ON public.okr_team_key_results FOR ALL TO authenticated USING (public.is_bu_member(auth.uid(), bu_id));

CREATE POLICY "okr_checkins_select" ON public.okr_checkins FOR SELECT TO authenticated USING (public.is_bu_member(auth.uid(), bu_id));
CREATE POLICY "okr_checkins_insert" ON public.okr_checkins FOR INSERT TO authenticated WITH CHECK (public.is_bu_member(auth.uid(), bu_id));

CREATE POLICY "okr_initiatives_select" ON public.okr_initiatives FOR SELECT TO authenticated USING (public.is_bu_member(auth.uid(), bu_id));
CREATE POLICY "okr_initiatives_manage" ON public.okr_initiatives FOR ALL TO authenticated USING (public.is_bu_member(auth.uid(), bu_id));

CREATE POLICY "okr_contributions_select" ON public.okr_contributions FOR SELECT TO authenticated USING (public.is_bu_member(auth.uid(), bu_id));
CREATE POLICY "okr_contributions_manage" ON public.okr_contributions FOR ALL TO authenticated USING (public.is_bu_member(auth.uid(), bu_id));

CREATE POLICY "okr_insights_select" ON public.okr_insights FOR SELECT TO authenticated USING (public.is_bu_member(auth.uid(), bu_id));

CREATE POLICY "okr_coaching_events_select" ON public.okr_coaching_events FOR SELECT TO authenticated USING (public.is_bu_member(auth.uid(), bu_id));
CREATE POLICY "okr_coaching_events_insert" ON public.okr_coaching_events FOR INSERT TO authenticated WITH CHECK (public.is_bu_member(auth.uid(), bu_id));

CREATE POLICY "okr_objective_reviews_select" ON public.okr_objective_reviews FOR SELECT TO authenticated USING (public.is_bu_member(auth.uid(), bu_id));
CREATE POLICY "okr_objective_reviews_insert" ON public.okr_objective_reviews FOR INSERT TO authenticated WITH CHECK (public.is_bu_member(auth.uid(), bu_id));

-- Tables WITHOUT bu_id (use true for read, join for context)
CREATE POLICY "okr_audit_log_select" ON public.okr_audit_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "okr_cancellation_reasons_select" ON public.okr_cancellation_reasons FOR SELECT TO authenticated USING (true);

CREATE POLICY "okr_dependencies_select" ON public.okr_dependencies FOR SELECT TO authenticated USING (true);
CREATE POLICY "okr_dependencies_manage" ON public.okr_dependencies FOR ALL TO authenticated USING (true);

CREATE POLICY "okr_kr_metrics_select" ON public.okr_kr_metrics FOR SELECT TO authenticated USING (true);

CREATE POLICY "okr_notifications_log_select" ON public.okr_notifications_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "okr_reports_config_select" ON public.okr_reports_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "okr_reports_config_admin" ON public.okr_reports_config FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "okr_team_objective_contributors_select" ON public.okr_team_objective_contributors FOR SELECT TO authenticated USING (true);
CREATE POLICY "okr_team_objective_contributors_manage" ON public.okr_team_objective_contributors FOR ALL TO authenticated USING (true);