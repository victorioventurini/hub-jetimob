-- ============================================================================
-- ASSESSMENT CATEGORIES & SUBCATEGORIES
-- Padrão alinhado ao módulo Assessments (RLS via has_assessment_permission,
-- triggers assessment_set_bu_id + update_updated_at_column).
-- ============================================================================

-- 1) Permission key nova
INSERT INTO public.permission_catalog (key, module, resource, action, scope, description, status)
VALUES (
  'assessments.category.manage:bu',
  'assessments',
  'category',
  'manage',
  'bu',
  'Gerenciar categorias e subcategorias de avaliações',
  'active'
)
ON CONFLICT (key) DO NOTHING;

-- 2) Tabela: assessment_categories
CREATE TABLE IF NOT EXISTS public.assessment_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id       uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  status      public.catalog_status NOT NULL DEFAULT 'active',
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz,
  CONSTRAINT assessment_categories_name_length CHECK (char_length(name) BETWEEN 1 AND 120)
);

CREATE INDEX IF NOT EXISTS idx_assessment_categories_bu
  ON public.assessment_categories (bu_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_assessment_categories_bu_name
  ON public.assessment_categories (bu_id, name) WHERE deleted_at IS NULL;

ALTER TABLE public.assessment_categories ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_assessment_categories_bu
  BEFORE INSERT ON public.assessment_categories
  FOR EACH ROW EXECUTE FUNCTION public.assessment_set_bu_id();

CREATE TRIGGER trg_assessment_categories_updated
  BEFORE UPDATE ON public.assessment_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS policies
CREATE POLICY assessment_categories_select
  ON public.assessment_categories
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND public.has_assessment_permission(auth.uid(), bu_id, 'assessments.assessment.view:bu')
  );

CREATE POLICY assessment_categories_insert
  ON public.assessment_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_assessment_permission(auth.uid(), bu_id, 'assessments.category.manage:bu')
  );

CREATE POLICY assessment_categories_update
  ON public.assessment_categories
  FOR UPDATE
  TO authenticated
  USING (
    public.has_assessment_permission(auth.uid(), bu_id, 'assessments.category.manage:bu')
  )
  WITH CHECK (
    public.has_assessment_permission(auth.uid(), bu_id, 'assessments.category.manage:bu')
  );

-- 3) Tabela: assessment_subcategories
CREATE TABLE IF NOT EXISTS public.assessment_subcategories (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id        uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  category_id  uuid NOT NULL REFERENCES public.assessment_categories(id) ON DELETE CASCADE,
  name         text NOT NULL,
  status       public.catalog_status NOT NULL DEFAULT 'active',
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz,
  CONSTRAINT assessment_subcategories_name_length CHECK (char_length(name) BETWEEN 1 AND 120)
);

CREATE INDEX IF NOT EXISTS idx_assessment_subcategories_bu
  ON public.assessment_subcategories (bu_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_assessment_subcategories_category
  ON public.assessment_subcategories (category_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_assessment_subcategories_category_name
  ON public.assessment_subcategories (category_id, name) WHERE deleted_at IS NULL;

ALTER TABLE public.assessment_subcategories ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_assessment_subcategories_bu
  BEFORE INSERT ON public.assessment_subcategories
  FOR EACH ROW EXECUTE FUNCTION public.assessment_set_bu_id();

CREATE TRIGGER trg_assessment_subcategories_updated
  BEFORE UPDATE ON public.assessment_subcategories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validation trigger: subcategoria precisa pertencer à mesma BU da categoria
CREATE OR REPLACE FUNCTION public.assessment_subcategory_validate_bu()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_category_bu uuid;
BEGIN
  SELECT bu_id INTO v_category_bu
  FROM public.assessment_categories
  WHERE id = NEW.category_id;

  IF v_category_bu IS NULL THEN
    RAISE EXCEPTION 'INVALID_CATEGORY: assessment category % not found', NEW.category_id;
  END IF;

  IF NEW.bu_id IS NULL THEN
    NEW.bu_id := v_category_bu;
  ELSIF NEW.bu_id <> v_category_bu THEN
    RAISE EXCEPTION 'BU_MISMATCH: subcategory bu_id (%) differs from category bu_id (%)',
      NEW.bu_id, v_category_bu;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assessment_subcategories_validate_bu
  BEFORE INSERT OR UPDATE OF category_id, bu_id ON public.assessment_subcategories
  FOR EACH ROW EXECUTE FUNCTION public.assessment_subcategory_validate_bu();

-- RLS policies
CREATE POLICY assessment_subcategories_select
  ON public.assessment_subcategories
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND public.has_assessment_permission(auth.uid(), bu_id, 'assessments.assessment.view:bu')
  );

CREATE POLICY assessment_subcategories_insert
  ON public.assessment_subcategories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_assessment_permission(auth.uid(), bu_id, 'assessments.category.manage:bu')
  );

CREATE POLICY assessment_subcategories_update
  ON public.assessment_subcategories
  FOR UPDATE
  TO authenticated
  USING (
    public.has_assessment_permission(auth.uid(), bu_id, 'assessments.category.manage:bu')
  )
  WITH CHECK (
    public.has_assessment_permission(auth.uid(), bu_id, 'assessments.category.manage:bu')
  );

-- 4) Vincular em `assessments`
ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS category_id    uuid REFERENCES public.assessment_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subcategory_id uuid REFERENCES public.assessment_subcategories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_assessments_category
  ON public.assessments (category_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_assessments_subcategory
  ON public.assessments (subcategory_id) WHERE deleted_at IS NULL;

-- Validation trigger em assessments: se subcategory_id setado, categoria precisa bater
CREATE OR REPLACE FUNCTION public.assessment_validate_category_subcategory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sub_category uuid;
  v_sub_bu       uuid;
BEGIN
  IF NEW.subcategory_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT category_id, bu_id INTO v_sub_category, v_sub_bu
  FROM public.assessment_subcategories
  WHERE id = NEW.subcategory_id;

  IF v_sub_category IS NULL THEN
    RAISE EXCEPTION 'INVALID_SUBCATEGORY: subcategory % not found', NEW.subcategory_id;
  END IF;

  IF NEW.category_id IS NULL THEN
    NEW.category_id := v_sub_category;
  ELSIF NEW.category_id <> v_sub_category THEN
    RAISE EXCEPTION 'CATEGORY_SUBCATEGORY_MISMATCH: subcategory % does not belong to category %',
      NEW.subcategory_id, NEW.category_id;
  END IF;

  IF NEW.bu_id IS NOT NULL AND v_sub_bu IS NOT NULL AND NEW.bu_id <> v_sub_bu THEN
    RAISE EXCEPTION 'BU_MISMATCH: assessment bu_id (%) differs from subcategory bu_id (%)',
      NEW.bu_id, v_sub_bu;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assessments_validate_category
  BEFORE INSERT OR UPDATE OF category_id, subcategory_id ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.assessment_validate_category_subcategory();