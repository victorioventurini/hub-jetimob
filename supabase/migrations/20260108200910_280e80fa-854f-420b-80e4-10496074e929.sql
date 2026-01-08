-- ============================================
-- WAVE 10: Permission UX & Governance Hardening
-- ============================================

-- 1. PERMISSION PRESETS
-- Presets group templates for easy 1-click assignment

CREATE TABLE IF NOT EXISTS public.permission_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  module text,
  surface text,
  icon text,
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.permission_presets ENABLE ROW LEVEL SECURITY;

-- Policy: read for authenticated
CREATE POLICY "permission_presets_select" ON public.permission_presets
  FOR SELECT TO authenticated USING (true);

-- Policy: insert/update/delete for super_admin only (via has_role pattern)
CREATE POLICY "permission_presets_admin" ON public.permission_presets
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bu_user_memberships m
      WHERE m.user_id = auth.uid() AND m.role_in_bu = 'super_admin'
    )
  );

-- Junction table: presets contain templates
CREATE TABLE IF NOT EXISTS public.permission_preset_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_id uuid NOT NULL REFERENCES permission_presets(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES permission_templates_v2(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (preset_id, template_id)
);

ALTER TABLE public.permission_preset_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "permission_preset_items_select" ON public.permission_preset_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "permission_preset_items_admin" ON public.permission_preset_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bu_user_memberships m
      WHERE m.user_id = auth.uid() AND m.role_in_bu = 'super_admin'
    )
  );

-- 2. PERMISSION AUDIT LOG
-- Track ALL permission changes with reason

CREATE TABLE IF NOT EXISTS public.permission_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid REFERENCES bu_units(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('assign_template', 'remove_template', 'apply_preset', 'add_override', 'remove_override')),
  entity_type text NOT NULL CHECK (entity_type IN ('template', 'preset', 'override')),
  entity_id uuid,
  entity_name text,
  before_state jsonb,
  after_state jsonb,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.permission_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS: admins can see within their BU
CREATE POLICY "permission_audit_log_select" ON public.permission_audit_log
  FOR SELECT TO authenticated
  USING (
    bu_id IN (
      SELECT m.bu_id FROM bu_user_memberships m
      WHERE m.user_id = auth.uid() AND m.role_in_bu IN ('admin', 'super_admin')
    )
  );

-- Anyone authenticated can insert (controlled by app logic)
CREATE POLICY "permission_audit_log_insert" ON public.permission_audit_log
  FOR INSERT TO authenticated WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_permission_audit_log_bu ON permission_audit_log(bu_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_log_target ON permission_audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_log_created ON permission_audit_log(created_at DESC);

-- 3. PERMISSION DIFF RPC
-- Get diff between current and proposed templates

CREATE OR REPLACE FUNCTION get_permission_diff(
  p_user_id uuid,
  p_bu_id uuid,
  p_new_template_ids uuid[]
)
RETURNS TABLE(
  permission_key text,
  change_type text,  -- 'add' or 'remove'
  source_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_keys text[];
  v_new_keys text[];
BEGIN
  -- Get current permission keys from assigned templates
  SELECT COALESCE(array_agg(DISTINCT ti.permission_key), '{}')
  INTO v_current_keys
  FROM bu_user_permission_templates_v2 ut
  JOIN permission_template_items_v2 ti ON ti.template_id = ut.template_id
  WHERE ut.bu_id = p_bu_id AND ut.user_id = p_user_id;

  -- Get new permission keys from proposed templates
  SELECT COALESCE(array_agg(DISTINCT ti.permission_key), '{}')
  INTO v_new_keys
  FROM unnest(p_new_template_ids) AS new_tid
  JOIN permission_template_items_v2 ti ON ti.template_id = new_tid;

  -- Return additions (in new but not in current)
  RETURN QUERY
  SELECT 
    ti.permission_key,
    'add'::text,
    pt.name
  FROM unnest(p_new_template_ids) AS new_tid
  JOIN permission_template_items_v2 ti ON ti.template_id = new_tid
  JOIN permission_templates_v2 pt ON pt.id = new_tid
  WHERE NOT (ti.permission_key = ANY(v_current_keys));

  -- Return removals (in current but not in new)
  RETURN QUERY
  SELECT 
    ti.permission_key,
    'remove'::text,
    pt.name
  FROM bu_user_permission_templates_v2 ut
  JOIN permission_template_items_v2 ti ON ti.template_id = ut.template_id
  JOIN permission_templates_v2 pt ON pt.id = ut.template_id
  WHERE ut.bu_id = p_bu_id 
    AND ut.user_id = p_user_id
    AND NOT (ti.permission_key = ANY(v_new_keys));
END;
$$;

-- 4. EXPLAIN PERMISSION RPC
-- Answer: "Why do I have this permission?"

CREATE OR REPLACE FUNCTION explain_permission(
  p_user_id uuid,
  p_bu_id uuid,
  p_permission_key text
)
RETURNS TABLE(
  source_type text,
  source_id uuid,
  source_name text,
  granted_at timestamptz,
  granted_by uuid,
  granted_by_name text,
  is_auto_assigned boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check templates
  RETURN QUERY
  SELECT 
    'template'::text as source_type,
    pt.id as source_id,
    pt.name as source_name,
    ut.created_at as granted_at,
    ut.created_by as granted_by,
    COALESCE(p.display_name, 'Sistema') as granted_by_name,
    (pt.slug = 'collaborator_base_v2') as is_auto_assigned
  FROM bu_user_permission_templates_v2 ut
  JOIN permission_templates_v2 pt ON pt.id = ut.template_id
  JOIN permission_template_items_v2 ti ON ti.template_id = pt.id
  LEFT JOIN profiles p ON p.id = ut.created_by
  WHERE ut.user_id = p_user_id
    AND ut.bu_id = p_bu_id
    AND ti.permission_key = p_permission_key;

  -- Check overrides (allow)
  RETURN QUERY
  SELECT 
    'override'::text as source_type,
    o.id as source_id,
    pc.key as source_name,
    o.created_at as granted_at,
    NULL::uuid as granted_by,
    'Override direto' as granted_by_name,
    false as is_auto_assigned
  FROM bu_user_permission_overrides o
  JOIN permission_catalog pc ON pc.id = o.permission_id
  WHERE o.user_id = p_user_id
    AND o.bu_id = p_bu_id
    AND o.effect = 'allow'
    AND pc.key = p_permission_key;
END;
$$;

-- 5. PERMISSION RISK REPORT VIEW
-- Detect over-permission patterns

CREATE OR REPLACE VIEW v_permission_risk_report AS
WITH user_template_counts AS (
  SELECT 
    ut.user_id,
    ut.bu_id,
    COUNT(DISTINCT ut.template_id) as template_count,
    COUNT(DISTINCT ti.permission_key) as permission_count,
    bool_or(pt.slug LIKE '%admin%') as has_admin_template,
    bool_or(pt.slug LIKE '%operator%' OR pt.slug LIKE '%manager%') as has_operator_template
  FROM bu_user_permission_templates_v2 ut
  JOIN permission_templates_v2 pt ON pt.id = ut.template_id
  JOIN permission_template_items_v2 ti ON ti.template_id = pt.id
  GROUP BY ut.user_id, ut.bu_id
),
disabled_module_access AS (
  SELECT 
    ut.user_id,
    ut.bu_id,
    array_agg(DISTINCT pt.module) as modules_with_access
  FROM bu_user_permission_templates_v2 ut
  JOIN permission_templates_v2 pt ON pt.id = ut.template_id
  WHERE pt.module IS NOT NULL
    AND pt.module NOT IN (
      SELECT m.slug FROM bu_module_configs bmc
      JOIN modules m ON m.id = bmc.module_id
      WHERE bmc.bu_id = ut.bu_id AND bmc.is_enabled = true
    )
  GROUP BY ut.user_id, ut.bu_id
)
SELECT 
  utc.user_id,
  utc.bu_id,
  p.display_name as user_name,
  p.work_email as user_email,
  utc.template_count,
  utc.permission_count,
  CASE
    WHEN utc.has_admin_template AND utc.has_operator_template THEN 'high'
    WHEN utc.permission_count > 50 THEN 'medium'
    WHEN dma.modules_with_access IS NOT NULL THEN 'medium'
    ELSE 'low'
  END as risk_level,
  ARRAY_REMOVE(ARRAY[
    CASE WHEN utc.has_admin_template AND utc.has_operator_template 
         THEN 'Admin + operator templates redundantes' END,
    CASE WHEN utc.permission_count > 50 
         THEN 'Alto número de permissões (' || utc.permission_count || ')' END,
    CASE WHEN dma.modules_with_access IS NOT NULL 
         THEN 'Acesso a módulos desabilitados: ' || array_to_string(dma.modules_with_access, ', ') END
  ], NULL) as risk_reasons
FROM user_template_counts utc
JOIN profiles p ON p.id = utc.user_id
LEFT JOIN disabled_module_access dma ON dma.user_id = utc.user_id AND dma.bu_id = utc.bu_id
WHERE utc.has_admin_template AND utc.has_operator_template
   OR utc.permission_count > 50
   OR dma.modules_with_access IS NOT NULL;

-- 6. USERS WITHOUT TEMPLATES VIEW (Guardrail)
-- Already exists from Wave 9, but adding more context

CREATE OR REPLACE VIEW v_users_without_templates AS
SELECT 
  m.user_id,
  m.bu_id,
  p.display_name,
  p.work_email,
  m.role_in_bu,
  m.created_at as membership_created_at
FROM bu_user_memberships m
JOIN profiles p ON p.id = m.user_id
LEFT JOIN bu_user_permission_templates_v2 t 
  ON t.user_id = m.user_id AND t.bu_id = m.bu_id
WHERE t.id IS NULL
  AND m.role_in_bu NOT IN ('super_admin', 'admin');

-- 7. PERMISSIONS WITHOUT EXPLANATION VIEW
-- Orphan permissions that shouldn't exist

CREATE OR REPLACE VIEW v_permissions_without_explanation AS
SELECT 
  pc.key as permission_key,
  pc.module,
  pc.resource,
  pc.action,
  pc.status
FROM permission_catalog pc
LEFT JOIN permission_template_items_v2 ti ON ti.permission_key = pc.key
WHERE ti.permission_key IS NULL
  AND pc.status = 'active';

-- 8. SEED INITIAL PRESETS (common patterns)

INSERT INTO permission_presets (slug, name, description, module, surface, icon, sort_order)
VALUES 
  ('assets_viewer', 'Assets - Visualizador', 'Apenas visualização do módulo de ativos', 'assets', 'view', 'Eye', 10),
  ('assets_operator', 'Assets - Operador', 'Gestão operacional de ativos (checkout, movimentos)', 'assets', 'operate', 'Settings', 20),
  ('assets_admin', 'Assets - Admin', 'Administração completa do módulo de ativos', 'assets', 'administer', 'Shield', 30),
  ('okrs_collaborator', 'OKRs - Colaborador', 'Visualização e gestão de OKRs próprios', 'okrs', 'view', 'Target', 10),
  ('okrs_leader', 'OKRs - Líder', 'Gestão de OKRs do time e subordinados', 'okrs', 'operate', 'Users', 20),
  ('okrs_admin', 'OKRs - Admin', 'Administração completa do módulo de OKRs', 'okrs', 'administer', 'Shield', 30),
  ('tickets_agent', 'Tickets - Agente', 'Atendimento e resolução de tickets', 'tickets', 'operate', 'MessageSquare', 10),
  ('tickets_manager', 'Tickets - Gestor', 'Gestão de filas e equipes de atendimento', 'tickets', 'operate', 'LayoutList', 20),
  ('tickets_admin', 'Tickets - Admin', 'Administração completa do módulo de tickets', 'tickets', 'administer', 'Shield', 30),
  ('kpis_viewer', 'KPIs - Visualizador', 'Apenas visualização de KPIs', 'kpis', 'view', 'BarChart2', 10),
  ('kpis_editor', 'KPIs - Editor', 'Criação e edição de KPIs', 'kpis', 'operate', 'Edit3', 20),
  ('kpis_admin', 'KPIs - Admin', 'Administração completa do módulo de KPIs', 'kpis', 'administer', 'Shield', 30)
ON CONFLICT (slug) DO NOTHING;

-- 9. LOG FUNCTION FOR PERMISSION CHANGES

CREATE OR REPLACE FUNCTION log_permission_change(
  p_bu_id uuid,
  p_target_user_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_entity_name text,
  p_before_state jsonb,
  p_after_state jsonb,
  p_reason text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO permission_audit_log (
    bu_id, target_user_id, actor_id, action, entity_type, 
    entity_id, entity_name, before_state, after_state, reason
  )
  VALUES (
    p_bu_id, p_target_user_id, auth.uid(), p_action, p_entity_type,
    p_entity_id, p_entity_name, p_before_state, p_after_state, p_reason
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;