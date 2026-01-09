-- ============================================================
-- IDENTITY CUTOVER v3.0 — FASE 0: Canary Flag
-- ============================================================
-- Cria o flag de controle para hard fail controlado
-- Valor boolean JSONB (não string) para cast direto
-- ============================================================

-- Inserir canary flag (inativo por padrão)
INSERT INTO system_settings (key, value, description)
VALUES (
  'identity_cutover_strict', 
  'false',  -- boolean JSONB, não string
  'Identity Cutover v3.0 canary flag. Quando true, funções legadas (is_bu_member, is_bu_admin) geram EXCEPTION. Valor INFORMATIVO após cutover.'
)
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Verificar inserção
SELECT key, value, pg_typeof(value) as type, description 
FROM system_settings 
WHERE key = 'identity_cutover_strict';