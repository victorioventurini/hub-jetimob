-- =============================================
-- JOB TITLES MODULE - Database Schema
-- =============================================
-- OBJETIVO: Criar tabela de cargos padronizados por BU
-- MOTIVO: Substituir campo texto livre por lista controlada
-- ESCOPO: Cada BU possui sua própria lista de cargos (não global)

-- Tabela de cargos
CREATE TABLE public.job_titles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id UUID NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Comentários para documentação
COMMENT ON TABLE public.job_titles IS 'Cargos padronizados por BU. Substitui campo texto livre em profiles.job_title';
COMMENT ON COLUMN public.job_titles.bu_id IS 'BU dona do cargo. Cargos não são globais.';
COMMENT ON COLUMN public.job_titles.name IS 'Nome do cargo. Único por BU (case insensitive).';
COMMENT ON COLUMN public.job_titles.is_active IS 'Soft status - permite desativar sem deletar.';
COMMENT ON COLUMN public.job_titles.deleted_at IS 'Soft delete - preserva histórico de usuários.';

-- Constraint de unicidade case-insensitive por BU
CREATE UNIQUE INDEX job_titles_bu_name_unique 
ON public.job_titles (bu_id, lower(name)) 
WHERE deleted_at IS NULL;

-- Índice para busca por BU
CREATE INDEX job_titles_bu_id_idx ON public.job_titles (bu_id);

-- Trigger de updated_at
CREATE TRIGGER update_job_titles_updated_at
BEFORE UPDATE ON public.job_titles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar coluna job_title_id em profiles (nullable para migração gradual)
ALTER TABLE public.profiles 
ADD COLUMN job_title_id UUID REFERENCES public.job_titles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.profiles.job_title_id IS 'Referência ao cargo padronizado. Substitui campo texto job_title.';

-- Índice para FK
CREATE INDEX profiles_job_title_id_idx ON public.profiles (job_title_id);

-- =============================================
-- RLS Policies
-- =============================================
ALTER TABLE public.job_titles ENABLE ROW LEVEL SECURITY;

-- SELECT: Usuários com acesso à BU podem visualizar
CREATE POLICY "job_titles_select" ON public.job_titles
FOR SELECT TO authenticated
USING (public.is_bu_member(auth.uid(), bu_id));

-- INSERT: Admin da BU ou super_admin/admin global
CREATE POLICY "job_titles_insert" ON public.job_titles
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') 
  OR public.has_role(auth.uid(), 'admin')
  OR public.is_bu_admin(auth.uid(), bu_id)
);

-- UPDATE: Admin da BU ou super_admin/admin global
CREATE POLICY "job_titles_update" ON public.job_titles
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') 
  OR public.has_role(auth.uid(), 'admin')
  OR public.is_bu_admin(auth.uid(), bu_id)
);

-- DELETE: Admin da BU ou super_admin/admin global
CREATE POLICY "job_titles_delete" ON public.job_titles
FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') 
  OR public.has_role(auth.uid(), 'admin')
  OR public.is_bu_admin(auth.uid(), bu_id)
);

-- Permission Keys para o módulo (sem coluna name)
INSERT INTO public.permission_catalog (key, description, module, resource, action, scope, status)
VALUES 
  ('settings.job_titles.view', 'Permite visualizar lista de cargos da BU', 'settings', 'job_titles', 'view', 'bu', 'active'),
  ('settings.job_titles.manage', 'Permite criar, editar e desativar cargos da BU', 'settings', 'job_titles', 'manage', 'bu', 'active')
ON CONFLICT (key) DO NOTHING;