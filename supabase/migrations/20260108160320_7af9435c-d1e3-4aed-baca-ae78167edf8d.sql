-- ============================================
-- WAVE 6: PERMISSIONS SIMPLIFICATION
-- Aliases, Templates v2, Surfaces, Preview
-- ============================================

-- 1. PERMISSION KEY ALIASES TABLE
-- --------------------------------
CREATE TABLE IF NOT EXISTS public.permission_key_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  old_key text NOT NULL UNIQUE,
  new_key text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deprecated')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for lookup
CREATE INDEX IF NOT EXISTS idx_permission_key_aliases_old_key ON public.permission_key_aliases(old_key);
CREATE INDEX IF NOT EXISTS idx_permission_key_aliases_new_key ON public.permission_key_aliases(new_key);

-- RLS - only super_admin can manage aliases
ALTER TABLE public.permission_key_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage aliases"
  ON public.permission_key_aliases
  FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Anyone authenticated can read aliases"
  ON public.permission_key_aliases
  FOR SELECT
  TO authenticated
  USING (true);

-- 2. INSERT ALIASES (read -> view normalization)
-- -----------------------------------------------
INSERT INTO public.permission_key_aliases (old_key, new_key, status) VALUES
  -- Assets
  ('assets.inventory.read:bu', 'assets.inventory.view:bu', 'active'),
  ('assets.gifts.read:bu', 'assets.gifts.view:bu', 'active'),
  ('assets.keys.read:bu', 'assets.keys.view:bu', 'active'),
  -- KPIs
  ('kpis.metric.read:bu', 'kpis.metric.view:bu', 'active'),
  ('kpis.value.read:bu', 'kpis.value.view:bu', 'active'),
  -- OKRs
  ('okrs.cycle.read:bu', 'okrs.cycle.view:bu', 'active'),
  ('okrs.initiative.read:bu', 'okrs.initiative.view:bu', 'active'),
  ('okrs.org_objective.read:bu', 'okrs.org_objective.view:bu', 'active'),
  ('okrs.team_objective.read:bu', 'okrs.team_objective.view:bu', 'active'),
  ('okrs.read', 'okrs.view:bu', 'active'),
  -- Tickets
  ('tickets.partner.read:bu', 'tickets.partner.view:bu', 'active'),
  ('tickets.thread.read:bu', 'tickets.thread.view:bu', 'active'),
  ('tickets.read', 'tickets.view:bu', 'active'),
  -- KPIs/Assets short forms
  ('kpis.read', 'kpis.view:bu', 'active'),
  ('assets.read', 'assets.view:bu', 'active')
ON CONFLICT (old_key) DO NOTHING;

-- 3. PERMISSION TEMPLATES V2 TABLE
-- ---------------------------------
CREATE TABLE IF NOT EXISTS public.permission_templates_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  surface text CHECK (surface IN ('view', 'operate', 'administer', 'base', 'restricted')),
  module text,
  is_system boolean NOT NULL DEFAULT true,
  version int NOT NULL DEFAULT 2,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.permission_templates_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage templates v2"
  ON public.permission_templates_v2
  FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Anyone authenticated can read templates v2"
  ON public.permission_templates_v2
  FOR SELECT
  TO authenticated
  USING (true);

-- 4. PERMISSION TEMPLATE ITEMS V2
-- --------------------------------
CREATE TABLE IF NOT EXISTS public.permission_template_items_v2 (
  template_id uuid NOT NULL REFERENCES public.permission_templates_v2(id) ON DELETE CASCADE,
  permission_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (template_id, permission_key)
);

-- RLS
ALTER TABLE public.permission_template_items_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage template items v2"
  ON public.permission_template_items_v2
  FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Anyone authenticated can read template items v2"
  ON public.permission_template_items_v2
  FOR SELECT
  TO authenticated
  USING (true);

-- 5. BU USER PERMISSION TEMPLATES V2 (assignments)
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bu_user_permission_templates_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.permission_templates_v2(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  UNIQUE (bu_id, user_id, template_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bu_user_permission_templates_v2_bu_user 
  ON public.bu_user_permission_templates_v2(bu_id, user_id);
CREATE INDEX IF NOT EXISTS idx_bu_user_permission_templates_v2_template 
  ON public.bu_user_permission_templates_v2(template_id);

-- RLS
ALTER TABLE public.bu_user_permission_templates_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "BU admins can manage template assignments v2"
  ON public.bu_user_permission_templates_v2
  FOR ALL
  TO authenticated
  USING (
    is_current_bu(bu_id) AND (
      is_super_admin(auth.uid()) OR 
      is_bu_admin(auth.uid(), bu_id)
    )
  )
  WITH CHECK (
    is_current_bu(bu_id) AND (
      is_super_admin(auth.uid()) OR 
      is_bu_admin(auth.uid(), bu_id)
    )
  );

CREATE POLICY "Users can read their own template assignments v2"
  ON public.bu_user_permission_templates_v2
  FOR SELECT
  TO authenticated
  USING (
    is_current_bu(bu_id) AND (
      user_id = my_profile_id() OR
      is_super_admin(auth.uid()) OR
      is_bu_admin(auth.uid(), bu_id)
    )
  );

-- 6. INSERT TEMPLATES V2
-- -----------------------
INSERT INTO public.permission_templates_v2 (slug, name, description, surface, module) VALUES
  -- Base templates
  ('collaborator_base_v2', 'Colaborador Base v2', 'Acesso básico para colaboradores internos', 'base', NULL),
  ('external_contact_v2', 'Contato Externo v2', 'Acesso restrito para parceiros externos', 'restricted', 'tickets'),
  
  -- OKRs
  ('okrs_view_v2', 'OKRs: Visualização v2', 'Leitura de OKRs, ciclos e iniciativas', 'view', 'okrs'),
  ('okrs_operate_v2', 'OKRs: Operador v2', 'Criar e editar OKRs do time', 'operate', 'okrs'),
  ('okrs_admin_v2', 'OKRs: Admin v2', 'Gestão completa de OKRs da BU', 'administer', 'okrs'),
  
  -- KPIs
  ('kpis_view_v2', 'KPIs: Visualização v2', 'Leitura de métricas e valores', 'view', 'kpis'),
  ('kpis_operate_v2', 'KPIs: Operador v2', 'Atualizar valores de KPIs', 'operate', 'kpis'),
  ('kpis_admin_v2', 'KPIs: Admin v2', 'Gestão completa de KPIs', 'administer', 'kpis'),
  
  -- Tickets
  ('tickets_view_v2', 'Tickets: Visualização v2', 'Leitura de tickets', 'view', 'tickets'),
  ('tickets_operate_v2', 'Tickets: Operador v2', 'Criar e gerenciar tickets', 'operate', 'tickets'),
  ('tickets_admin_v2', 'Tickets: Admin v2', 'Gestão completa de tickets', 'administer', 'tickets'),
  
  -- Assets: Inventory
  ('inventory_view_v2', 'Inventário: Visualização v2', 'Leitura de inventário', 'view', 'assets'),
  ('inventory_operate_v2', 'Inventário: Operador v2', 'Movimentar itens de inventário', 'operate', 'assets'),
  ('inventory_admin_v2', 'Inventário: Admin v2', 'Gestão completa de inventário', 'administer', 'assets'),
  
  -- Assets: Keys
  ('keys_view_v2', 'Chaves: Visualização v2', 'Leitura de chaves', 'view', 'assets'),
  ('keys_operate_v2', 'Chaves: Operador v2', 'Retirar e devolver chaves', 'operate', 'assets'),
  ('keys_admin_v2', 'Chaves: Admin v2', 'Gestão completa de chaves', 'administer', 'assets'),
  
  -- Assets: Gifts
  ('gifts_view_v2', 'Brindes: Visualização v2', 'Leitura de brindes', 'view', 'assets'),
  ('gifts_operate_v2', 'Brindes: Operador v2', 'Movimentar brindes', 'operate', 'assets'),
  ('gifts_admin_v2', 'Brindes: Admin v2', 'Gestão completa de brindes', 'administer', 'assets'),
  
  -- Teams
  ('teams_view_v2', 'Times: Visualização v2', 'Leitura de times e squads', 'view', 'teams'),
  ('teams_operate_v2', 'Times: Operador v2', 'Gerenciar time próprio', 'operate', 'teams'),
  ('teams_admin_v2', 'Times: Admin v2', 'Gestão completa de times', 'administer', 'teams'),
  
  -- Users
  ('users_view_v2', 'Usuários: Visualização v2', 'Leitura de perfis', 'view', 'users'),
  ('users_operate_v2', 'Usuários: Operador v2', 'Editar próprio perfil', 'operate', 'users'),
  ('users_admin_v2', 'Usuários: Admin v2', 'Gestão completa de usuários', 'administer', 'users'),
  
  -- BU Admin (wildcard - includes everything)
  ('bu_admin_v2', 'Administrador BU v2', 'Acesso total à BU (wildcard)', 'administer', NULL)
ON CONFLICT (slug) DO NOTHING;

-- 7. HELPER FUNCTION: Resolve canonical key
-- ------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_permission_key(p_key text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT new_key FROM permission_key_aliases WHERE old_key = p_key AND status = 'active'),
    p_key
  );
$$;

-- 8. UPDATE has_permission to support aliases
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.has_permission(p_user_id uuid, p_bu_id uuid, p_permission_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_permissions text[];
  v_canonical_key text;
BEGIN
  -- Resolve alias to canonical key
  v_canonical_key := resolve_permission_key(p_permission_key);

  -- Super admin bypass
  IF is_super_admin(p_user_id) THEN
    RETURN true;
  END IF;
  
  -- BU admin bypass
  IF is_bu_admin(p_user_id, p_bu_id) THEN
    RETURN true;
  END IF;
  
  -- Check permissions from v1 groups
  SELECT ARRAY_AGG(DISTINCT resolve_permission_key(pc.key))
  INTO v_permissions
  FROM (
    SELECT pgp.permission_id
    FROM public.bu_user_permission_groups upg
    JOIN public.bu_permission_group_configs pgc
      ON pgc.bu_id = upg.bu_id AND pgc.group_id = upg.group_id
    JOIN public.permission_group_permissions pgp
      ON pgp.group_id = upg.group_id
    WHERE upg.user_id = p_user_id
      AND upg.bu_id = p_bu_id
      AND pgc.is_enabled = true
    UNION
    SELECT o.permission_id
    FROM public.bu_user_permission_overrides o
    WHERE o.user_id = p_user_id
      AND o.bu_id = p_bu_id
      AND o.effect = 'allow'
  ) perms
  JOIN public.permission_catalog pc ON pc.id = perms.permission_id
  WHERE pc.status = 'active';
  
  -- Also check v2 templates
  v_permissions := v_permissions || (
    SELECT COALESCE(ARRAY_AGG(DISTINCT pti.permission_key), ARRAY[]::text[])
    FROM public.bu_user_permission_templates_v2 upt
    JOIN public.permission_template_items_v2 pti ON pti.template_id = upt.template_id
    WHERE upt.user_id = p_user_id AND upt.bu_id = p_bu_id
  );
  
  RETURN v_canonical_key = ANY(COALESCE(v_permissions, ARRAY[]::text[]));
END;
$$;

-- 9. UPDATE get_my_permissions to return canonical keys
-- ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_permissions(p_bu_id uuid)
RETURNS text[]
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_permissions text[];
  v_permissions_v2 text[];
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN ARRAY[]::text[];
  END IF;
  
  -- Super admin gets wildcard
  IF is_super_admin(v_user_id) THEN
    RETURN ARRAY['*']::text[];
  END IF;
  
  -- BU admin gets wildcard
  IF is_bu_admin(v_user_id, p_bu_id) THEN
    RETURN ARRAY['*']::text[];
  END IF;
  
  -- Check BU access
  IF NOT user_has_bu_access(v_user_id, p_bu_id) THEN
    RETURN ARRAY[]::text[];
  END IF;
  
  -- Get v1 permissions (resolved to canonical)
  SELECT ARRAY_AGG(DISTINCT resolve_permission_key(pc.key))
  INTO v_permissions
  FROM (
    SELECT pgp.permission_id
    FROM public.bu_user_permission_groups upg
    JOIN public.bu_permission_group_configs pgc
      ON pgc.bu_id = upg.bu_id AND pgc.group_id = upg.group_id
    JOIN public.permission_group_permissions pgp
      ON pgp.group_id = upg.group_id
    WHERE upg.user_id = v_user_id
      AND upg.bu_id = p_bu_id
      AND pgc.is_enabled = true
    UNION
    SELECT o.permission_id
    FROM public.bu_user_permission_overrides o
    WHERE o.user_id = v_user_id
      AND o.bu_id = p_bu_id
      AND o.effect = 'allow'
  ) perms
  JOIN public.permission_catalog pc ON pc.id = perms.permission_id
  WHERE pc.status = 'active';
  
  -- Get v2 permissions
  SELECT ARRAY_AGG(DISTINCT pti.permission_key)
  INTO v_permissions_v2
  FROM public.bu_user_permission_templates_v2 upt
  JOIN public.permission_template_items_v2 pti ON pti.template_id = upt.template_id
  WHERE upt.user_id = v_user_id AND upt.bu_id = p_bu_id;
  
  -- Merge both
  RETURN COALESCE(v_permissions, ARRAY[]::text[]) || COALESCE(v_permissions_v2, ARRAY[]::text[]);
END;
$$;

-- 10. RPC: Get effective permissions preview
-- -------------------------------------------
CREATE OR REPLACE FUNCTION public.get_effective_permissions_preview(
  p_bu_id uuid,
  p_user_id uuid,
  p_mode text DEFAULT 'both'
)
RETURNS TABLE (
  permission_key text,
  source text,
  source_name text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can preview other users' permissions
  IF p_user_id != auth.uid() AND NOT is_super_admin(auth.uid()) AND NOT is_bu_admin(auth.uid(), p_bu_id) THEN
    RETURN;
  END IF;

  -- V1 permissions
  IF p_mode IN ('v1', 'both') THEN
    RETURN QUERY
    SELECT DISTINCT
      resolve_permission_key(pc.key) as permission_key,
      'template_v1'::text as source,
      pg.name as source_name
    FROM public.bu_user_permission_groups upg
    JOIN public.bu_permission_group_configs pgc
      ON pgc.bu_id = upg.bu_id AND pgc.group_id = upg.group_id
    JOIN public.permission_groups pg ON pg.id = upg.group_id
    JOIN public.permission_group_permissions pgp ON pgp.group_id = upg.group_id
    JOIN public.permission_catalog pc ON pc.id = pgp.permission_id
    WHERE upg.user_id = p_user_id
      AND upg.bu_id = p_bu_id
      AND pgc.is_enabled = true
      AND pc.status = 'active';

    RETURN QUERY
    SELECT DISTINCT
      resolve_permission_key(pc.key) as permission_key,
      'override'::text as source,
      'Override direto'::text as source_name
    FROM public.bu_user_permission_overrides o
    JOIN public.permission_catalog pc ON pc.id = o.permission_id
    WHERE o.user_id = p_user_id
      AND o.bu_id = p_bu_id
      AND o.effect = 'allow'
      AND pc.status = 'active';
  END IF;

  -- V2 permissions
  IF p_mode IN ('v2', 'both') THEN
    RETURN QUERY
    SELECT DISTINCT
      pti.permission_key,
      'template_v2'::text as source,
      pt.name as source_name
    FROM public.bu_user_permission_templates_v2 upt
    JOIN public.permission_templates_v2 pt ON pt.id = upt.template_id
    JOIN public.permission_template_items_v2 pti ON pti.template_id = upt.template_id
    WHERE upt.user_id = p_user_id AND upt.bu_id = p_bu_id;
  END IF;
END;
$$;

-- 11. Grant execute on new functions
GRANT EXECUTE ON FUNCTION public.resolve_permission_key(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_effective_permissions_preview(uuid, uuid, text) TO authenticated;