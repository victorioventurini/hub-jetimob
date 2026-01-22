-- ============================================================
-- NOTIFICATION TEMPLATES v2 - Migration 2/3
-- Register new template variables for v2 copies
-- ============================================================

-- TICKETS - new_status
INSERT INTO public.notification_template_variables (event_slug, variable_key, variable_label, variable_type, example_value, is_required, description)
VALUES ('ticket.status.changed', 'new_status', 'Novo Status', 'string', 'Em andamento', true, 'O novo status do ticket após a alteração')
ON CONFLICT (event_slug, variable_key) DO NOTHING;

-- TICKETS - sla_due_at
INSERT INTO public.notification_template_variables (event_slug, variable_key, variable_label, variable_type, example_value, is_required, description)
VALUES ('ticket.sla.warning', 'sla_due_at', 'Vencimento SLA', 'datetime', '15/01/2026 14:00', true, 'Data e hora de vencimento do SLA')
ON CONFLICT (event_slug, variable_key) DO NOTHING;

INSERT INTO public.notification_template_variables (event_slug, variable_key, variable_label, variable_type, example_value, is_required, description)
VALUES ('ticket.sla.breached', 'sla_due_at', 'Vencimento SLA', 'datetime', '15/01/2026 14:00', true, 'Data e hora de vencimento do SLA')
ON CONFLICT (event_slug, variable_key) DO NOTHING;

-- TICKETS - time_remaining / time_overdue
INSERT INTO public.notification_template_variables (event_slug, variable_key, variable_label, variable_type, example_value, is_required, description)
VALUES ('ticket.sla.warning', 'time_remaining', 'Tempo Restante', 'string', '2 horas', true, 'Tempo restante até o vencimento do SLA')
ON CONFLICT (event_slug, variable_key) DO NOTHING;

INSERT INTO public.notification_template_variables (event_slug, variable_key, variable_label, variable_type, example_value, is_required, description)
VALUES ('ticket.sla.breached', 'time_overdue', 'Tempo Excedido', 'string', '3 horas', true, 'Tempo excedido desde o vencimento do SLA')
ON CONFLICT (event_slug, variable_key) DO NOTHING;

-- OKRs - kr_title
INSERT INTO public.notification_template_variables (event_slug, variable_key, variable_label, variable_type, example_value, is_required, description)
VALUES ('okr.checkin.created', 'kr_title', 'Título do KR', 'string', 'Aumentar NPS para 80', true, 'Título do Key Result')
ON CONFLICT (event_slug, variable_key) DO NOTHING;

INSERT INTO public.notification_template_variables (event_slug, variable_key, variable_label, variable_type, example_value, is_required, description)
VALUES ('okr.checkin.overdue', 'kr_title', 'Título do KR', 'string', 'Aumentar NPS para 80', true, 'Título do Key Result')
ON CONFLICT (event_slug, variable_key) DO NOTHING;

INSERT INTO public.notification_template_variables (event_slug, variable_key, variable_label, variable_type, example_value, is_required, description)
VALUES ('okr.kr.status_changed', 'kr_title', 'Título do KR', 'string', 'Aumentar NPS para 80', true, 'Título do Key Result')
ON CONFLICT (event_slug, variable_key) DO NOTHING;

-- OKRs - objective_title
INSERT INTO public.notification_template_variables (event_slug, variable_key, variable_label, variable_type, example_value, is_required, description)
VALUES ('okr.checkin.created', 'objective_title', 'Título do Objetivo', 'string', 'Melhorar experiência do cliente', true, 'Título do objetivo pai do KR')
ON CONFLICT (event_slug, variable_key) DO NOTHING;

INSERT INTO public.notification_template_variables (event_slug, variable_key, variable_label, variable_type, example_value, is_required, description)
VALUES ('okr.checkin.overdue', 'objective_title', 'Título do Objetivo', 'string', 'Melhorar experiência do cliente', true, 'Título do objetivo pai do KR')
ON CONFLICT (event_slug, variable_key) DO NOTHING;

INSERT INTO public.notification_template_variables (event_slug, variable_key, variable_label, variable_type, example_value, is_required, description)
VALUES ('okr.objective.shared', 'objective_title', 'Título do Objetivo', 'string', 'Melhorar experiência do cliente', true, 'Título do objetivo compartilhado')
ON CONFLICT (event_slug, variable_key) DO NOTHING;

-- OKRs - progress_percentage
INSERT INTO public.notification_template_variables (event_slug, variable_key, variable_label, variable_type, example_value, is_required, description)
VALUES ('okr.checkin.created', 'progress_percentage', 'Progresso', 'string', '75%', false, 'Percentual de progresso do KR')
ON CONFLICT (event_slug, variable_key) DO NOTHING;

-- OKRs - checkin_comment
INSERT INTO public.notification_template_variables (event_slug, variable_key, variable_label, variable_type, example_value, is_required, description)
VALUES ('okr.checkin.created', 'checkin_comment', 'Comentário', 'string', 'Avançamos na implementação do novo fluxo.', false, 'Comentário do check-in')
ON CONFLICT (event_slug, variable_key) DO NOTHING;

-- OKRs - days_overdue
INSERT INTO public.notification_template_variables (event_slug, variable_key, variable_label, variable_type, example_value, is_required, description)
VALUES ('okr.checkin.overdue', 'days_overdue', 'Dias Atrasados', 'number', '7', true, 'Número de dias desde o último check-in')
ON CONFLICT (event_slug, variable_key) DO NOTHING;

-- OKRs - kr_owner
INSERT INTO public.notification_template_variables (event_slug, variable_key, variable_label, variable_type, example_value, is_required, description)
VALUES ('okr.checkin.overdue', 'kr_owner', 'Responsável pelo KR', 'string', 'João Silva', true, 'Nome do responsável pelo Key Result')
ON CONFLICT (event_slug, variable_key) DO NOTHING;

-- OKRs - last_checkin_date
INSERT INTO public.notification_template_variables (event_slug, variable_key, variable_label, variable_type, example_value, is_required, description)
VALUES ('okr.checkin.overdue', 'last_checkin_date', 'Último Check-in', 'datetime', '08/01/2026', false, 'Data do último check-in registrado')
ON CONFLICT (event_slug, variable_key) DO NOTHING;

-- OKRs - new_status for kr.status_changed
INSERT INTO public.notification_template_variables (event_slug, variable_key, variable_label, variable_type, example_value, is_required, description)
VALUES ('okr.kr.status_changed', 'new_status', 'Novo Status', 'string', 'Em dia', true, 'O novo status do Key Result')
ON CONFLICT (event_slug, variable_key) DO NOTHING;

-- TEAMS - team_name
INSERT INTO public.notification_template_variables (event_slug, variable_key, variable_label, variable_type, example_value, is_required, description)
VALUES ('team.member.added', 'team_name', 'Nome do Time', 'string', 'Produto', true, 'Nome do time ao qual o usuário foi adicionado')
ON CONFLICT (event_slug, variable_key) DO NOTHING;

INSERT INTO public.notification_template_variables (event_slug, variable_key, variable_label, variable_type, example_value, is_required, description)
VALUES ('team.member.removed', 'team_name', 'Nome do Time', 'string', 'Produto', true, 'Nome do time do qual o usuário foi removido')
ON CONFLICT (event_slug, variable_key) DO NOTHING;

INSERT INTO public.notification_template_variables (event_slug, variable_key, variable_label, variable_type, example_value, is_required, description)
VALUES ('okr.objective.shared', 'team_name', 'Nome do Time', 'string', 'Produto', false, 'Nome do time associado ao objetivo')
ON CONFLICT (event_slug, variable_key) DO NOTHING;

-- ASSETS - asset_name
INSERT INTO public.notification_template_variables (event_slug, variable_key, variable_label, variable_type, example_value, is_required, description)
VALUES ('asset.checkout', 'asset_name', 'Nome do Ativo', 'string', 'MacBook Pro 16"', true, 'Nome do ativo emprestado')
ON CONFLICT (event_slug, variable_key) DO NOTHING;

INSERT INTO public.notification_template_variables (event_slug, variable_key, variable_label, variable_type, example_value, is_required, description)
VALUES ('asset.return.reminder', 'asset_name', 'Nome do Ativo', 'string', 'MacBook Pro 16"', true, 'Nome do ativo a ser devolvido')
ON CONFLICT (event_slug, variable_key) DO NOTHING;

-- ASSETS - asset_code
INSERT INTO public.notification_template_variables (event_slug, variable_key, variable_label, variable_type, example_value, is_required, description)
VALUES ('asset.checkout', 'asset_code', 'Código do Ativo', 'string', 'IT-001', true, 'Código interno do ativo')
ON CONFLICT (event_slug, variable_key) DO NOTHING;

INSERT INTO public.notification_template_variables (event_slug, variable_key, variable_label, variable_type, example_value, is_required, description)
VALUES ('asset.return.reminder', 'asset_code', 'Código do Ativo', 'string', 'IT-001', true, 'Código interno do ativo')
ON CONFLICT (event_slug, variable_key) DO NOTHING;

-- ASSETS - asset_category
INSERT INTO public.notification_template_variables (event_slug, variable_key, variable_label, variable_type, example_value, is_required, description)
VALUES ('asset.checkout', 'asset_category', 'Categoria do Ativo', 'string', 'Equipamentos de TI', false, 'Categoria do ativo')
ON CONFLICT (event_slug, variable_key) DO NOTHING;

-- ASSETS - checkout_date
INSERT INTO public.notification_template_variables (event_slug, variable_key, variable_label, variable_type, example_value, is_required, description)
VALUES ('asset.checkout', 'checkout_date', 'Data de Retirada', 'datetime', '15/01/2026', true, 'Data em que o ativo foi retirado')
ON CONFLICT (event_slug, variable_key) DO NOTHING;

-- ASSETS - due_at
INSERT INTO public.notification_template_variables (event_slug, variable_key, variable_label, variable_type, example_value, is_required, description)
VALUES ('asset.checkout', 'due_at', 'Devolução Prevista', 'datetime', '22/01/2026', false, 'Data prevista para devolução')
ON CONFLICT (event_slug, variable_key) DO NOTHING;

INSERT INTO public.notification_template_variables (event_slug, variable_key, variable_label, variable_type, example_value, is_required, description)
VALUES ('asset.return.reminder', 'due_at', 'Prazo de Devolução', 'datetime', '22/01/2026', true, 'Data limite para devolução')
ON CONFLICT (event_slug, variable_key) DO NOTHING;

-- ASSETS - authorized_by
INSERT INTO public.notification_template_variables (event_slug, variable_key, variable_label, variable_type, example_value, is_required, description)
VALUES ('asset.checkout', 'authorized_by', 'Autorizado por', 'string', 'Maria Santos', false, 'Nome de quem autorizou a retirada')
ON CONFLICT (event_slug, variable_key) DO NOTHING;

-- ASSETS - days_until_due
INSERT INTO public.notification_template_variables (event_slug, variable_key, variable_label, variable_type, example_value, is_required, description)
VALUES ('asset.return.reminder', 'days_until_due', 'Dias até Devolução', 'number', '3', true, 'Dias restantes até o prazo de devolução')
ON CONFLICT (event_slug, variable_key) DO NOTHING;

-- KPIs - kpi_name
INSERT INTO public.notification_template_variables (event_slug, variable_key, variable_label, variable_type, example_value, is_required, description)
VALUES ('kpi.target.reached', 'kpi_name', 'Nome do KPI', 'string', 'NPS', true, 'Nome do indicador de performance')
ON CONFLICT (event_slug, variable_key) DO NOTHING;

-- KPIs - current_value
INSERT INTO public.notification_template_variables (event_slug, variable_key, variable_label, variable_type, example_value, is_required, description)
VALUES ('kpi.target.reached', 'current_value', 'Valor Atual', 'number', '85', true, 'Valor atual do KPI')
ON CONFLICT (event_slug, variable_key) DO NOTHING;

-- KPIs - target_value
INSERT INTO public.notification_template_variables (event_slug, variable_key, variable_label, variable_type, example_value, is_required, description)
VALUES ('kpi.target.reached', 'target_value', 'Meta', 'number', '80', true, 'Valor da meta atingida')
ON CONFLICT (event_slug, variable_key) DO NOTHING;

-- TICKETS - assigned_at for ticket.assigned
INSERT INTO public.notification_template_variables (event_slug, variable_key, variable_label, variable_type, example_value, is_required, description)
VALUES ('ticket.assigned', 'assigned_at', 'Atribuído em', 'datetime', '15/01/2026 10:30', false, 'Data e hora da atribuição')
ON CONFLICT (event_slug, variable_key) DO NOTHING;

INSERT INTO public.notification_template_variables (event_slug, variable_key, variable_label, variable_type, example_value, is_required, description)
VALUES ('ticket.assigned_to_external', 'assigned_at', 'Atribuído em', 'datetime', '15/01/2026 10:30', false, 'Data e hora da atribuição')
ON CONFLICT (event_slug, variable_key) DO NOTHING;

-- Log
DO $$
BEGIN
  RAISE NOTICE 'Migration 2/3 completed: Registered new template variables';
END $$;