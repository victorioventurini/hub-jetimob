-- ============================================
-- PHASE 5: Evolução do Schema de Templates
-- ============================================
-- Migrar de schema flat para schema versionado

-- =============================================
-- 1. TABELA: notification_template_variables
-- Catálogo de variáveis suportadas por evento
-- =============================================
CREATE TABLE IF NOT EXISTS public.notification_template_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_slug TEXT NOT NULL,
  variable_key TEXT NOT NULL,
  variable_label TEXT NOT NULL,
  variable_type TEXT NOT NULL DEFAULT 'string',
  description TEXT,
  example_value TEXT,
  is_required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_slug, variable_key)
);

-- =============================================
-- 2. TABELA: notification_template_versions
-- Versões do template com body/subject
-- =============================================
CREATE TABLE IF NOT EXISTS public.notification_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL,
  version INTEGER NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  variables_used TEXT[] NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_approved BOOLEAN NOT NULL DEFAULT true,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  UNIQUE(template_id, version)
);

-- =============================================
-- 3. TABELA: notification_template_audit_log
-- =============================================
CREATE TABLE IF NOT EXISTS public.notification_template_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL,
  version_id UUID,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'activate', 'deactivate', 'rollback')),
  actor_id UUID REFERENCES auth.users(id),
  changes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 4. ALTERAR notification_templates
-- Adicionar bu_id e current_version_id
-- =============================================
ALTER TABLE public.notification_templates 
ADD COLUMN IF NOT EXISTS bu_id UUID REFERENCES public.bu_units(id) ON DELETE CASCADE;

ALTER TABLE public.notification_templates 
ADD COLUMN IF NOT EXISTS current_version_id UUID;

-- Renomear channel_slug para channel se necessário
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_templates' AND column_name = 'channel_slug') THEN
    ALTER TABLE public.notification_templates RENAME COLUMN channel_slug TO channel;
  END IF;
END $$;

-- =============================================
-- 5. MIGRAR DADOS EXISTENTES PARA VERSÕES
-- =============================================
-- Criar versões para templates existentes
INSERT INTO public.notification_template_versions (template_id, version, subject, body, variables_used, created_at)
SELECT 
  t.id,
  COALESCE(t.version, 1),
  t.subject_template,
  t.body_template,
  COALESCE(
    (SELECT array_agg(DISTINCT m[1]) FROM regexp_matches(COALESCE(t.subject_template, '') || ' ' || COALESCE(t.body_template, ''), '\{\{(\w+)\}\}', 'g') AS m),
    '{}'
  ),
  t.created_at
FROM public.notification_templates t
WHERE NOT EXISTS (
  SELECT 1 FROM public.notification_template_versions v WHERE v.template_id = t.id
);

-- Atualizar current_version_id
UPDATE public.notification_templates t
SET current_version_id = (
  SELECT v.id FROM public.notification_template_versions v 
  WHERE v.template_id = t.id 
  ORDER BY v.version DESC LIMIT 1
)
WHERE t.current_version_id IS NULL;

-- =============================================
-- 6. ADICIONAR FKs
-- =============================================
ALTER TABLE public.notification_template_versions 
DROP CONSTRAINT IF EXISTS notification_template_versions_template_id_fkey;

ALTER TABLE public.notification_template_versions 
ADD CONSTRAINT notification_template_versions_template_id_fkey 
FOREIGN KEY (template_id) REFERENCES public.notification_templates(id) ON DELETE CASCADE;

ALTER TABLE public.notification_template_audit_log 
DROP CONSTRAINT IF EXISTS notification_template_audit_log_template_id_fkey;

ALTER TABLE public.notification_template_audit_log 
ADD CONSTRAINT notification_template_audit_log_template_id_fkey 
FOREIGN KEY (template_id) REFERENCES public.notification_templates(id) ON DELETE CASCADE;

ALTER TABLE public.notification_template_audit_log 
DROP CONSTRAINT IF EXISTS notification_template_audit_log_version_id_fkey;

ALTER TABLE public.notification_template_audit_log 
ADD CONSTRAINT notification_template_audit_log_version_id_fkey 
FOREIGN KEY (version_id) REFERENCES public.notification_template_versions(id) ON DELETE SET NULL;

-- =============================================
-- 7. ÍNDICES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_notification_templates_event_channel 
ON public.notification_templates(event_slug, channel);

CREATE INDEX IF NOT EXISTS idx_notification_templates_bu 
ON public.notification_templates(bu_id) WHERE bu_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_template_versions_template 
ON public.notification_template_versions(template_id);

CREATE INDEX IF NOT EXISTS idx_notification_template_audit_template 
ON public.notification_template_audit_log(template_id);

CREATE INDEX IF NOT EXISTS idx_notification_template_variables_event 
ON public.notification_template_variables(event_slug);

-- =============================================
-- 8. RLS POLICIES
-- =============================================
ALTER TABLE public.notification_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_template_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_template_variables ENABLE ROW LEVEL SECURITY;

-- Variables: leitura global
DROP POLICY IF EXISTS "Template variables readable by authenticated" ON public.notification_template_variables;
CREATE POLICY "Template variables readable by authenticated"
ON public.notification_template_variables FOR SELECT
TO authenticated USING (true);

-- Versions: leitura para authenticated
DROP POLICY IF EXISTS "Template versions readable by authenticated" ON public.notification_template_versions;
CREATE POLICY "Template versions readable by authenticated"
ON public.notification_template_versions FOR SELECT
TO authenticated USING (true);

-- Versions: INSERT para authenticated
DROP POLICY IF EXISTS "Template versions insertable by authenticated" ON public.notification_template_versions;
CREATE POLICY "Template versions insertable by authenticated"
ON public.notification_template_versions FOR INSERT
TO authenticated WITH CHECK (true);

-- Audit: leitura para authenticated
DROP POLICY IF EXISTS "Audit logs readable by authenticated" ON public.notification_template_audit_log;
CREATE POLICY "Audit logs readable by authenticated"
ON public.notification_template_audit_log FOR SELECT
TO authenticated USING (true);

-- Audit: INSERT para authenticated
DROP POLICY IF EXISTS "Audit logs insertable by authenticated" ON public.notification_template_audit_log;
CREATE POLICY "Audit logs insertable by authenticated"
ON public.notification_template_audit_log FOR INSERT
TO authenticated WITH CHECK (true);

-- =============================================
-- 9. FUNÇÃO: Resolver template ativo
-- =============================================
CREATE OR REPLACE FUNCTION public.resolve_notification_template(
  p_event_slug TEXT,
  p_channel TEXT,
  p_bu_id UUID DEFAULT NULL
)
RETURNS TABLE (
  template_id UUID,
  version_id UUID,
  subject TEXT,
  body TEXT,
  variables_used TEXT[],
  is_bu_override BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template RECORD;
  v_version RECORD;
BEGIN
  -- 1. Tentar template específico da BU
  IF p_bu_id IS NOT NULL THEN
    SELECT t.id, t.current_version_id INTO v_template
    FROM notification_templates t
    WHERE t.event_slug = p_event_slug
      AND t.channel = p_channel
      AND t.bu_id = p_bu_id
      AND t.is_active = true
      AND t.current_version_id IS NOT NULL
    LIMIT 1;
    
    IF v_template.id IS NOT NULL THEN
      SELECT v.id, v.subject, v.body, v.variables_used INTO v_version
      FROM notification_template_versions v
      WHERE v.id = v_template.current_version_id;
      
      IF v_version.id IS NOT NULL THEN
        template_id := v_template.id;
        version_id := v_version.id;
        subject := v_version.subject;
        body := v_version.body;
        variables_used := v_version.variables_used;
        is_bu_override := true;
        RETURN NEXT;
        RETURN;
      END IF;
    END IF;
  END IF;
  
  -- 2. Fallback: template global (bu_id IS NULL)
  SELECT t.id, t.current_version_id INTO v_template
  FROM notification_templates t
  WHERE t.event_slug = p_event_slug
    AND t.channel = p_channel
    AND t.bu_id IS NULL
    AND t.is_active = true
    AND t.current_version_id IS NOT NULL
  LIMIT 1;
  
  IF v_template.id IS NOT NULL THEN
    SELECT v.id, v.subject, v.body, v.variables_used INTO v_version
    FROM notification_template_versions v
    WHERE v.id = v_template.current_version_id;
    
    IF v_version.id IS NOT NULL THEN
      template_id := v_template.id;
      version_id := v_version.id;
      subject := v_version.subject;
      body := v_version.body;
      variables_used := v_version.variables_used;
      is_bu_override := false;
      RETURN NEXT;
      RETURN;
    END IF;
  END IF;
  
  -- 3. Nenhum template encontrado
  RETURN;
END;
$$;

-- =============================================
-- 10. FUNÇÃO: Validar variáveis do template
-- =============================================
CREATE OR REPLACE FUNCTION public.validate_template_variables(
  p_event_slug TEXT,
  p_body TEXT,
  p_subject TEXT DEFAULT NULL
)
RETURNS TABLE (
  is_valid BOOLEAN,
  invalid_variables TEXT[],
  missing_required TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_used_vars TEXT[];
  v_allowed_vars TEXT[];
  v_required_vars TEXT[];
  v_invalid TEXT[] := '{}';
  v_missing TEXT[] := '{}';
  v_var TEXT;
  v_full_text TEXT;
BEGIN
  v_full_text := COALESCE(p_subject, '') || ' ' || COALESCE(p_body, '');
  
  SELECT array_agg(DISTINCT m[1])
  INTO v_used_vars
  FROM regexp_matches(v_full_text, '\{\{(\w+)\}\}', 'g') AS m;
  
  v_used_vars := COALESCE(v_used_vars, '{}');
  
  SELECT array_agg(variable_key)
  INTO v_allowed_vars
  FROM notification_template_variables
  WHERE event_slug = p_event_slug;
  
  -- Variáveis globais sempre permitidas
  v_allowed_vars := COALESCE(v_allowed_vars, '{}') || ARRAY['title', 'message', 'actor_name', 'context_url', 'context_type', 'severity', 'bu_name', 'user_name'];
  
  SELECT array_agg(variable_key)
  INTO v_required_vars
  FROM notification_template_variables
  WHERE event_slug = p_event_slug AND is_required = true;
  
  v_required_vars := COALESCE(v_required_vars, '{}');
  
  FOREACH v_var IN ARRAY v_used_vars
  LOOP
    IF NOT (v_var = ANY(v_allowed_vars)) THEN
      v_invalid := array_append(v_invalid, v_var);
    END IF;
  END LOOP;
  
  FOREACH v_var IN ARRAY v_required_vars
  LOOP
    IF NOT (v_var = ANY(v_used_vars)) THEN
      v_missing := array_append(v_missing, v_var);
    END IF;
  END LOOP;
  
  is_valid := (array_length(v_invalid, 1) IS NULL);
  invalid_variables := v_invalid;
  missing_required := v_missing;
  RETURN NEXT;
END;
$$;

-- =============================================
-- 11. SEED: Variáveis globais
-- =============================================
INSERT INTO public.notification_template_variables (event_slug, variable_key, variable_label, variable_type, example_value, is_required)
VALUES
  -- Variáveis globais (usando um event existente como base)
  ('notifications.test', 'title', 'Título', 'string', 'Notificação de Teste', false),
  ('notifications.test', 'message', 'Mensagem', 'string', 'Esta é uma mensagem de teste', false),
  ('notifications.test', 'actor_name', 'Nome do Ator', 'string', 'João Silva', false),
  ('notifications.test', 'context_url', 'URL de Contexto', 'url', '/tickets/123', false),
  
  -- Variáveis de Tickets
  ('ticket.created', 'ticket_title', 'Título do Ticket', 'string', 'Problema com login', false),
  ('ticket.created', 'ticket_id', 'ID do Ticket', 'string', 'TKT-001', false),
  ('ticket.assigned', 'ticket_title', 'Título do Ticket', 'string', 'Problema com login', false),
  ('ticket.assigned', 'assignee_name', 'Nome do Responsável', 'string', 'Maria Santos', false),
  
  -- Variáveis de Assets
  ('asset.checkout', 'asset_name', 'Nome do Ativo', 'string', 'MacBook Pro', false),
  ('asset.checkout', 'due_at', 'Data de Devolução', 'date', '2026-01-15', false),
  ('asset.return.reminder', 'asset_name', 'Nome do Ativo', 'string', 'MacBook Pro', false),
  ('asset.return.reminder', 'due_at', 'Data de Devolução', 'date', '2026-01-15', true),
  
  -- Variáveis de OKRs
  ('okr.checkin.created', 'kr_title', 'Título do KR', 'string', 'Aumentar NPS', false),
  ('okr.checkin.created', 'checkin_value', 'Valor do Check-in', 'number', '75', false),
  ('okr.checkin.overdue', 'kr_title', 'Título do KR', 'string', 'Aumentar NPS', false),
  ('okr.checkin.overdue', 'days_overdue', 'Dias em Atraso', 'number', '14', false)
ON CONFLICT (event_slug, variable_key) DO NOTHING;

-- =============================================
-- 12. GRANT PERMISSIONS
-- =============================================
GRANT SELECT ON public.notification_template_variables TO authenticated;
GRANT SELECT ON public.notification_template_versions TO authenticated;
GRANT SELECT ON public.notification_template_audit_log TO authenticated;
GRANT INSERT ON public.notification_template_versions TO authenticated;
GRANT INSERT ON public.notification_template_audit_log TO authenticated;

GRANT EXECUTE ON FUNCTION public.resolve_notification_template(TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_notification_template(TEXT, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_template_variables(TEXT, TEXT, TEXT) TO authenticated;