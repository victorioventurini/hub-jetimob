-- ============================================
-- WAVE 2 - Passo 2: Migração de dados e índices
-- ============================================

-- 1. Migrar user_id → profile_id (para memberships existentes)
UPDATE bu_user_memberships m
SET profile_id = p.id
FROM profiles p
WHERE m.user_id = p.user_id
  AND m.profile_id IS NULL;

-- 2. Índice para performance
CREATE INDEX IF NOT EXISTS idx_bu_memberships_profile_id 
  ON bu_user_memberships(profile_id) 
  WHERE deleted_at IS NULL;

-- 3. UNIQUE parcial: 1 membership ativo por (profile_id, bu_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_bu_memberships_active_unique 
  ON bu_user_memberships(profile_id, bu_id) 
  WHERE deleted_at IS NULL;

-- 4. UNIQUE parcial: 1 default por profile
CREATE UNIQUE INDEX IF NOT EXISTS idx_bu_memberships_single_default 
  ON bu_user_memberships(profile_id) 
  WHERE is_default = true AND deleted_at IS NULL;

-- 5. Backfill: criar memberships para profiles que têm bu_id mas não têm membership
INSERT INTO bu_user_memberships (profile_id, user_id, bu_id, role_in_bu, is_default)
SELECT 
  p.id as profile_id,
  p.user_id,
  p.bu_id,
  'collaborator',
  NOT EXISTS (
    SELECT 1 FROM bu_user_memberships m2 
    WHERE m2.profile_id = p.id 
      AND m2.is_default = true 
      AND m2.deleted_at IS NULL
  )
FROM profiles p
WHERE p.deleted_at IS NULL
  AND p.bu_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM bu_user_memberships m 
    WHERE m.profile_id = p.id 
      AND m.bu_id = p.bu_id 
      AND m.deleted_at IS NULL
  );