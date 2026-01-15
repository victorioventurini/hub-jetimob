-- ============================================================
-- FASE 1: Criação da tabela AREAS
-- ============================================================

-- Tabela principal de áreas
CREATE TABLE public.areas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bu_id UUID NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  leader_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  co_leader_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  color TEXT,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT areas_name_bu_unique UNIQUE (bu_id, name)
);

-- Índices para performance
CREATE INDEX idx_areas_bu_id ON public.areas(bu_id);
CREATE INDEX idx_areas_leader ON public.areas(leader_user_id);
CREATE INDEX idx_areas_status ON public.areas(status);
CREATE INDEX idx_areas_deleted_at ON public.areas(deleted_at) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

-- RLS Policies - usando role_in_bu e deleted_at IS NULL
CREATE POLICY "areas_select_bu_members"
ON public.areas
FOR SELECT
USING (
  bu_id IN (
    SELECT bu_id FROM public.bu_user_memberships
    WHERE user_id = auth.uid() AND deleted_at IS NULL
  )
  AND deleted_at IS NULL
);

CREATE POLICY "areas_insert_admins"
ON public.areas
FOR INSERT
WITH CHECK (
  bu_id IN (
    SELECT bu_id FROM public.bu_user_memberships
    WHERE user_id = auth.uid() 
    AND deleted_at IS NULL
    AND role_in_bu = 'admin'
  )
);

CREATE POLICY "areas_update_admins_or_leaders"
ON public.areas
FOR UPDATE
USING (
  bu_id IN (
    SELECT bu_id FROM public.bu_user_memberships
    WHERE user_id = auth.uid() 
    AND deleted_at IS NULL
    AND role_in_bu = 'admin'
  )
  OR leader_user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR co_leader_user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "areas_delete_admins"
ON public.areas
FOR DELETE
USING (
  bu_id IN (
    SELECT bu_id FROM public.bu_user_memberships
    WHERE user_id = auth.uid() 
    AND deleted_at IS NULL
    AND role_in_bu = 'admin'
  )
);

-- Trigger para updated_at
CREATE TRIGGER update_areas_updated_at
BEFORE UPDATE ON public.areas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- FASE 2: Adicionar area_id na tabela teams
-- ============================================================

ALTER TABLE public.teams
ADD COLUMN area_id UUID REFERENCES public.areas(id) ON DELETE SET NULL;

CREATE INDEX idx_teams_area_id ON public.teams(area_id);

-- Comentários
COMMENT ON TABLE public.areas IS 'Áreas estratégicas que agrupam times. Não possuem OKRs próprios.';
COMMENT ON COLUMN public.areas.leader_user_id IS 'Líder principal da área (referencia profiles.id)';
COMMENT ON COLUMN public.areas.co_leader_user_id IS 'Co-líder opcional da área (referencia profiles.id)';
COMMENT ON COLUMN public.teams.area_id IS 'Área estratégica à qual o time pertence (opcional)';