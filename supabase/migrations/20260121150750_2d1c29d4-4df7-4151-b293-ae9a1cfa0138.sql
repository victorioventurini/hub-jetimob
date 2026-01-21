
-- =============================================
-- MIGRAÇÃO: Partner Companies Global com CPF/CNPJ (FINALIZAÇÃO)
-- =============================================

-- As fases 1-7 já foram aplicadas nas tentativas anteriores
-- Esta migration apenas adiciona as permissões com a estrutura correta

-- FASE 8: Adicionar permissões ao catálogo com estrutura correta
INSERT INTO permission_catalog (key, module, resource, action, scope, description) VALUES
  ('partners.company.read:global', 'partners', 'company', 'read', 'global', 'Visualizar cadastro global de parceiros'),
  ('partners.company.create:global', 'partners', 'company', 'create', 'global', 'Cadastrar nova empresa parceira'),
  ('partners.company.update:global', 'partners', 'company', 'update', 'global', 'Alterar dados de empresa parceira'),
  ('partners.company.delete:global', 'partners', 'company', 'delete', 'global', 'Remover empresa parceira do sistema'),
  ('partners.company.manage:bu', 'partners', 'company', 'manage', 'bu', 'Ativar/desativar parceiro na BU'),
  ('partners.services.manage:global', 'partners', 'services', 'manage', 'global', 'Configurar categorias atendidas pelo parceiro')
ON CONFLICT (key) DO NOTHING;
