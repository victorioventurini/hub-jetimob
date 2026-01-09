-- ============================================
-- WAVE 2 - Passo 1: Adicionar colunas e tornar user_id nullable
-- ============================================

-- 1. Adicionar profile_id
ALTER TABLE bu_user_memberships 
  ADD COLUMN IF NOT EXISTS profile_id UUID;

-- 2. Adicionar FK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bu_user_memberships_profile_id_fkey'
  ) THEN
    ALTER TABLE bu_user_memberships 
      ADD CONSTRAINT bu_user_memberships_profile_id_fkey 
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- 3. Adicionar deleted_at
ALTER TABLE bu_user_memberships 
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 4. Tornar user_id nullable
ALTER TABLE bu_user_memberships ALTER COLUMN user_id DROP NOT NULL;