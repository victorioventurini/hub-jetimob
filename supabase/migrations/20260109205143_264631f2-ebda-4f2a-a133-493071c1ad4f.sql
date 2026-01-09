-- ============================================
-- WAVE 0: Identity Unification v2.2 - Preparação
-- ============================================

-- 1. Criar tabela system_settings
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE system_settings IS 'Configurações globais do sistema. Usar para valores que precisam ser alterados sem deploy.';

-- 2. Trigger de updated_at
CREATE OR REPLACE TRIGGER set_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 3. RLS: Apenas platform_admin pode ler/escrever
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_settings_select_admin" ON system_settings
  FOR SELECT USING (is_platform_admin(auth.uid()));

CREATE POLICY "system_settings_modify_admin" ON system_settings
  FOR ALL USING (is_platform_admin(auth.uid()));

-- 4. Inserir deadline de dual-mode
INSERT INTO system_settings (key, value, description)
VALUES (
  'identity_dual_mode_deadline',
  '"2026-07-01"'::jsonb,
  'Data limite para suporte a user_id legado nas funções de identidade. Após essa data, uso de user_id gera warning.'
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- 5. Função helper para buscar setting
CREATE OR REPLACE FUNCTION get_system_setting(p_key TEXT)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT value FROM system_settings WHERE key = p_key
$$;

-- 6. Função específica para deadline com cast defensivo
CREATE OR REPLACE FUNCTION _identity_dual_mode_deadline()
RETURNS DATE
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_value JSONB;
  v_text TEXT;
  v_date DATE;
BEGIN
  SELECT value INTO v_value FROM system_settings WHERE key = 'identity_dual_mode_deadline';
  
  IF v_value IS NULL THEN
    -- Fallback seguro se configuração não existir
    RETURN '2026-07-01'::DATE;
  END IF;
  
  -- Cast defensivo: JSONB → TEXT → DATE
  v_text := v_value#>>'{}';
  
  BEGIN
    v_date := v_text::DATE;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[IDENTITY] Invalid deadline format in system_settings: %. Using fallback.', v_text;
    RETURN '2026-07-01'::DATE;
  END;
  
  RETURN v_date;
END;
$$;

-- 7. Comentários para documentação
COMMENT ON FUNCTION get_system_setting(TEXT) IS 'Retorna valor de configuração global do sistema.';
COMMENT ON FUNCTION _identity_dual_mode_deadline() IS 'Retorna deadline do dual-mode de identidade. Usado pelas funções is_bu_member/is_bu_admin para suporte legado.';