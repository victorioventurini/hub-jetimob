
-- =============================================
-- Submódulo: Linhas Telefônicas (Assets)
-- =============================================

-- 1. Tabela principal
CREATE TABLE public.asset_phone_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES bu_units(id),
  phone_number text NOT NULL,
  carrier text,
  plan_type text NOT NULL DEFAULT 'postpaid' CHECK (plan_type IN ('prepaid', 'postpaid')),
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'loaned')),
  current_user_id uuid REFERENCES profiles(id),
  linked_asset_id uuid REFERENCES asset_inventory(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 2. Índices
CREATE UNIQUE INDEX idx_phone_lines_bu_number 
  ON asset_phone_lines (bu_id, phone_number) WHERE deleted_at IS NULL;

CREATE INDEX idx_phone_lines_bu_active 
  ON asset_phone_lines (bu_id) WHERE deleted_at IS NULL;

CREATE INDEX idx_phone_lines_status 
  ON asset_phone_lines (bu_id, status) WHERE deleted_at IS NULL;

CREATE INDEX idx_phone_lines_current_user 
  ON asset_phone_lines (current_user_id) WHERE deleted_at IS NULL AND current_user_id IS NOT NULL;

CREATE INDEX idx_phone_lines_linked_asset 
  ON asset_phone_lines (linked_asset_id) WHERE deleted_at IS NULL AND linked_asset_id IS NOT NULL;

-- 3. Validation trigger (loaned requires user)
CREATE OR REPLACE FUNCTION public.validate_phone_line_loan()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'loaned' AND NEW.current_user_id IS NULL THEN
    RAISE EXCEPTION 'current_user_id is required when status is loaned';
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_phone_line_loan
  BEFORE INSERT OR UPDATE ON asset_phone_lines
  FOR EACH ROW EXECUTE FUNCTION public.validate_phone_line_loan();

-- 4. Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_asset_phone_lines_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_updated_at_asset_phone_lines
  BEFORE UPDATE ON asset_phone_lines
  FOR EACH ROW EXECUTE FUNCTION public.update_asset_phone_lines_updated_at();

-- 5. BU Scope enforcement
CREATE TRIGGER trg_enforce_bu_scope_asset_phone_lines
  BEFORE INSERT OR UPDATE ON asset_phone_lines
  FOR EACH ROW EXECUTE FUNCTION public.enforce_bu_scope();

-- 6. RLS
ALTER TABLE asset_phone_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY phone_lines_select ON asset_phone_lines
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND user_has_bu_access(auth.uid(), bu_id)
    AND has_asset_permission(auth.uid(), bu_id, ARRAY['assets_admin','inventory_admin','inventory_manager','viewer']::asset_permission_role[])
  );

CREATE POLICY phone_lines_insert ON asset_phone_lines
  FOR INSERT TO authenticated
  WITH CHECK (
    user_has_bu_access(auth.uid(), bu_id)
    AND has_asset_permission(auth.uid(), bu_id, ARRAY['assets_admin','inventory_admin','inventory_manager']::asset_permission_role[])
  );

CREATE POLICY phone_lines_update ON asset_phone_lines
  FOR UPDATE TO authenticated
  USING (
    user_has_bu_access(auth.uid(), bu_id)
    AND has_asset_permission(auth.uid(), bu_id, ARRAY['assets_admin','inventory_admin','inventory_manager']::asset_permission_role[])
  )
  WITH CHECK (
    user_has_bu_access(auth.uid(), bu_id)
    AND has_asset_permission(auth.uid(), bu_id, ARRAY['assets_admin','inventory_admin','inventory_manager']::asset_permission_role[])
  );

CREATE POLICY phone_lines_delete ON asset_phone_lines
  FOR DELETE TO authenticated
  USING (
    user_has_bu_access(auth.uid(), bu_id)
    AND has_asset_permission(auth.uid(), bu_id, ARRAY['assets_admin','inventory_admin']::asset_permission_role[])
  );
