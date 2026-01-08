-- =====================================================
-- WAVE 2 · FASE 1: Criar job_titles ausentes por BU
-- Usa bu_ids (array) ao invés de bu_id
-- =====================================================

INSERT INTO job_titles (bu_ids, name, is_active)
SELECT DISTINCT ARRAY[p.bu_id], TRIM(p.job_title), true
FROM profiles p
WHERE p.job_title_id IS NULL
  AND p.job_title IS NOT NULL
  AND p.job_title != ''
  AND p.bu_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM job_titles jt
    WHERE p.bu_id = ANY(jt.bu_ids)
      AND LOWER(TRIM(jt.name)) = LOWER(TRIM(p.job_title))
  );

-- =====================================================
-- WAVE 2 · FASE 2: Popular profiles.job_title_id
-- =====================================================

UPDATE profiles p
SET job_title_id = jt.id
FROM job_titles jt
WHERE p.job_title_id IS NULL
  AND p.bu_id = ANY(jt.bu_ids)
  AND LOWER(TRIM(p.job_title)) = LOWER(TRIM(jt.name));

-- =====================================================
-- WAVE 2 · FASE 3: Marcar coluna como deprecated
-- =====================================================

COMMENT ON COLUMN profiles.job_title IS '@deprecated Use job_title_id. Remover após Wave 3. Migrado em 2026-01-08.';