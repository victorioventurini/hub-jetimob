-- =============================================
-- ETAPA 1: SCHEMA DE MÓDULOS MULTI-BU (CORRIGIDO)
-- =============================================

-- 1. Criar enum para tipo de módulo
CREATE TYPE public.module_type AS ENUM ('global', 'operational');

-- 2. Adicionar colunas à tabela modules existente
ALTER TABLE public.modules
ADD COLUMN type public.module_type NOT NULL DEFAULT 'operational',
ADD COLUMN dependencies text[] NOT NULL DEFAULT '{}',
ADD COLUMN display_order integer NOT NULL DEFAULT 100;

-- 3. Criar tabela de configuração de módulos por BU
CREATE TABLE public.bu_module_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT true,
  enabled_at timestamp with time zone,
  enabled_by uuid,
  disabled_at timestamp with time zone,
  disabled_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(bu_id, module_id)
);

-- 4. Criar índices (exceto idx_modules_slug que já existe)
CREATE INDEX idx_bu_module_configs_bu_id ON public.bu_module_configs(bu_id);
CREATE INDEX idx_bu_module_configs_module_id ON public.bu_module_configs(module_id);
CREATE INDEX idx_modules_type ON public.modules(type);

-- 5. Habilitar RLS
ALTER TABLE public.bu_module_configs ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS para bu_module_configs
CREATE POLICY "Global admins can manage module configs"
ON public.bu_module_configs
FOR ALL
USING (is_admin_or_ceo(auth.uid()));

CREATE POLICY "BU admins can manage their BU module configs"
ON public.bu_module_configs
FOR ALL
USING (is_bu_admin(auth.uid(), bu_id));

CREATE POLICY "Users can view module configs of their BUs"
ON public.bu_module_configs
FOR SELECT
USING (user_has_bu_access(auth.uid(), bu_id));

-- 7. Trigger para atualizar updated_at
CREATE TRIGGER update_bu_module_configs_updated_at
BEFORE UPDATE ON public.bu_module_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Função helper para verificar se módulo está habilitado para BU
CREATE OR REPLACE FUNCTION public.is_module_enabled_for_bu(p_bu_id uuid, p_module_slug text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT bmc.is_enabled
      FROM public.bu_module_configs bmc
      JOIN public.modules m ON m.id = bmc.module_id
      WHERE bmc.bu_id = p_bu_id
        AND m.slug = p_module_slug
        AND m.status = 'active'
    ),
    (
      SELECT m.type = 'global'
      FROM public.modules m
      WHERE m.slug = p_module_slug
        AND m.status = 'active'
    )
  )
$$;

-- 9. Função para obter módulos habilitados para uma BU
CREATE OR REPLACE FUNCTION public.get_enabled_modules_for_bu(p_bu_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  description text,
  icon text,
  route text,
  type public.module_type,
  display_order integer,
  is_enabled boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    m.id,
    m.name,
    m.slug,
    m.description,
    m.icon,
    m.route,
    m.type,
    m.display_order,
    CASE 
      WHEN m.type = 'global' THEN true
      ELSE COALESCE(bmc.is_enabled, false)
    END as is_enabled
  FROM public.modules m
  LEFT JOIN public.bu_module_configs bmc ON bmc.module_id = m.id AND bmc.bu_id = p_bu_id
  WHERE m.status = 'active'
  ORDER BY m.type DESC, m.display_order ASC, m.name ASC
$$;