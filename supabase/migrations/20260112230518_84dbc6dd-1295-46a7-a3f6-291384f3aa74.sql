-- Wave 2.6: Converter job_titles para modelo multi-BU (correção final)

-- PASSO 1: Dropar policies antigas
DROP POLICY IF EXISTS "job_titles_select_policy" ON job_titles;
DROP POLICY IF EXISTS "job_titles_insert_policy" ON job_titles;
DROP POLICY IF EXISTS "job_titles_update_policy" ON job_titles;
DROP POLICY IF EXISTS "job_titles_delete_policy" ON job_titles;

-- PASSO 2: Dropar trigger (nome correto) e função com CASCADE
DROP TRIGGER IF EXISTS trg_enforce_job_titles_bu_scope ON job_titles;
DROP TRIGGER IF EXISTS enforce_job_titles_bu_scope ON job_titles;
DROP FUNCTION IF EXISTS enforce_job_titles_bu_scope() CASCADE;

-- PASSO 3: Adicionar coluna bu_ids[]
ALTER TABLE job_titles ADD COLUMN IF NOT EXISTS bu_ids UUID[] DEFAULT '{}';

-- PASSO 4: Migrar bu_id existente para bu_ids[]
UPDATE job_titles SET bu_ids = ARRAY[bu_id] WHERE bu_id IS NOT NULL AND (bu_ids IS NULL OR bu_ids = '{}');

-- PASSO 5: Deduplicar cargos com mesmo nome
DO $$
DECLARE
  dup_record RECORD;
  keep_id UUID;
  merged_bus UUID[];
BEGIN
  FOR dup_record IN 
    SELECT 
      lower(trim(name)) as normalized_name,
      array_agg(id ORDER BY created_at) as ids
    FROM job_titles
    WHERE deleted_at IS NULL
    GROUP BY lower(trim(name))
    HAVING count(*) > 1
  LOOP
    keep_id := dup_record.ids[1];
    
    SELECT array_agg(DISTINCT bu) INTO merged_bus
    FROM job_titles, unnest(bu_ids) AS bu
    WHERE id = ANY(dup_record.ids);
    
    UPDATE job_titles SET bu_ids = merged_bus WHERE id = keep_id;
    
    UPDATE job_titles 
    SET deleted_at = now() 
    WHERE id = ANY(dup_record.ids) AND id != keep_id;
  END LOOP;
END $$;

-- PASSO 6: Atualizar FKs em profiles e memberships
WITH merged_mapping AS (
  SELECT 
    deleted.id as old_id,
    kept.id as new_id
  FROM job_titles deleted
  JOIN job_titles kept ON lower(trim(kept.name)) = lower(trim(deleted.name)) 
    AND kept.deleted_at IS NULL
  WHERE deleted.deleted_at IS NOT NULL
)
UPDATE profiles p
SET job_title_id = mm.new_id
FROM merged_mapping mm
WHERE p.job_title_id = mm.old_id;

WITH merged_mapping AS (
  SELECT 
    deleted.id as old_id,
    kept.id as new_id
  FROM job_titles deleted
  JOIN job_titles kept ON lower(trim(kept.name)) = lower(trim(deleted.name)) 
    AND kept.deleted_at IS NULL
  WHERE deleted.deleted_at IS NOT NULL
)
UPDATE bu_user_memberships m
SET job_title_id = mm.new_id
FROM merged_mapping mm
WHERE m.job_title_id = mm.old_id;

-- PASSO 7: Dropar coluna bu_id antiga
ALTER TABLE job_titles DROP COLUMN IF EXISTS bu_id;

-- PASSO 8: Criar índices
DROP INDEX IF EXISTS job_titles_bu_id_name_unique;
CREATE INDEX IF NOT EXISTS job_titles_bu_ids_gin ON job_titles USING GIN (bu_ids);
CREATE UNIQUE INDEX IF NOT EXISTS job_titles_name_unique ON job_titles (lower(trim(name))) WHERE deleted_at IS NULL;

-- PASSO 9: Criar novas RLS policies
CREATE POLICY "job_titles_select_policy" ON job_titles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM unnest(bu_ids) AS bid 
      WHERE user_has_bu_access(auth.uid(), bid)
    )
  );

CREATE POLICY "job_titles_insert_policy" ON job_titles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM unnest(bu_ids) AS bid 
      WHERE user_has_bu_access(auth.uid(), bid) AND is_current_bu(bid)
    )
  );

CREATE POLICY "job_titles_update_policy" ON job_titles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM unnest(bu_ids) AS bid 
      WHERE user_has_bu_access(auth.uid(), bid)
    )
  );

CREATE POLICY "job_titles_delete_policy" ON job_titles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM unnest(bu_ids) AS bid 
      WHERE user_has_bu_access(auth.uid(), bid)
    )
  );

-- PASSO 10: Função helper
CREATE OR REPLACE FUNCTION job_title_belongs_to_bu(p_job_title_id UUID, p_bu_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM job_titles jt
    WHERE jt.id = p_job_title_id
      AND p_bu_id = ANY(jt.bu_ids)
      AND jt.deleted_at IS NULL
  );
$$;