
-- =============================================
-- Adicionar variáveis globais para todos os templates
-- =============================================

-- Variáveis Globais (aplicam-se a todos os eventos)
INSERT INTO public.notification_template_variables 
  (event_slug, variable_key, variable_label, variable_type, example_value, is_required, description)
VALUES
  ('__global__', 'bu_name', 'Nome da BU', 'string', 'Jetimob', false, 'Nome da Business Unit'),
  ('__global__', 'user_name', 'Nome do Usuário', 'string', 'João Silva', false, 'Nome do usuário que recebe a notificação'),
  ('__global__', 'actor_name', 'Nome do Ator', 'string', 'Maria Costa', false, 'Nome de quem executou a ação'),
  ('__global__', 'current_date', 'Data Atual', 'date', '10/01/2026', false, 'Data atual formatada'),
  ('__global__', 'current_time', 'Hora Atual', 'time', '14:30', false, 'Hora atual formatada'),
  ('__global__', 'current_datetime', 'Data/Hora Atual', 'datetime', '10/01/2026 14:30', false, 'Data e hora atuais formatadas')
ON CONFLICT (event_slug, variable_key) DO NOTHING;

-- =============================================
-- Variáveis complementares para Tickets
-- =============================================
INSERT INTO public.notification_template_variables 
  (event_slug, variable_key, variable_label, variable_type, example_value, is_required, description)
VALUES
  -- ticket.created
  ('ticket.created', 'ticket_code', 'Código do Ticket', 'string', 'TKT-2026-001', false, 'Código único do ticket'),
  ('ticket.created', 'ticket_category', 'Categoria', 'string', 'Suporte Técnico', false, 'Categoria do ticket'),
  ('ticket.created', 'ticket_subcategory', 'Subcategoria', 'string', 'Problema de Acesso', false, 'Subcategoria do ticket'),
  ('ticket.created', 'ticket_priority', 'Prioridade', 'string', 'Alta', false, 'Prioridade do ticket'),
  ('ticket.created', 'ticket_description', 'Descrição', 'string', 'Não consigo acessar o sistema...', false, 'Descrição resumida do ticket'),
  ('ticket.created', 'ticket_url', 'Link do Ticket', 'url', '/tickets/abc123', false, 'URL para visualizar o ticket'),
  ('ticket.created', 'requester_name', 'Solicitante', 'string', 'Carlos Pereira', false, 'Nome de quem abriu o ticket'),
  ('ticket.created', 'requester_email', 'Email do Solicitante', 'string', 'carlos@empresa.com', false, 'Email de quem abriu o ticket'),
  ('ticket.created', 'created_at', 'Data de Criação', 'datetime', '10/01/2026 09:15', false, 'Data e hora da criação'),
  
  -- ticket.assigned
  ('ticket.assigned', 'ticket_id', 'ID do Ticket', 'string', 'TKT-001', false, 'ID do ticket'),
  ('ticket.assigned', 'ticket_code', 'Código do Ticket', 'string', 'TKT-2026-001', false, 'Código único do ticket'),
  ('ticket.assigned', 'ticket_category', 'Categoria', 'string', 'Suporte Técnico', false, 'Categoria do ticket'),
  ('ticket.assigned', 'ticket_priority', 'Prioridade', 'string', 'Alta', false, 'Prioridade do ticket'),
  ('ticket.assigned', 'ticket_url', 'Link do Ticket', 'url', '/tickets/abc123', false, 'URL para visualizar o ticket'),
  ('ticket.assigned', 'assigned_at', 'Data da Atribuição', 'datetime', '10/01/2026 10:30', false, 'Data e hora da atribuição'),
  ('ticket.assigned', 'requester_name', 'Solicitante', 'string', 'Carlos Pereira', false, 'Nome de quem abriu o ticket')
ON CONFLICT (event_slug, variable_key) DO NOTHING;

-- =============================================
-- Variáveis complementares para OKRs
-- =============================================
INSERT INTO public.notification_template_variables 
  (event_slug, variable_key, variable_label, variable_type, example_value, is_required, description)
VALUES
  -- okr.checkin.created
  ('okr.checkin.created', 'kr_owner', 'Responsável do KR', 'string', 'Ana Silva', false, 'Nome do responsável pelo KR'),
  ('okr.checkin.created', 'objective_title', 'Título do Objetivo', 'string', 'Aumentar satisfação do cliente', false, 'Título do objetivo pai'),
  ('okr.checkin.created', 'team_name', 'Nome do Time', 'string', 'Produto', false, 'Nome do time'),
  ('okr.checkin.created', 'checkin_comment', 'Comentário', 'string', 'Progresso conforme esperado', false, 'Comentário do check-in'),
  ('okr.checkin.created', 'checkin_date', 'Data do Check-in', 'date', '10/01/2026', false, 'Data do check-in'),
  ('okr.checkin.created', 'progress_percentage', 'Progresso (%)', 'number', '75%', false, 'Percentual de progresso'),
  ('okr.checkin.created', 'kr_status', 'Status do KR', 'string', 'Em dia', false, 'Status atual do KR'),
  
  -- okr.checkin.overdue
  ('okr.checkin.overdue', 'kr_owner', 'Responsável do KR', 'string', 'Ana Silva', false, 'Nome do responsável pelo KR'),
  ('okr.checkin.overdue', 'objective_title', 'Título do Objetivo', 'string', 'Aumentar satisfação do cliente', false, 'Título do objetivo pai'),
  ('okr.checkin.overdue', 'team_name', 'Nome do Time', 'string', 'Produto', false, 'Nome do time'),
  ('okr.checkin.overdue', 'last_checkin_date', 'Último Check-in', 'date', '01/12/2025', false, 'Data do último check-in'),
  ('okr.checkin.overdue', 'kr_url', 'Link do KR', 'url', '/okrs/kr/abc123', false, 'URL para visualizar o KR')
ON CONFLICT (event_slug, variable_key) DO NOTHING;

-- =============================================
-- Variáveis complementares para Assets
-- =============================================
INSERT INTO public.notification_template_variables 
  (event_slug, variable_key, variable_label, variable_type, example_value, is_required, description)
VALUES
  -- asset.checkout
  ('asset.checkout', 'asset_code', 'Código do Ativo', 'string', 'NB-001', false, 'Código interno do ativo'),
  ('asset.checkout', 'asset_category', 'Categoria', 'string', 'Notebooks', false, 'Categoria do ativo'),
  ('asset.checkout', 'checkout_date', 'Data de Retirada', 'date', '10/01/2026', false, 'Data da retirada'),
  ('asset.checkout', 'holder_name', 'Responsável', 'string', 'João Silva', false, 'Nome de quem está com o ativo'),
  ('asset.checkout', 'authorized_by', 'Autorizado Por', 'string', 'Maria Costa', false, 'Nome de quem autorizou'),
  ('asset.checkout', 'location_from', 'Local de Origem', 'string', 'Almoxarifado', false, 'Local de onde saiu'),
  
  -- asset.return.reminder
  ('asset.return.reminder', 'asset_code', 'Código do Ativo', 'string', 'NB-001', false, 'Código interno do ativo'),
  ('asset.return.reminder', 'holder_name', 'Responsável', 'string', 'João Silva', false, 'Nome de quem está com o ativo'),
  ('asset.return.reminder', 'days_until_due', 'Dias até Vencimento', 'number', '3', false, 'Dias restantes para devolução'),
  ('asset.return.reminder', 'checkout_date', 'Data de Retirada', 'date', '05/01/2026', false, 'Data da retirada original')
ON CONFLICT (event_slug, variable_key) DO NOTHING;

-- =============================================
-- Variáveis complementares para Partner Invite
-- =============================================
INSERT INTO public.notification_template_variables 
  (event_slug, variable_key, variable_label, variable_type, example_value, is_required, description)
VALUES
  ('partner.invite', 'contact_phone', 'Telefone do Contato', 'string', '(51) 99999-9999', false, 'Telefone do contato'),
  ('partner.invite', 'invite_date', 'Data do Convite', 'date', '10/01/2026', false, 'Data do envio do convite'),
  ('partner.invite', 'services_count', 'Qtd. Serviços', 'number', '5', false, 'Quantidade de serviços habilitados')
ON CONFLICT (event_slug, variable_key) DO NOTHING;
