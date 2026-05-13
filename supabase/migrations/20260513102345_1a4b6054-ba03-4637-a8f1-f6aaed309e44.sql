-- Catálogo
INSERT INTO public.permission_catalog (key, module, resource, action, scope, description) VALUES
  ('assessments.theme.view:bu',         'assessments', 'theme',      'view',    'bu', 'Visualizar temas de avaliação'),
  ('assessments.theme.manage:bu',       'assessments', 'theme',      'manage',  'bu', 'Criar/editar/arquivar temas'),
  ('assessments.form.view:bu',          'assessments', 'form',       'view',    'bu', 'Visualizar formulários e versões'),
  ('assessments.form.create:bu',        'assessments', 'form',       'create',  'bu', 'Criar formulários'),
  ('assessments.form.update:bu',        'assessments', 'form',       'update',  'bu', 'Editar formulários (rascunho) e perguntas'),
  ('assessments.form.delete:bu',        'assessments', 'form',       'delete',  'bu', 'Arquivar/excluir formulários'),
  ('assessments.form.publish:bu',       'assessments', 'form',       'publish', 'bu', 'Publicar (congelar) versão de formulário'),
  ('assessments.assessment.view:bu',    'assessments', 'assessment', 'view',    'bu', 'Visualizar avaliações montadas'),
  ('assessments.assessment.create:bu',  'assessments', 'assessment', 'create',  'bu', 'Criar avaliações'),
  ('assessments.assessment.update:bu',  'assessments', 'assessment', 'update',  'bu', 'Editar avaliações'),
  ('assessments.assessment.delete:bu',  'assessments', 'assessment', 'delete',  'bu', 'Arquivar/excluir avaliações'),
  ('assessments.invite.view:bu',        'assessments', 'invite',     'view',    'bu', 'Visualizar convites e status'),
  ('assessments.invite.create:bu',      'assessments', 'invite',     'create',  'bu', 'Gerar convites/links públicos'),
  ('assessments.invite.revoke:bu',      'assessments', 'invite',     'revoke',  'bu', 'Revogar convites'),
  ('assessments.run.view:bu',           'assessments', 'run',        'view',    'bu', 'Visualizar respostas e metadados antifraude'),
  ('assessments.settings.manage:bu',    'assessments', 'settings',   'manage',  'bu', 'Gerenciar configurações do módulo')
ON CONFLICT (key) DO NOTHING;

-- Templates
INSERT INTO public.permission_templates_v2 (slug, name, description) VALUES
  ('assessments_view_v2',    'Avaliações: Visualização v2', 'Leitura de formulários, avaliações, convites e respostas'),
  ('assessments_operate_v2', 'Avaliações: Operador v2',     'Cria/edita formulários, avaliações e convites; sem exclusão nem settings'),
  ('assessments_admin_v2',   'Avaliações: Admin v2',        'Gestão completa do módulo, incluindo settings e exclusões')
ON CONFLICT (slug) DO NOTHING;

-- Vincular itens (permission_key string)
DO $$
DECLARE
  v_view_id   uuid;
  v_op_id     uuid;
  v_admin_id  uuid;
  v_buadm_id  uuid;
BEGIN
  SELECT id INTO v_view_id  FROM permission_templates_v2 WHERE slug = 'assessments_view_v2';
  SELECT id INTO v_op_id    FROM permission_templates_v2 WHERE slug = 'assessments_operate_v2';
  SELECT id INTO v_admin_id FROM permission_templates_v2 WHERE slug = 'assessments_admin_v2';
  SELECT id INTO v_buadm_id FROM permission_templates_v2 WHERE slug = 'bu_admin_v2';

  INSERT INTO permission_template_items_v2 (template_id, permission_key)
  SELECT v_view_id, k FROM unnest(ARRAY[
    'assessments.theme.view:bu',
    'assessments.form.view:bu',
    'assessments.assessment.view:bu',
    'assessments.invite.view:bu',
    'assessments.run.view:bu'
  ]) AS k
  ON CONFLICT DO NOTHING;

  INSERT INTO permission_template_items_v2 (template_id, permission_key)
  SELECT v_op_id, k FROM unnest(ARRAY[
    'assessments.theme.view:bu',
    'assessments.form.view:bu',
    'assessments.form.create:bu',
    'assessments.form.update:bu',
    'assessments.form.publish:bu',
    'assessments.assessment.view:bu',
    'assessments.assessment.create:bu',
    'assessments.assessment.update:bu',
    'assessments.invite.view:bu',
    'assessments.invite.create:bu',
    'assessments.invite.revoke:bu',
    'assessments.run.view:bu'
  ]) AS k
  ON CONFLICT DO NOTHING;

  INSERT INTO permission_template_items_v2 (template_id, permission_key)
  SELECT v_admin_id, pc.key FROM permission_catalog pc WHERE pc.module = 'assessments'
  ON CONFLICT DO NOTHING;

  INSERT INTO permission_template_items_v2 (template_id, permission_key)
  SELECT v_buadm_id, pc.key FROM permission_catalog pc WHERE pc.module = 'assessments'
  ON CONFLICT DO NOTHING;
END $$;