-- =============================================
-- PARTNER SERVICE MAPPINGS - MIGRAÇÃO COMPLETA
-- =============================================

-- Criar enum para status do mapping
DO $$ BEGIN
  CREATE TYPE partner_service_status AS ENUM ('active', 'inactive');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Criar tabela partner_service_mappings
CREATE TABLE public.partner_service_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id UUID NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  partner_company_id UUID NOT NULL REFERENCES public.partner_companies(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.ticket_categories(id) ON DELETE CASCADE,
  subcategory_id UUID REFERENCES public.ticket_subcategories(id) ON DELETE CASCADE,
  status partner_service_status NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Índice único parcial para evitar duplicatas
CREATE UNIQUE INDEX idx_partner_service_mappings_unique 
ON public.partner_service_mappings (bu_id, partner_company_id, category_id, COALESCE(subcategory_id, '00000000-0000-0000-0000-000000000000'))
WHERE deleted_at IS NULL;

-- Índices para performance
CREATE INDEX idx_partner_service_mappings_partner ON public.partner_service_mappings(partner_company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_partner_service_mappings_category ON public.partner_service_mappings(category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_partner_service_mappings_bu ON public.partner_service_mappings(bu_id) WHERE deleted_at IS NULL;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_partner_service_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_partner_service_mappings_updated_at
BEFORE UPDATE ON public.partner_service_mappings
FOR EACH ROW
EXECUTE FUNCTION public.update_partner_service_mappings_updated_at();

-- VIEW: v_partner_services
CREATE OR REPLACE VIEW public.v_partner_services AS
SELECT 
  psm.id,
  psm.bu_id,
  psm.partner_company_id,
  pc.name AS partner_company_name,
  psm.category_id,
  tc.name AS category_name,
  tc.scope AS category_scope,
  psm.subcategory_id,
  ts.name AS subcategory_name,
  psm.subcategory_id IS NULL AS is_generalist,
  psm.status,
  psm.notes,
  psm.created_at,
  psm.updated_at
FROM public.partner_service_mappings psm
JOIN public.partner_companies pc ON pc.id = psm.partner_company_id AND pc.deleted_at IS NULL
JOIN public.ticket_categories tc ON tc.id = psm.category_id AND tc.deleted_at IS NULL
LEFT JOIN public.ticket_subcategories ts ON ts.id = psm.subcategory_id AND ts.deleted_at IS NULL
WHERE psm.deleted_at IS NULL;

-- FUNÇÃO DE VALIDAÇÃO: Ticket externo × Parceiro × Categoria
CREATE OR REPLACE FUNCTION public.validate_external_ticket_partner_service()
RETURNS TRIGGER AS $$
DECLARE
  v_has_mapping BOOLEAN;
  v_has_generalist BOOLEAN;
BEGIN
  -- Só valida tickets externos
  IF NEW.type != 'external' THEN
    RETURN NEW;
  END IF;

  -- Ticket externo requer partner_company_id
  IF NEW.partner_company_id IS NULL THEN
    RAISE EXCEPTION 'Tickets externos requerem uma empresa parceira';
  END IF;

  -- Ticket externo requer category_id
  IF NEW.category_id IS NULL THEN
    RAISE EXCEPTION 'Tickets externos requerem uma categoria';
  END IF;

  -- Verificar se existe mapping exato ou generalista
  IF NEW.subcategory_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.partner_service_mappings
      WHERE partner_company_id = NEW.partner_company_id
        AND category_id = NEW.category_id
        AND subcategory_id = NEW.subcategory_id
        AND status = 'active'
        AND deleted_at IS NULL
    ) INTO v_has_mapping;

    IF v_has_mapping THEN
      RETURN NEW;
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.partner_service_mappings
      WHERE partner_company_id = NEW.partner_company_id
        AND category_id = NEW.category_id
        AND subcategory_id IS NULL
        AND status = 'active'
        AND deleted_at IS NULL
    ) INTO v_has_generalist;

    IF v_has_generalist THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Esse parceiro não atende essa categoria/subcategoria. Ajuste o parceiro ou selecione um serviço válido.';
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM public.partner_service_mappings
      WHERE partner_company_id = NEW.partner_company_id
        AND category_id = NEW.category_id
        AND subcategory_id IS NULL
        AND status = 'active'
        AND deleted_at IS NULL
    ) INTO v_has_generalist;

    IF NOT v_has_generalist THEN
      RAISE EXCEPTION 'Esse parceiro não atende essa categoria de forma geral. Selecione uma subcategoria específica.';
    END IF;

    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_validate_external_ticket_partner_service
BEFORE INSERT OR UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.validate_external_ticket_partner_service();

-- FUNÇÃO: Obter categorias atendidas por parceiro
CREATE OR REPLACE FUNCTION public.get_partner_categories(p_partner_company_id UUID)
RETURNS TABLE (
  category_id UUID,
  category_name TEXT,
  is_generalist BOOLEAN,
  subcategory_count BIGINT
) 
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    psm.category_id,
    tc.name::TEXT AS category_name,
    EXISTS (
      SELECT 1 FROM public.partner_service_mappings psm2
      WHERE psm2.partner_company_id = p_partner_company_id
        AND psm2.category_id = psm.category_id
        AND psm2.subcategory_id IS NULL
        AND psm2.status = 'active'
        AND psm2.deleted_at IS NULL
    ) AS is_generalist,
    (
      SELECT COUNT(*) FROM public.partner_service_mappings psm3
      WHERE psm3.partner_company_id = p_partner_company_id
        AND psm3.category_id = psm.category_id
        AND psm3.subcategory_id IS NOT NULL
        AND psm3.status = 'active'
        AND psm3.deleted_at IS NULL
    ) AS subcategory_count
  FROM public.partner_service_mappings psm
  JOIN public.ticket_categories tc ON tc.id = psm.category_id AND tc.deleted_at IS NULL
  WHERE psm.partner_company_id = p_partner_company_id
    AND psm.status = 'active'
    AND psm.deleted_at IS NULL
  ORDER BY tc.name;
END;
$$;

-- FUNÇÃO: Obter subcategorias atendidas por parceiro
CREATE OR REPLACE FUNCTION public.get_partner_subcategories(p_partner_company_id UUID, p_category_id UUID)
RETURNS TABLE (
  subcategory_id UUID,
  subcategory_name TEXT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    psm.subcategory_id,
    ts.name::TEXT AS subcategory_name
  FROM public.partner_service_mappings psm
  JOIN public.ticket_subcategories ts ON ts.id = psm.subcategory_id AND ts.deleted_at IS NULL
  WHERE psm.partner_company_id = p_partner_company_id
    AND psm.category_id = p_category_id
    AND psm.subcategory_id IS NOT NULL
    AND psm.status = 'active'
    AND psm.deleted_at IS NULL
  ORDER BY ts.name;
END;
$$;

-- RLS POLICIES
ALTER TABLE public.partner_service_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view partner services in their BU"
ON public.partner_service_mappings FOR SELECT
USING (user_has_bu_access(auth.uid(), bu_id));

CREATE POLICY "BU admins can create partner services"
ON public.partner_service_mappings FOR INSERT
WITH CHECK (is_bu_admin(auth.uid(), bu_id) OR is_platform_admin(auth.uid()));

CREATE POLICY "BU admins can update partner services"
ON public.partner_service_mappings FOR UPDATE
USING (is_bu_admin(auth.uid(), bu_id) OR is_platform_admin(auth.uid()));

CREATE POLICY "BU admins can delete partner services"
ON public.partner_service_mappings FOR DELETE
USING (is_bu_admin(auth.uid(), bu_id) OR is_platform_admin(auth.uid()));