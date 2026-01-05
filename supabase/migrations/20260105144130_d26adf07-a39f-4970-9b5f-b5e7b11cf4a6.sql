
-- =============================================
-- MÓDULO ASSETS - ESTRUTURA COMPLETA
-- =============================================

-- 1. ENUM TYPES
-- =============================================

-- Status de itens de inventário
CREATE TYPE asset_inventory_status AS ENUM ('available', 'loaned', 'maintenance', 'written_off');

-- Tipos de movimentação de inventário
CREATE TYPE asset_movement_type AS ENUM ('checkout', 'return', 'transfer', 'maintenance_start', 'maintenance_end', 'write_off');

-- Tipos de holder (quem possui o item)
CREATE TYPE asset_holder_type AS ENUM ('location', 'user');

-- Status de chaveiro
CREATE TYPE keyring_status AS ENUM ('available', 'loaned', 'lost', 'retired');

-- Status de chave individual
CREATE TYPE key_status AS ENUM ('in_claviculary', 'loaned', 'lost', 'retired');

-- Tipo de acesso da chave
CREATE TYPE key_access_type AS ENUM ('door', 'padlock', 'gate', 'other');

-- Tipos de movimentação de chaveiro
CREATE TYPE key_movement_type AS ENUM ('checkout', 'return', 'transfer', 'lost', 'retired');

-- Status de item de brinde
CREATE TYPE gift_item_status AS ENUM ('active', 'inactive');

-- Tipos de movimentação de brinde
CREATE TYPE gift_movement_type AS ENUM ('in', 'out', 'adjustment');

-- Tipos de destino de brinde
CREATE TYPE gift_destination_type AS ENUM ('event', 'campaign', 'person', 'other');

-- Roles de permissão do módulo Assets
CREATE TYPE asset_permission_role AS ENUM (
  'assets_admin',        -- administra todos os sub-módulos
  'inventory_admin',     -- administra apenas inventário
  'inventory_manager',   -- pode movimentar inventário
  'keys_admin',          -- administra apenas chaves
  'keys_manager',        -- pode registrar retirada/devolução
  'gifts_admin',         -- administra apenas brindes
  'gifts_manager',       -- pode registrar entradas/saídas
  'viewer'               -- apenas visualiza
);

-- 2. PERMISSÕES DO MÓDULO ASSETS
-- =============================================

CREATE TABLE public.asset_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role asset_permission_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(bu_id, user_id, role)
);

CREATE INDEX idx_asset_permissions_bu_user ON public.asset_permissions(bu_id, user_id);

-- 3. INVENTÁRIO (PATRIMONIAL)
-- =============================================

-- Categorias de inventário
CREATE TABLE public.asset_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  name text NOT NULL,
  parent_id uuid REFERENCES public.asset_categories(id),
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(bu_id, name, parent_id)
);

CREATE INDEX idx_asset_categories_bu ON public.asset_categories(bu_id) WHERE deleted_at IS NULL;

-- Itens de inventário
CREATE TABLE public.asset_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  internal_code text NOT NULL,
  name text NOT NULL,
  category_id uuid REFERENCES public.asset_categories(id),
  description text,
  status asset_inventory_status NOT NULL DEFAULT 'available',
  
  -- Localização base
  home_location_id uuid REFERENCES public.bu_locations(id),
  
  -- Posse atual
  current_holder_type asset_holder_type NOT NULL DEFAULT 'location',
  current_location_id uuid REFERENCES public.bu_locations(id),
  current_user_id uuid,
  assigned_at timestamptz,
  last_moved_at timestamptz,
  
  -- Dados de aquisição
  acquired_at date,
  acquisition_value numeric,
  serial_number text,
  brand text,
  model text,
  
  -- Quantidades (para itens não unitários)
  quantity_total integer NOT NULL DEFAULT 1,
  quantity_available integer NOT NULL DEFAULT 1,
  
  -- Mídia
  photos jsonb DEFAULT '[]'::jsonb,
  documents jsonb DEFAULT '[]'::jsonb,
  
  notes text,
  
  -- Meta
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  deleted_at timestamptz,
  
  UNIQUE(bu_id, internal_code)
);

CREATE INDEX idx_asset_inventory_bu_status ON public.asset_inventory(bu_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_asset_inventory_holder ON public.asset_inventory(current_holder_type, current_user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_asset_inventory_location ON public.asset_inventory(current_location_id) WHERE deleted_at IS NULL;

-- Movimentações de inventário
CREATE TABLE public.asset_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES public.asset_inventory(id) ON DELETE CASCADE,
  movement_type asset_movement_type NOT NULL,
  
  -- Origem
  from_holder_type asset_holder_type,
  from_location_id uuid REFERENCES public.bu_locations(id),
  from_user_id uuid,
  
  -- Destino
  to_holder_type asset_holder_type,
  to_location_id uuid REFERENCES public.bu_locations(id),
  to_user_id uuid,
  
  -- Responsáveis
  authorized_by_user_id uuid,
  performed_by_user_id uuid NOT NULL,
  
  -- Datas
  occurred_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz,
  returned_at timestamptz,
  
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_asset_movements_asset ON public.asset_movements(asset_id);
CREATE INDEX idx_asset_movements_bu_date ON public.asset_movements(bu_id, occurred_at DESC);
CREATE INDEX idx_asset_movements_pending ON public.asset_movements(bu_id, due_at) 
  WHERE movement_type = 'checkout' AND returned_at IS NULL AND due_at IS NOT NULL;

-- 4. CHAVES (CLAVICULÁRIO)
-- =============================================

-- Claviculário
CREATE TABLE public.asset_clavicularies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.bu_locations(id),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX idx_asset_clavicularies_bu ON public.asset_clavicularies(bu_id) WHERE deleted_at IS NULL;

-- Ganchos do claviculário
CREATE TABLE public.asset_hooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claviculary_id uuid NOT NULL REFERENCES public.asset_clavicularies(id) ON DELETE CASCADE,
  hook_number integer NOT NULL,
  occupied boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(claviculary_id, hook_number)
);

CREATE INDEX idx_asset_hooks_claviculary ON public.asset_hooks(claviculary_id);

-- Chaveiros
CREATE TABLE public.asset_keyrings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  claviculary_id uuid REFERENCES public.asset_clavicularies(id),
  hook_id uuid REFERENCES public.asset_hooks(id),
  name text NOT NULL,
  tag_number text NOT NULL,
  status keyring_status NOT NULL DEFAULT 'available',
  current_user_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(bu_id, tag_number)
);

CREATE INDEX idx_asset_keyrings_bu_status ON public.asset_keyrings(bu_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_asset_keyrings_claviculary ON public.asset_keyrings(claviculary_id) WHERE deleted_at IS NULL;

-- Chaves individuais
CREATE TABLE public.asset_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  keyring_id uuid REFERENCES public.asset_keyrings(id),
  tag_number text NOT NULL,
  description text,
  access_type key_access_type NOT NULL DEFAULT 'door',
  status key_status NOT NULL DEFAULT 'in_claviculary',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(bu_id, tag_number)
);

CREATE INDEX idx_asset_keys_bu ON public.asset_keys(bu_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_asset_keys_keyring ON public.asset_keys(keyring_id) WHERE deleted_at IS NULL;

-- Movimentações de chaveiros
CREATE TABLE public.asset_key_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  keyring_id uuid NOT NULL REFERENCES public.asset_keyrings(id) ON DELETE CASCADE,
  movement_type key_movement_type NOT NULL,
  
  -- Quem está com o chaveiro (para checkout/transfer)
  user_id uuid,
  
  -- Claviculário/gancho de origem/destino
  from_claviculary_id uuid REFERENCES public.asset_clavicularies(id),
  from_hook_id uuid REFERENCES public.asset_hooks(id),
  to_claviculary_id uuid REFERENCES public.asset_clavicularies(id),
  to_hook_id uuid REFERENCES public.asset_hooks(id),
  
  -- Responsáveis
  authorized_by_user_id uuid,
  performed_by_user_id uuid NOT NULL,
  
  -- Datas
  occurred_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz,
  
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_asset_key_movements_keyring ON public.asset_key_movements(keyring_id);
CREATE INDEX idx_asset_key_movements_bu_date ON public.asset_key_movements(bu_id, occurred_at DESC);
CREATE INDEX idx_asset_key_movements_pending ON public.asset_key_movements(bu_id, due_at)
  WHERE movement_type = 'checkout' AND due_at IS NOT NULL;

-- 5. BRINDES
-- =============================================

-- Itens de brinde
CREATE TABLE public.asset_gift_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  status gift_item_status NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX idx_asset_gift_items_bu ON public.asset_gift_items(bu_id) WHERE deleted_at IS NULL;

-- Lotes de brindes
CREATE TABLE public.asset_gift_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  gift_item_id uuid NOT NULL REFERENCES public.asset_gift_items(id) ON DELETE CASCADE,
  batch_code text,
  acquired_at date,
  quantity_in integer NOT NULL DEFAULT 0,
  quantity_available integer NOT NULL DEFAULT 0,
  cost_center text,
  campaign text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX idx_asset_gift_batches_item ON public.asset_gift_batches(gift_item_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_asset_gift_batches_bu ON public.asset_gift_batches(bu_id) WHERE deleted_at IS NULL;

-- Movimentações de brindes
CREATE TABLE public.asset_gift_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  gift_item_id uuid NOT NULL REFERENCES public.asset_gift_items(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES public.asset_gift_batches(id),
  movement_type gift_movement_type NOT NULL,
  quantity integer NOT NULL,
  destination_type gift_destination_type,
  destination_description text,
  performed_by_user_id uuid NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_asset_gift_movements_item ON public.asset_gift_movements(gift_item_id);
CREATE INDEX idx_asset_gift_movements_bu_date ON public.asset_gift_movements(bu_id, occurred_at DESC);

-- 6. FUNÇÕES AUXILIARES
-- =============================================

-- Verifica se usuário tem permissão no módulo Assets
CREATE OR REPLACE FUNCTION public.has_asset_permission(
  p_user_id uuid,
  p_bu_id uuid,
  p_roles asset_permission_role[]
) RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.asset_permissions
    WHERE user_id = p_user_id
      AND bu_id = p_bu_id
      AND role = ANY(p_roles)
  )
  OR is_bu_admin(p_user_id, p_bu_id)
  OR is_platform_admin(p_user_id);
$$;

-- Função para verificar permissão de inventário
CREATE OR REPLACE FUNCTION public.can_manage_inventory(p_user_id uuid, p_bu_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT has_asset_permission(
    p_user_id, 
    p_bu_id, 
    ARRAY['assets_admin', 'inventory_admin', 'inventory_manager']::asset_permission_role[]
  );
$$;

-- Função para verificar permissão de chaves
CREATE OR REPLACE FUNCTION public.can_manage_keys(p_user_id uuid, p_bu_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT has_asset_permission(
    p_user_id, 
    p_bu_id, 
    ARRAY['assets_admin', 'keys_admin', 'keys_manager']::asset_permission_role[]
  );
$$;

-- Função para verificar permissão de brindes
CREATE OR REPLACE FUNCTION public.can_manage_gifts(p_user_id uuid, p_bu_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT has_asset_permission(
    p_user_id, 
    p_bu_id, 
    ARRAY['assets_admin', 'gifts_admin', 'gifts_manager']::asset_permission_role[]
  );
$$;

-- 7. TRIGGERS
-- =============================================

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_asset_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_asset_permissions_updated_at
  BEFORE UPDATE ON public.asset_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_asset_updated_at();

CREATE TRIGGER trg_asset_inventory_updated_at
  BEFORE UPDATE ON public.asset_inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_asset_updated_at();

CREATE TRIGGER trg_asset_keyrings_updated_at
  BEFORE UPDATE ON public.asset_keyrings
  FOR EACH ROW EXECUTE FUNCTION public.update_asset_updated_at();

CREATE TRIGGER trg_asset_keys_updated_at
  BEFORE UPDATE ON public.asset_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_asset_updated_at();

CREATE TRIGGER trg_asset_clavicularies_updated_at
  BEFORE UPDATE ON public.asset_clavicularies
  FOR EACH ROW EXECUTE FUNCTION public.update_asset_updated_at();

CREATE TRIGGER trg_asset_gift_items_updated_at
  BEFORE UPDATE ON public.asset_gift_items
  FOR EACH ROW EXECUTE FUNCTION public.update_asset_updated_at();

CREATE TRIGGER trg_asset_gift_batches_updated_at
  BEFORE UPDATE ON public.asset_gift_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_asset_updated_at();

-- Trigger para atualizar status do inventário após movimentação
CREATE OR REPLACE FUNCTION public.update_inventory_on_movement()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.asset_inventory
  SET 
    status = CASE 
      WHEN NEW.movement_type = 'checkout' THEN 'loaned'::asset_inventory_status
      WHEN NEW.movement_type = 'return' THEN 'available'::asset_inventory_status
      WHEN NEW.movement_type = 'maintenance_start' THEN 'maintenance'::asset_inventory_status
      WHEN NEW.movement_type = 'maintenance_end' THEN 'available'::asset_inventory_status
      WHEN NEW.movement_type = 'write_off' THEN 'written_off'::asset_inventory_status
      WHEN NEW.movement_type = 'transfer' THEN status
      ELSE status
    END,
    current_holder_type = COALESCE(NEW.to_holder_type, current_holder_type),
    current_location_id = CASE 
      WHEN NEW.to_holder_type = 'location' THEN NEW.to_location_id 
      ELSE current_location_id 
    END,
    current_user_id = CASE 
      WHEN NEW.to_holder_type = 'user' THEN NEW.to_user_id 
      ELSE NULL 
    END,
    last_moved_at = NEW.occurred_at,
    assigned_at = CASE 
      WHEN NEW.to_holder_type = 'user' THEN NEW.occurred_at 
      ELSE assigned_at 
    END,
    updated_at = now()
  WHERE id = NEW.asset_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_inventory_on_movement
  AFTER INSERT ON public.asset_movements
  FOR EACH ROW EXECUTE FUNCTION public.update_inventory_on_movement();

-- Trigger para atualizar status do chaveiro e gancho após movimentação
CREATE OR REPLACE FUNCTION public.update_keyring_on_movement()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar status do chaveiro
  UPDATE public.asset_keyrings
  SET 
    status = CASE 
      WHEN NEW.movement_type = 'checkout' THEN 'loaned'::keyring_status
      WHEN NEW.movement_type = 'return' THEN 'available'::keyring_status
      WHEN NEW.movement_type = 'lost' THEN 'lost'::keyring_status
      WHEN NEW.movement_type = 'retired' THEN 'retired'::keyring_status
      ELSE status
    END,
    current_user_id = CASE 
      WHEN NEW.movement_type IN ('checkout', 'transfer') THEN NEW.user_id 
      ELSE NULL 
    END,
    hook_id = CASE 
      WHEN NEW.movement_type = 'return' THEN NEW.to_hook_id 
      WHEN NEW.movement_type = 'checkout' THEN NULL
      ELSE hook_id 
    END,
    updated_at = now()
  WHERE id = NEW.keyring_id;
  
  -- Liberar gancho de origem (se checkout)
  IF NEW.movement_type = 'checkout' AND NEW.from_hook_id IS NOT NULL THEN
    UPDATE public.asset_hooks SET occupied = false WHERE id = NEW.from_hook_id;
  END IF;
  
  -- Ocupar gancho de destino (se return)
  IF NEW.movement_type = 'return' AND NEW.to_hook_id IS NOT NULL THEN
    UPDATE public.asset_hooks SET occupied = true WHERE id = NEW.to_hook_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_keyring_on_movement
  AFTER INSERT ON public.asset_key_movements
  FOR EACH ROW EXECUTE FUNCTION public.update_keyring_on_movement();

-- Trigger para atualizar estoque de brindes após movimentação
CREATE OR REPLACE FUNCTION public.update_gift_stock_on_movement()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.batch_id IS NOT NULL THEN
    UPDATE public.asset_gift_batches
    SET 
      quantity_available = CASE 
        WHEN NEW.movement_type = 'in' THEN quantity_available + NEW.quantity
        WHEN NEW.movement_type = 'out' THEN quantity_available - NEW.quantity
        WHEN NEW.movement_type = 'adjustment' THEN NEW.quantity
        ELSE quantity_available
      END,
      quantity_in = CASE 
        WHEN NEW.movement_type = 'in' THEN quantity_in + NEW.quantity
        ELSE quantity_in
      END,
      updated_at = now()
    WHERE id = NEW.batch_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_gift_stock_on_movement
  AFTER INSERT ON public.asset_gift_movements
  FOR EACH ROW EXECUTE FUNCTION public.update_gift_stock_on_movement();

-- 8. RLS POLICIES
-- =============================================

ALTER TABLE public.asset_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_clavicularies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_hooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_keyrings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_key_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_gift_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_gift_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_gift_movements ENABLE ROW LEVEL SECURITY;

-- Policies para permissões
CREATE POLICY "BU admins can manage asset permissions"
  ON public.asset_permissions FOR ALL
  USING (is_bu_admin(auth.uid(), bu_id) OR is_platform_admin(auth.uid()));

CREATE POLICY "Users can view their permissions"
  ON public.asset_permissions FOR SELECT
  USING (user_id = auth.uid());

-- Policies para categorias
CREATE POLICY "Users can view categories of their BU"
  ON public.asset_categories FOR SELECT
  USING (deleted_at IS NULL AND user_has_bu_access(auth.uid(), bu_id));

CREATE POLICY "Inventory managers can manage categories"
  ON public.asset_categories FOR ALL
  USING (can_manage_inventory(auth.uid(), bu_id));

-- Policies para inventário
CREATE POLICY "Users can view inventory of their BU"
  ON public.asset_inventory FOR SELECT
  USING (deleted_at IS NULL AND user_has_bu_access(auth.uid(), bu_id));

CREATE POLICY "Inventory managers can manage inventory"
  ON public.asset_inventory FOR ALL
  USING (can_manage_inventory(auth.uid(), bu_id));

-- Policy pública para visualização sanitizada (sem login)
CREATE POLICY "Public can view basic inventory info"
  ON public.asset_inventory FOR SELECT
  USING (deleted_at IS NULL AND status != 'written_off');

-- Policies para movimentações de inventário
CREATE POLICY "Users can view movements of their BU"
  ON public.asset_movements FOR SELECT
  USING (user_has_bu_access(auth.uid(), bu_id));

CREATE POLICY "Inventory managers can create movements"
  ON public.asset_movements FOR INSERT
  WITH CHECK (can_manage_inventory(auth.uid(), bu_id));

-- Policies para claviculários
CREATE POLICY "Users can view clavicularies of their BU"
  ON public.asset_clavicularies FOR SELECT
  USING (deleted_at IS NULL AND user_has_bu_access(auth.uid(), bu_id));

CREATE POLICY "Keys managers can manage clavicularies"
  ON public.asset_clavicularies FOR ALL
  USING (can_manage_keys(auth.uid(), bu_id));

-- Policies para ganchos
CREATE POLICY "Users can view hooks"
  ON public.asset_hooks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.asset_clavicularies c 
    WHERE c.id = claviculary_id AND user_has_bu_access(auth.uid(), c.bu_id)
  ));

CREATE POLICY "Keys managers can manage hooks"
  ON public.asset_hooks FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.asset_clavicularies c 
    WHERE c.id = claviculary_id AND can_manage_keys(auth.uid(), c.bu_id)
  ));

-- Policies para chaveiros
CREATE POLICY "Users can view keyrings of their BU"
  ON public.asset_keyrings FOR SELECT
  USING (deleted_at IS NULL AND user_has_bu_access(auth.uid(), bu_id));

CREATE POLICY "Keys managers can manage keyrings"
  ON public.asset_keyrings FOR ALL
  USING (can_manage_keys(auth.uid(), bu_id));

-- Policies para chaves individuais
CREATE POLICY "Users can view keys of their BU"
  ON public.asset_keys FOR SELECT
  USING (deleted_at IS NULL AND user_has_bu_access(auth.uid(), bu_id));

CREATE POLICY "Keys managers can manage keys"
  ON public.asset_keys FOR ALL
  USING (can_manage_keys(auth.uid(), bu_id));

-- Policies para movimentações de chaves
CREATE POLICY "Users can view key movements of their BU"
  ON public.asset_key_movements FOR SELECT
  USING (user_has_bu_access(auth.uid(), bu_id));

CREATE POLICY "Keys managers can create key movements"
  ON public.asset_key_movements FOR INSERT
  WITH CHECK (can_manage_keys(auth.uid(), bu_id));

-- Policies para itens de brinde
CREATE POLICY "Users can view gift items of their BU"
  ON public.asset_gift_items FOR SELECT
  USING (deleted_at IS NULL AND user_has_bu_access(auth.uid(), bu_id));

CREATE POLICY "Gifts managers can manage gift items"
  ON public.asset_gift_items FOR ALL
  USING (can_manage_gifts(auth.uid(), bu_id));

-- Policies para lotes de brindes
CREATE POLICY "Users can view gift batches of their BU"
  ON public.asset_gift_batches FOR SELECT
  USING (deleted_at IS NULL AND user_has_bu_access(auth.uid(), bu_id));

CREATE POLICY "Gifts managers can manage gift batches"
  ON public.asset_gift_batches FOR ALL
  USING (can_manage_gifts(auth.uid(), bu_id));

-- Policies para movimentações de brindes
CREATE POLICY "Users can view gift movements of their BU"
  ON public.asset_gift_movements FOR SELECT
  USING (user_has_bu_access(auth.uid(), bu_id));

CREATE POLICY "Gifts managers can create gift movements"
  ON public.asset_gift_movements FOR INSERT
  WITH CHECK (can_manage_gifts(auth.uid(), bu_id));

-- 9. REGISTRAR MÓDULO
-- =============================================

INSERT INTO public.modules (name, slug, description, icon, route, type, status, display_order, dependencies)
VALUES (
  'Assets',
  'assets',
  'Gerenciamento de patrimônio, chaves e brindes',
  'Package',
  '/assets',
  'operational',
  'active',
  45,
  '{}'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  route = EXCLUDED.route,
  status = EXCLUDED.status;
