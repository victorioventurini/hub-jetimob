-- =============================================
-- PHASE 5: Permission Keys + RPCs para Templates
-- =============================================

-- Inserir permission keys para templates de notificação
INSERT INTO public.permission_catalog (key, module, resource, action, scope, description)
VALUES 
  ('notifications.templates.read:bu', 'notifications', 'templates', 'read', 'bu', 'Permite visualizar templates de notificação da BU'),
  ('notifications.templates.edit:bu', 'notifications', 'templates', 'edit', 'bu', 'Permite criar e editar templates de notificação da BU'),
  ('notifications.templates.activate:bu', 'notifications', 'templates', 'activate', 'bu', 'Permite ativar versões de templates de notificação'),
  ('notifications.templates.rollback:bu', 'notifications', 'templates', 'rollback', 'bu', 'Permite fazer rollback para versões anteriores de templates')
ON CONFLICT (key) DO NOTHING;

-- Conceder todas as permissions de templates para bu_admin
INSERT INTO public.permission_template_items_v2 (template_id, permission_key)
SELECT 
  pt.id,
  pk.key
FROM public.permission_templates_v2 pt
CROSS JOIN (
  SELECT key FROM public.permission_catalog 
  WHERE key IN (
    'notifications.templates.read:bu',
    'notifications.templates.edit:bu',
    'notifications.templates.activate:bu',
    'notifications.templates.rollback:bu'
  )
) pk
WHERE pt.slug = 'bu_admin'
ON CONFLICT (template_id, permission_key) DO NOTHING;

-- =============================================
-- RPC: Criar nova versão de template
-- =============================================
CREATE OR REPLACE FUNCTION public.create_template_version(
  p_template_id UUID,
  p_subject TEXT,
  p_body TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version_id UUID;
  v_new_version INTEGER;
  v_event_slug TEXT;
  v_variables_used TEXT[];
  v_validation JSONB;
BEGIN
  -- Buscar event_slug do template
  SELECT event_slug INTO v_event_slug
  FROM notification_templates
  WHERE id = p_template_id;
  
  IF v_event_slug IS NULL THEN
    RAISE EXCEPTION 'Template não encontrado';
  END IF;
  
  -- Validar variáveis
  v_validation := validate_template_variables(v_event_slug, p_body, p_subject);
  
  IF (v_validation->>'valid')::boolean = false THEN
    RAISE EXCEPTION 'Variáveis inválidas: %', v_validation->>'invalid_variables';
  END IF;
  
  -- Extrair variáveis usadas
  v_variables_used := ARRAY(
    SELECT DISTINCT m[1]
    FROM regexp_matches(COALESCE(p_body, '') || ' ' || COALESCE(p_subject, ''), '\{\{([a-z_]+)\}\}', 'g') AS m
  );
  
  -- Calcular próxima versão
  SELECT COALESCE(MAX(version), 0) + 1 INTO v_new_version
  FROM notification_template_versions
  WHERE template_id = p_template_id;
  
  -- Inserir nova versão
  INSERT INTO notification_template_versions (
    template_id,
    version,
    subject,
    body,
    variables_used,
    created_by,
    is_approved
  )
  VALUES (
    p_template_id,
    v_new_version,
    p_subject,
    p_body,
    v_variables_used,
    auth.uid(),
    true  -- Auto-approve
  )
  RETURNING id INTO v_version_id;
  
  -- Atualizar template com nova versão ativa
  UPDATE notification_templates
  SET 
    current_version_id = v_version_id,
    subject_template = p_subject,
    body_template = p_body,
    version = v_new_version,
    updated_at = now()
  WHERE id = p_template_id;
  
  -- Registrar no audit log
  INSERT INTO notification_template_audit_log (
    template_id,
    version_id,
    action,
    actor_id,
    changes
  )
  VALUES (
    p_template_id,
    v_version_id,
    'create',
    auth.uid(),
    jsonb_build_object(
      'version', v_new_version,
      'reason', p_reason,
      'subject', p_subject,
      'body_preview', LEFT(p_body, 200)
    )
  );
  
  RETURN v_version_id;
END;
$$;

-- =============================================
-- RPC: Ativar versão específica (rollback)
-- =============================================
CREATE OR REPLACE FUNCTION public.activate_template_version(
  p_template_id UUID,
  p_version_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version_record RECORD;
  v_old_version_id UUID;
  v_action TEXT;
BEGIN
  -- Buscar dados da versão
  SELECT id, version, subject, body INTO v_version_record
  FROM notification_template_versions
  WHERE id = p_version_id AND template_id = p_template_id;
  
  IF v_version_record.id IS NULL THEN
    RAISE EXCEPTION 'Versão não encontrada';
  END IF;
  
  -- Buscar versão anterior para determinar se é rollback
  SELECT current_version_id INTO v_old_version_id
  FROM notification_templates
  WHERE id = p_template_id;
  
  -- Determinar ação (activate vs rollback)
  IF v_old_version_id IS NOT NULL THEN
    SELECT 
      CASE 
        WHEN ntv.version > v_version_record.version THEN 'rollback'
        ELSE 'activate'
      END INTO v_action
    FROM notification_template_versions ntv
    WHERE ntv.id = v_old_version_id;
  ELSE
    v_action := 'activate';
  END IF;
  
  -- Atualizar template
  UPDATE notification_templates
  SET 
    current_version_id = p_version_id,
    subject_template = v_version_record.subject,
    body_template = v_version_record.body,
    version = v_version_record.version,
    updated_at = now()
  WHERE id = p_template_id;
  
  -- Registrar no audit log
  INSERT INTO notification_template_audit_log (
    template_id,
    version_id,
    action,
    actor_id,
    changes
  )
  VALUES (
    p_template_id,
    p_version_id,
    v_action,
    auth.uid(),
    jsonb_build_object(
      'version', v_version_record.version,
      'reason', p_reason,
      'previous_version_id', v_old_version_id
    )
  );
  
  RETURN true;
END;
$$;

-- =============================================
-- RPC: Criar template para BU (se não existir)
-- =============================================
CREATE OR REPLACE FUNCTION public.create_bu_template(
  p_bu_id UUID,
  p_event_slug TEXT,
  p_channel TEXT,
  p_subject TEXT,
  p_body TEXT,
  p_reason TEXT DEFAULT 'Criação inicial'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template_id UUID;
  v_version_id UUID;
  v_variables_used TEXT[];
  v_validation JSONB;
BEGIN
  -- Verificar se já existe template para esta BU+evento+canal
  SELECT id INTO v_template_id
  FROM notification_templates
  WHERE bu_id = p_bu_id 
    AND event_slug = p_event_slug 
    AND channel = p_channel;
  
  IF v_template_id IS NOT NULL THEN
    RAISE EXCEPTION 'Template já existe para esta BU/evento/canal';
  END IF;
  
  -- Validar variáveis
  v_validation := validate_template_variables(p_event_slug, p_body, p_subject);
  
  IF (v_validation->>'valid')::boolean = false THEN
    RAISE EXCEPTION 'Variáveis inválidas: %', v_validation->>'invalid_variables';
  END IF;
  
  -- Extrair variáveis
  v_variables_used := ARRAY(
    SELECT DISTINCT m[1]
    FROM regexp_matches(COALESCE(p_body, '') || ' ' || COALESCE(p_subject, ''), '\{\{([a-z_]+)\}\}', 'g') AS m
  );
  
  -- Criar template
  INSERT INTO notification_templates (
    bu_id,
    event_slug,
    channel,
    subject_template,
    body_template,
    version,
    is_active
  )
  VALUES (
    p_bu_id,
    p_event_slug,
    p_channel,
    p_subject,
    p_body,
    1,
    true
  )
  RETURNING id INTO v_template_id;
  
  -- Criar versão inicial
  INSERT INTO notification_template_versions (
    template_id,
    version,
    subject,
    body,
    variables_used,
    created_by,
    is_approved
  )
  VALUES (
    v_template_id,
    1,
    p_subject,
    p_body,
    v_variables_used,
    auth.uid(),
    true
  )
  RETURNING id INTO v_version_id;
  
  -- Atualizar current_version_id
  UPDATE notification_templates
  SET current_version_id = v_version_id
  WHERE id = v_template_id;
  
  -- Registrar no audit log
  INSERT INTO notification_template_audit_log (
    template_id,
    version_id,
    action,
    actor_id,
    changes
  )
  VALUES (
    v_template_id,
    v_version_id,
    'create',
    auth.uid(),
    jsonb_build_object(
      'version', 1,
      'reason', p_reason,
      'event_slug', p_event_slug,
      'channel', p_channel
    )
  );
  
  RETURN v_template_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_template_version TO authenticated;
GRANT EXECUTE ON FUNCTION public.activate_template_version TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_bu_template TO authenticated;