-- Batch 2: KPIs, Notifications, Misc

-- KPIs
CREATE POLICY "kpi_metrics_select" ON public.kpi_metrics FOR SELECT TO authenticated USING (public.is_bu_member(auth.uid(), bu_id));
CREATE POLICY "kpi_metrics_admin" ON public.kpi_metrics FOR ALL TO authenticated USING (public.is_bu_admin(auth.uid(), bu_id) OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "kpi_values_select" ON public.kpi_values FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.kpi_metrics km WHERE km.id = kpi_id AND public.is_bu_member(auth.uid(), km.bu_id))
);
CREATE POLICY "kpi_values_insert" ON public.kpi_values FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.kpi_metrics km WHERE km.id = kpi_id AND public.is_bu_member(auth.uid(), km.bu_id))
);

CREATE POLICY "metrics_select" ON public.metrics FOR SELECT TO authenticated USING (true);

-- Notifications
CREATE POLICY "notifications_own" ON public.notifications FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notification_deliveries_select" ON public.notification_deliveries FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.notifications n WHERE n.id = notification_id AND n.user_id = auth.uid())
);
CREATE POLICY "notification_outbox_admin" ON public.notification_outbox FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "notification_templates_select" ON public.notification_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "notification_events_select" ON public.notification_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "notification_channels_select" ON public.notification_channels FOR SELECT TO authenticated USING (true);
CREATE POLICY "bu_notification_channels_select" ON public.bu_notification_channels FOR SELECT TO authenticated USING (public.is_bu_member(auth.uid(), bu_id));
CREATE POLICY "user_notification_preferences_own" ON public.user_notification_preferences FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_notification_preferences_v2_own" ON public.user_notification_preferences_v2 FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_preferences_own" ON public.user_preferences FOR ALL TO authenticated USING (user_id = auth.uid());

-- Misc
CREATE POLICY "mentions_select" ON public.mentions FOR SELECT TO authenticated USING (mentioned_user_id = auth.uid());
CREATE POLICY "app_error_logs_admin" ON public.app_error_logs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "audit_logs_admin" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));