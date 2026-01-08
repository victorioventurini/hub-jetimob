-- ============================================================
-- WAVE 2.5: NORMALIZE job_titles (bu_ids[] → bu_id uuid NOT NULL)
-- ============================================================

-- PASSO 1: Dropar policies antigas que dependem de bu_ids
DROP POLICY IF EXISTS "Users can view job titles from their BUs" ON public.job_titles;
DROP POLICY IF EXISTS "Admins can insert job titles" ON public.job_titles;
DROP POLICY IF EXISTS "Admins can update job titles" ON public.job_titles;
DROP POLICY IF EXISTS "Admins can delete job titles" ON public.job_titles;

-- PASSO 2: Adicionar coluna bu_id se não existir
ALTER TABLE public.job_titles ADD COLUMN IF NOT EXISTS bu_id uuid;

-- PASSO 3: Popular bu_id a partir de bu_ids[1]
UPDATE public.job_titles 
SET bu_id = bu_ids[1]
WHERE bu_id IS NULL AND bu_ids IS NOT NULL AND array_length(bu_ids, 1) >= 1;

-- PASSO 4: Validar que todos foram populados
DO $$
DECLARE
  null_count integer;
BEGIN
  SELECT COUNT(*) INTO null_count 
  FROM public.job_titles 
  WHERE bu_id IS NULL;
  
  IF null_count > 0 THEN
    RAISE EXCEPTION 'ERRO: % registros com bu_id NULL. Abortando.', null_count;
  END IF;
END $$;

-- PASSO 5: Definir NOT NULL e FK
ALTER TABLE public.job_titles ALTER COLUMN bu_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'job_titles_bu_id_fkey' AND table_name = 'job_titles'
  ) THEN
    ALTER TABLE public.job_titles 
    ADD CONSTRAINT job_titles_bu_id_fkey 
    FOREIGN KEY (bu_id) REFERENCES public.bu_units(id);
  END IF;
END $$;

-- PASSO 6: Criar índice único
DROP INDEX IF EXISTS public.job_titles_bu_id_name_unique;
CREATE UNIQUE INDEX job_titles_bu_id_name_unique 
ON public.job_titles (bu_id, lower(trim(name))) 
WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS public.job_titles_bu_name_unique;

-- PASSO 7: Dropar coluna legada bu_ids
ALTER TABLE public.job_titles DROP COLUMN IF EXISTS bu_ids;

-- PASSO 8: Comentário
COMMENT ON COLUMN public.job_titles.bu_id IS 
'BU a qual este cargo pertence. Substituiu bu_ids[] na Wave 2.5 (2026-01-08).';

-- PASSO 9: Trigger enforce_bu_scope
CREATE OR REPLACE FUNCTION public.enforce_job_titles_bu_scope()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.bu_id IS NULL THEN
    RAISE EXCEPTION 'bu_id é obrigatório para job_titles';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_enforce_job_titles_bu_scope ON public.job_titles;
CREATE TRIGGER trg_enforce_job_titles_bu_scope
  BEFORE INSERT ON public.job_titles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_job_titles_bu_scope();

-- PASSO 10: Novas RLS policies usando bu_id
ALTER TABLE public.job_titles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_titles_select_policy" ON public.job_titles
FOR SELECT USING (
  user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id)
);

CREATE POLICY "job_titles_insert_policy" ON public.job_titles
FOR INSERT WITH CHECK (
  user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id)
);

CREATE POLICY "job_titles_update_policy" ON public.job_titles
FOR UPDATE USING (
  user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id)
);

CREATE POLICY "job_titles_delete_policy" ON public.job_titles
FOR DELETE USING (
  user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id)
);