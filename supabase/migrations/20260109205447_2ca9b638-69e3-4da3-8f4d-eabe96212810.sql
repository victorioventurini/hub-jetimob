-- ============================================
-- WAVE 1: Identity Unification v2.2 - Schema Base
-- ============================================

-- 1. Adicionar global_status em profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS global_status TEXT 
  DEFAULT 'active';

-- Adicionar constraint separadamente (evita erro se já existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_global_status_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_global_status_check 
      CHECK (global_status IN ('active', 'suspended', 'blocked'));
  END IF;
END $$;

-- 2. Adicionar user_type em profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_type TEXT 
  DEFAULT 'internal';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_type_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_user_type_check 
      CHECK (user_type IN ('internal', 'external'));
  END IF;
END $$;

-- 3. Índice para busca por status
CREATE INDEX IF NOT EXISTS idx_profiles_global_status 
  ON profiles(global_status) 
  WHERE deleted_at IS NULL;

-- 4. Adicionar coluna email (nova)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

COMMENT ON COLUMN profiles.email IS 'Email único global do usuário. Substitui work_email.';

-- 5. Backfill email a partir de work_email (normalizado para lowercase + trim)
UPDATE profiles 
SET email = LOWER(TRIM(work_email))
WHERE email IS NULL 
  AND work_email IS NOT NULL;

-- 6. Deprecar work_email
COMMENT ON COLUMN profiles.work_email IS '[DEPRECATED] Use profiles.email. Será removido após 2026-07-01.';

-- 7. Criar índice unique em email (case-insensitive)
-- Nota: Se houver duplicatas, este passo falhará e precisamos resolver manualmente
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique_lower 
  ON profiles(LOWER(email)) 
  WHERE deleted_at IS NULL AND email IS NOT NULL;