-- ============================================================
-- Tabela: user_saved_links
-- Links salvos por usuário com favorito único por módulo
-- ============================================================

CREATE TABLE public.user_saved_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  module_slug text NOT NULL,
  label text NOT NULL,
  path text NOT NULL,
  is_favorite boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT user_saved_links_label_length CHECK (char_length(label) <= 50),
  CONSTRAINT user_saved_links_path_length CHECK (char_length(path) <= 500)
);

-- Índices
CREATE INDEX idx_user_saved_links_user_bu ON public.user_saved_links(user_id, bu_id);
CREATE INDEX idx_user_saved_links_module ON public.user_saved_links(module_slug);
CREATE INDEX idx_user_saved_links_favorite ON public.user_saved_links(user_id, bu_id, module_slug) WHERE is_favorite = true;

-- Enable RLS
ALTER TABLE public.user_saved_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own saved links"
ON public.user_saved_links
FOR SELECT
USING (user_id = public.my_profile_id());

CREATE POLICY "Users can create their own saved links"
ON public.user_saved_links
FOR INSERT
WITH CHECK (user_id = public.my_profile_id());

CREATE POLICY "Users can update their own saved links"
ON public.user_saved_links
FOR UPDATE
USING (user_id = public.my_profile_id());

CREATE POLICY "Users can delete their own saved links"
ON public.user_saved_links
FOR DELETE
USING (user_id = public.my_profile_id());

-- Trigger para garantir apenas um favorito por módulo/BU
CREATE OR REPLACE FUNCTION public.ensure_single_favorite_link()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o novo registro está sendo marcado como favorito
  IF NEW.is_favorite = true THEN
    -- Remove favorito de outros links do mesmo módulo/BU/usuário
    UPDATE public.user_saved_links
    SET is_favorite = false, updated_at = now()
    WHERE user_id = NEW.user_id
      AND bu_id = NEW.bu_id
      AND module_slug = NEW.module_slug
      AND id != NEW.id
      AND is_favorite = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_ensure_single_favorite_link
BEFORE INSERT OR UPDATE ON public.user_saved_links
FOR EACH ROW
EXECUTE FUNCTION public.ensure_single_favorite_link();

-- Trigger para updated_at
CREATE TRIGGER update_user_saved_links_updated_at
BEFORE UPDATE ON public.user_saved_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();