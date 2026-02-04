-- ============================================================
-- RLS Policies for okr_kr_metrics table
-- Permite vinculação KPI-KR para leaders, owners e co_responsibles
-- ============================================================

-- Policy: INSERT - Apenas quem pode gerenciar a KR pode vincular KPIs
CREATE POLICY "okr_kr_metrics_insert"
ON public.okr_kr_metrics
FOR INSERT
TO authenticated
WITH CHECK (
  -- Para team KRs: verificar ownership, co_responsible ou leadership
  (kr_type = 'team' AND EXISTS (
    SELECT 1 FROM public.okr_team_key_results kr
    WHERE kr.id = okr_kr_metrics.kr_id
    AND (
      kr.owner_user_id = public.my_profile_id()
      OR public.my_profile_id() = ANY(kr.co_responsibles)
      OR public.can_manage_team_okr_by_profile(public.my_profile_id(), kr.team_id)
    )
  ))
  OR
  -- Para org KRs: verificar ownership ou permissão geral
  (kr_type = 'org' AND EXISTS (
    SELECT 1 FROM public.okr_org_key_results kr
    WHERE kr.id = okr_kr_metrics.kr_id
    AND (
      kr.owner_user_id = public.my_profile_id()
      OR public.has_permission(public.my_profile_id(), kr.bu_id, 'okrs.org_kr.update:self_or_owner')
    )
  ))
);

-- Policy: UPDATE - Mesmo critério do INSERT
CREATE POLICY "okr_kr_metrics_update"
ON public.okr_kr_metrics
FOR UPDATE
TO authenticated
USING (
  (kr_type = 'team' AND EXISTS (
    SELECT 1 FROM public.okr_team_key_results kr
    WHERE kr.id = okr_kr_metrics.kr_id
    AND (
      kr.owner_user_id = public.my_profile_id()
      OR public.my_profile_id() = ANY(kr.co_responsibles)
      OR public.can_manage_team_okr_by_profile(public.my_profile_id(), kr.team_id)
    )
  ))
  OR
  (kr_type = 'org' AND EXISTS (
    SELECT 1 FROM public.okr_org_key_results kr
    WHERE kr.id = okr_kr_metrics.kr_id
    AND (
      kr.owner_user_id = public.my_profile_id()
      OR public.has_permission(public.my_profile_id(), kr.bu_id, 'okrs.org_kr.update:self_or_owner')
    )
  ))
)
WITH CHECK (
  (kr_type = 'team' AND EXISTS (
    SELECT 1 FROM public.okr_team_key_results kr
    WHERE kr.id = okr_kr_metrics.kr_id
    AND (
      kr.owner_user_id = public.my_profile_id()
      OR public.my_profile_id() = ANY(kr.co_responsibles)
      OR public.can_manage_team_okr_by_profile(public.my_profile_id(), kr.team_id)
    )
  ))
  OR
  (kr_type = 'org' AND EXISTS (
    SELECT 1 FROM public.okr_org_key_results kr
    WHERE kr.id = okr_kr_metrics.kr_id
    AND (
      kr.owner_user_id = public.my_profile_id()
      OR public.has_permission(public.my_profile_id(), kr.bu_id, 'okrs.org_kr.update:self_or_owner')
    )
  ))
);

-- Policy: DELETE - Para soft delete via UPDATE e delete físico
CREATE POLICY "okr_kr_metrics_delete"
ON public.okr_kr_metrics
FOR DELETE
TO authenticated
USING (
  (kr_type = 'team' AND EXISTS (
    SELECT 1 FROM public.okr_team_key_results kr
    WHERE kr.id = okr_kr_metrics.kr_id
    AND (
      kr.owner_user_id = public.my_profile_id()
      OR public.my_profile_id() = ANY(kr.co_responsibles)
      OR public.can_manage_team_okr_by_profile(public.my_profile_id(), kr.team_id)
    )
  ))
  OR
  (kr_type = 'org' AND EXISTS (
    SELECT 1 FROM public.okr_org_key_results kr
    WHERE kr.id = okr_kr_metrics.kr_id
    AND (
      kr.owner_user_id = public.my_profile_id()
      OR public.has_permission(public.my_profile_id(), kr.bu_id, 'okrs.org_kr.update:self_or_owner')
    )
  ))
);