-- Migração: job_titles de bu_id (single) para bu_ids (array)

-- 1. Dropar todas as policies existentes que dependem de bu_id
DROP POLICY IF EXISTS "job_titles_select" ON public.job_titles;
DROP POLICY IF EXISTS "job_titles_insert" ON public.job_titles;
DROP POLICY IF EXISTS "job_titles_update" ON public.job_titles;
DROP POLICY IF EXISTS "job_titles_delete" ON public.job_titles;
DROP POLICY IF EXISTS "Users can view job titles from their BU" ON public.job_titles;
DROP POLICY IF EXISTS "Admins can manage job titles" ON public.job_titles;

-- 2. Adicionar nova coluna bu_ids como array
ALTER TABLE public.job_titles 
ADD COLUMN bu_ids uuid[] NOT NULL DEFAULT '{}';

-- 3. Migrar dados existentes: copiar bu_id para bu_ids array
UPDATE public.job_titles 
SET bu_ids = ARRAY[bu_id]
WHERE bu_id IS NOT NULL;

-- 4. Remover coluna antiga bu_id
ALTER TABLE public.job_titles DROP COLUMN bu_id;

-- 5. Criar índice GIN para buscas eficientes no array
CREATE INDEX idx_job_titles_bu_ids ON public.job_titles USING GIN (bu_ids);

-- 6. Criar novas RLS policies para usar bu_ids

-- Policy de leitura: usuário pode ver cargos que incluem sua BU
CREATE POLICY "Users can view job titles from their BUs"
ON public.job_titles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM bu_user_memberships bum
    WHERE bum.user_id = auth.uid()
    AND bum.bu_id = ANY(job_titles.bu_ids)
  )
);

-- Policy de insert: admin pode criar cargos para BUs onde tem acesso
CREATE POLICY "Admins can insert job titles"
ON public.job_titles
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM bu_user_memberships bum
    WHERE bum.user_id = auth.uid()
    AND bum.bu_id = ANY(job_titles.bu_ids)
    AND bum.role_in_bu IN ('admin', 'super_admin')
  )
);

-- Policy de update: admin pode atualizar cargos de suas BUs
CREATE POLICY "Admins can update job titles"
ON public.job_titles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM bu_user_memberships bum
    WHERE bum.user_id = auth.uid()
    AND bum.bu_id = ANY(job_titles.bu_ids)
    AND bum.role_in_bu IN ('admin', 'super_admin')
  )
);

-- Policy de delete: admin pode deletar cargos de suas BUs
CREATE POLICY "Admins can delete job titles"
ON public.job_titles
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM bu_user_memberships bum
    WHERE bum.user_id = auth.uid()
    AND bum.bu_id = ANY(job_titles.bu_ids)
    AND bum.role_in_bu IN ('admin', 'super_admin')
  )
);