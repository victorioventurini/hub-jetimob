-- =============================================
-- ASSET GROUPS (KITS) - Tabelas e RLS
-- =============================================

-- Enum para tipo de grupo
DO $$ BEGIN
  CREATE TYPE asset_group_type AS ENUM ('kit', 'bundle');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enum para status do grupo
DO $$ BEGIN
  CREATE TYPE asset_group_status AS ENUM ('active', 'inactive');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enum para role do item no grupo
DO $$ BEGIN
  CREATE TYPE asset_group_item_role AS ENUM ('primary', 'accessory');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- TABELA: asset_groups
-- =============================================
CREATE TABLE IF NOT EXISTS public.asset_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bu_id UUID NOT NULL REFERENCES public.bu_units(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  primary_asset_id UUID REFERENCES public.asset_inventory(id) ON DELETE SET NULL,
  type asset_group_type NOT NULL DEFAULT 'kit',
  notes TEXT,
  status asset_group_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_asset_groups_bu_id ON public.asset_groups(bu_id);
CREATE INDEX IF NOT EXISTS idx_asset_groups_primary_asset ON public.asset_groups(primary_asset_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_asset_groups_status ON public.asset_groups(status) WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE public.asset_groups ENABLE ROW LEVEL SECURITY;

-- Política de leitura: usuários com acesso à BU e permissão de assets
CREATE POLICY "asset_groups_select"
ON public.asset_groups
FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL
  AND user_has_bu_access(auth.uid(), bu_id)
  AND has_asset_permission(auth.uid(), bu_id, ARRAY['assets_admin', 'inventory_admin', 'inventory_manager', 'viewer']::asset_permission_role[])
);

-- Política de inserção: apenas admin de inventário
CREATE POLICY "asset_groups_insert"
ON public.asset_groups
FOR INSERT
TO authenticated
WITH CHECK (
  user_has_bu_access(auth.uid(), bu_id)
  AND has_asset_permission(auth.uid(), bu_id, ARRAY['assets_admin', 'inventory_admin']::asset_permission_role[])
);

-- Política de atualização: apenas admin de inventário
CREATE POLICY "asset_groups_update"
ON public.asset_groups
FOR UPDATE
TO authenticated
USING (
  user_has_bu_access(auth.uid(), bu_id)
  AND has_asset_permission(auth.uid(), bu_id, ARRAY['assets_admin', 'inventory_admin']::asset_permission_role[])
)
WITH CHECK (
  user_has_bu_access(auth.uid(), bu_id)
  AND has_asset_permission(auth.uid(), bu_id, ARRAY['assets_admin', 'inventory_admin']::asset_permission_role[])
);

-- Política de delete: apenas admin (soft delete via update)
CREATE POLICY "asset_groups_delete"
ON public.asset_groups
FOR DELETE
TO authenticated
USING (
  user_has_bu_access(auth.uid(), bu_id)
  AND has_asset_permission(auth.uid(), bu_id, ARRAY['assets_admin', 'inventory_admin']::asset_permission_role[])
);

-- =============================================
-- TABELA: asset_group_items
-- =============================================
CREATE TABLE IF NOT EXISTS public.asset_group_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bu_id UUID NOT NULL REFERENCES public.bu_units(id) ON DELETE RESTRICT,
  group_id UUID NOT NULL REFERENCES public.asset_groups(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.asset_inventory(id) ON DELETE RESTRICT,
  role asset_group_item_role NOT NULL DEFAULT 'accessory',
  is_required BOOLEAN NOT NULL DEFAULT false,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_asset_group_items_group_id ON public.asset_group_items(group_id);
CREATE INDEX IF NOT EXISTS idx_asset_group_items_asset_id ON public.asset_group_items(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_group_items_bu_id ON public.asset_group_items(bu_id);

-- Constraint única: um asset só pode estar em um kit ativo por vez
CREATE UNIQUE INDEX IF NOT EXISTS idx_asset_group_items_unique_active
ON public.asset_group_items(asset_id)
WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE public.asset_group_items ENABLE ROW LEVEL SECURITY;

-- Política de leitura
CREATE POLICY "asset_group_items_select"
ON public.asset_group_items
FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL
  AND user_has_bu_access(auth.uid(), bu_id)
  AND has_asset_permission(auth.uid(), bu_id, ARRAY['assets_admin', 'inventory_admin', 'inventory_manager', 'viewer']::asset_permission_role[])
);

-- Política de inserção
CREATE POLICY "asset_group_items_insert"
ON public.asset_group_items
FOR INSERT
TO authenticated
WITH CHECK (
  user_has_bu_access(auth.uid(), bu_id)
  AND has_asset_permission(auth.uid(), bu_id, ARRAY['assets_admin', 'inventory_admin']::asset_permission_role[])
);

-- Política de atualização
CREATE POLICY "asset_group_items_update"
ON public.asset_group_items
FOR UPDATE
TO authenticated
USING (
  user_has_bu_access(auth.uid(), bu_id)
  AND has_asset_permission(auth.uid(), bu_id, ARRAY['assets_admin', 'inventory_admin']::asset_permission_role[])
)
WITH CHECK (
  user_has_bu_access(auth.uid(), bu_id)
  AND has_asset_permission(auth.uid(), bu_id, ARRAY['assets_admin', 'inventory_admin']::asset_permission_role[])
);

-- Política de delete
CREATE POLICY "asset_group_items_delete"
ON public.asset_group_items
FOR DELETE
TO authenticated
USING (
  user_has_bu_access(auth.uid(), bu_id)
  AND has_asset_permission(auth.uid(), bu_id, ARRAY['assets_admin', 'inventory_admin']::asset_permission_role[])
);

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger para updated_at
CREATE TRIGGER update_asset_groups_updated_at
BEFORE UPDATE ON public.asset_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_asset_updated_at();

CREATE TRIGGER update_asset_group_items_updated_at
BEFORE UPDATE ON public.asset_group_items
FOR EACH ROW
EXECUTE FUNCTION public.update_asset_updated_at();

-- =============================================
-- FUNCTION: Validar que primary_asset_id existe nos items
-- =============================================
CREATE OR REPLACE FUNCTION public.validate_asset_group_primary()
RETURNS TRIGGER AS $$
BEGIN
  -- Se primary_asset_id está sendo definido
  IF NEW.primary_asset_id IS NOT NULL THEN
    -- Verificar se existe um item correspondente
    IF NOT EXISTS (
      SELECT 1 FROM public.asset_group_items
      WHERE group_id = NEW.id
        AND asset_id = NEW.primary_asset_id
        AND deleted_at IS NULL
    ) THEN
      -- Criar automaticamente o item primary
      INSERT INTO public.asset_group_items (bu_id, group_id, asset_id, role, is_required)
      VALUES (NEW.bu_id, NEW.id, NEW.primary_asset_id, 'primary', true);
    ELSE
      -- Atualizar role para primary
      UPDATE public.asset_group_items
      SET role = 'primary', is_required = true, updated_at = now()
      WHERE group_id = NEW.id AND asset_id = NEW.primary_asset_id AND deleted_at IS NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_asset_groups_validate_primary
AFTER INSERT OR UPDATE OF primary_asset_id ON public.asset_groups
FOR EACH ROW
EXECUTE FUNCTION public.validate_asset_group_primary();

-- =============================================
-- FUNCTION: Atualizar primary_asset_id quando item primary é adicionado
-- =============================================
CREATE OR REPLACE FUNCTION public.sync_asset_group_primary_from_item()
RETURNS TRIGGER AS $$
BEGIN
  -- Se um item é marcado como primary
  IF NEW.role = 'primary' AND NEW.deleted_at IS NULL THEN
    -- Desmarcar outros primaries do mesmo grupo
    UPDATE public.asset_group_items
    SET role = 'accessory', updated_at = now()
    WHERE group_id = NEW.group_id
      AND id != NEW.id
      AND role = 'primary'
      AND deleted_at IS NULL;
    
    -- Atualizar o primary_asset_id do grupo
    UPDATE public.asset_groups
    SET primary_asset_id = NEW.asset_id, updated_at = now()
    WHERE id = NEW.group_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_asset_group_items_sync_primary
AFTER INSERT OR UPDATE OF role ON public.asset_group_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_asset_group_primary_from_item();

-- =============================================
-- FUNCTION: Verificar acessórios obrigatórios antes de checkout
-- =============================================
CREATE OR REPLACE FUNCTION public.get_kit_required_accessories(p_asset_id UUID)
RETURNS TABLE (
  asset_id UUID,
  asset_name TEXT,
  internal_code TEXT,
  status TEXT,
  current_holder_type TEXT,
  current_user_id UUID,
  current_location_id UUID,
  is_available BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ai.id as asset_id,
    ai.name as asset_name,
    ai.internal_code,
    ai.status::TEXT,
    ai.current_holder_type::TEXT,
    ai.current_user_id,
    ai.current_location_id,
    (ai.status = 'available') as is_available
  FROM public.asset_groups ag
  JOIN public.asset_group_items agi ON ag.id = agi.group_id AND agi.deleted_at IS NULL
  JOIN public.asset_inventory ai ON agi.asset_id = ai.id AND ai.deleted_at IS NULL
  WHERE ag.primary_asset_id = p_asset_id
    AND ag.status = 'active'
    AND ag.deleted_at IS NULL
    AND agi.is_required = true
    AND agi.role = 'accessory';
END;
$$;

-- =============================================
-- FUNCTION: Obter kit de um asset
-- =============================================
CREATE OR REPLACE FUNCTION public.get_asset_kit(p_asset_id UUID)
RETURNS TABLE (
  group_id UUID,
  group_name TEXT,
  group_type TEXT,
  is_primary BOOLEAN,
  primary_asset_id UUID,
  primary_asset_name TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ag.id as group_id,
    ag.name as group_name,
    ag.type::TEXT as group_type,
    (agi.role = 'primary') as is_primary,
    ag.primary_asset_id,
    pai.name as primary_asset_name
  FROM public.asset_group_items agi
  JOIN public.asset_groups ag ON agi.group_id = ag.id AND ag.deleted_at IS NULL
  LEFT JOIN public.asset_inventory pai ON ag.primary_asset_id = pai.id
  WHERE agi.asset_id = p_asset_id
    AND agi.deleted_at IS NULL
    AND ag.status = 'active';
END;
$$;