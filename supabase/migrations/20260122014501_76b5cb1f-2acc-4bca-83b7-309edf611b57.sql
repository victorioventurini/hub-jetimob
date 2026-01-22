-- ============================================================
-- NOTIFICATION TEMPLATES v2 - Migration 3/3
-- Update existing templates + Create new ones
-- ============================================================

-- ============================================================
-- UPDATE EXISTING TEMPLATES (by ID)
-- ============================================================

-- TICKET.CREATED (id: c3a934db-bace-43d7-b9e4-b7196054fe0f)
UPDATE public.notification_templates SET
  subject_template = '[{{bu_name}}] Novo ticket: {{title}} - {{current_datetime}}',
  body_template = E'<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <p style="margin: 0 0 16px;">Olá <strong>{{user_name}}</strong>,</p>
  <p style="margin: 0 0 16px;">Um novo ticket foi aberto na <strong>{{bu_name}}</strong>.</p>
  <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p style="margin: 0 0 8px;"><strong>Ticket:</strong> {{title}}</p>
    <p style="margin: 0 0 8px;"><strong>Solicitante:</strong> {{requester_name}}</p>
    <p style="margin: 0 0 8px;"><strong>Prioridade:</strong> {{priority}}</p>
    <p style="margin: 0;"><strong>Categoria:</strong> {{category}}</p>
  </div>
  <div style="background: #fafafa; border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 16px 0;">{{message}}</div>
  <a href="{{context_url}}" style="display: inline-block; background: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; margin-top: 16px;">Abrir Ticket</a>
  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
  <p style="color: #71717a; font-size: 14px; margin: 0;">Hub da {{bu_name}}</p>
</div>',
  updated_at = now()
WHERE id = 'c3a934db-bace-43d7-b9e4-b7196054fe0f';

-- TICKET.ASSIGNED (id: 6dd5a0ea-902e-4bf8-839e-7a5c7fb867fc)
UPDATE public.notification_templates SET
  subject_template = '[{{bu_name}}] Ticket atribuído: {{title}} - {{current_datetime}}',
  body_template = E'<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <p style="margin: 0 0 16px;">Olá <strong>{{user_name}}</strong>,</p>
  <p style="margin: 0 0 16px;">Um ticket foi atribuído a você na <strong>{{bu_name}}</strong>.</p>
  <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p style="margin: 0 0 8px;"><strong>Ticket:</strong> {{title}}</p>
    <p style="margin: 0 0 8px;"><strong>Solicitante:</strong> {{requester_name}}</p>
    <p style="margin: 0;"><strong>Atribuído em:</strong> {{assigned_at}}</p>
  </div>
  <a href="{{context_url}}" style="display: inline-block; background: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; margin-top: 16px;">Ver Ticket</a>
  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
  <p style="color: #71717a; font-size: 14px; margin: 0;">Hub da {{bu_name}}</p>
</div>',
  updated_at = now()
WHERE id = '6dd5a0ea-902e-4bf8-839e-7a5c7fb867fc';

-- TICKET.STATUS.CHANGED (id: 0eb95418-fbaa-4194-942d-9aa9699da47f)
UPDATE public.notification_templates SET
  subject_template = '[{{bu_name}}] Status alterado: {{title}} - {{current_datetime}}',
  body_template = E'<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <p style="margin: 0 0 16px;">Olá <strong>{{user_name}}</strong>,</p>
  <p style="margin: 0 0 16px;">O status do ticket foi alterado na <strong>{{bu_name}}</strong>.</p>
  <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p style="margin: 0 0 8px;"><strong>Ticket:</strong> {{title}}</p>
    <p style="margin: 0 0 8px;"><strong>Novo status:</strong> {{new_status}}</p>
    <p style="margin: 0;"><strong>Alterado por:</strong> {{actor_name}}</p>
  </div>
  <a href="{{context_url}}" style="display: inline-block; background: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; margin-top: 16px;">Ver Ticket</a>
  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
  <p style="color: #71717a; font-size: 14px; margin: 0;">Hub da {{bu_name}}</p>
</div>',
  updated_at = now()
WHERE id = '0eb95418-fbaa-4194-942d-9aa9699da47f';

-- MENTION.CREATED (id: 82e932a6-0d5c-442d-ba60-7867432f82b6)
UPDATE public.notification_templates SET
  subject_template = '[{{bu_name}}] {{actor_name}} mencionou você - {{current_datetime}}',
  body_template = E'<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <p style="margin: 0 0 16px;">Olá <strong>{{user_name}}</strong>,</p>
  <p style="margin: 0 0 16px;"><strong>{{actor_name}}</strong> mencionou você na <strong>{{bu_name}}</strong>:</p>
  <div style="background: #f4f4f5; border-left: 4px solid #8b5cf6; border-radius: 0 8px 8px 0; padding: 16px; margin: 16px 0;">{{message}}</div>
  <a href="{{context_url}}" style="display: inline-block; background: #8b5cf6; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">Ver Contexto</a>
  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
  <p style="color: #71717a; font-size: 14px; margin: 0;">Hub da {{bu_name}}</p>
</div>',
  updated_at = now()
WHERE id = '82e932a6-0d5c-442d-ba60-7867432f82b6';

-- OKR.CHECKIN.CREATED (id: 59b99740-da74-4cec-89d6-08198e4b3acc)
UPDATE public.notification_templates SET
  subject_template = '[{{bu_name}}] Check-in: {{kr_title}} - {{current_datetime}}',
  body_template = E'<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <p style="margin: 0 0 16px;">Olá <strong>{{user_name}}</strong>,</p>
  <p style="margin: 0 0 16px;">Um check-in foi registrado na <strong>{{bu_name}}</strong>.</p>
  <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p style="margin: 0 0 8px;"><strong>Objetivo:</strong> {{objective_title}}</p>
    <p style="margin: 0 0 8px;"><strong>KR:</strong> {{kr_title}}</p>
    <p style="margin: 0 0 8px;"><strong>Progresso:</strong> {{progress_percentage}}</p>
    <p style="margin: 0;"><strong>Por:</strong> {{actor_name}}</p>
  </div>
  <div style="background: #fafafa; border-left: 4px solid #10b981; padding: 12px 16px; margin: 16px 0;">{{checkin_comment}}</div>
  <a href="{{context_url}}" style="display: inline-block; background: #10b981; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">Ver Detalhes</a>
  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
  <p style="color: #71717a; font-size: 14px; margin: 0;">Hub da {{bu_name}}</p>
</div>',
  updated_at = now()
WHERE id = '59b99740-da74-4cec-89d6-08198e4b3acc';

-- OKR.CHECKIN.OVERDUE (id: cabe83f8-0e19-48bb-bd12-eec09bdbf03c)
UPDATE public.notification_templates SET
  subject_template = '[{{bu_name}}] ⚠️ Check-in atrasado: {{kr_title}} - {{current_datetime}}',
  body_template = E'<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <p style="margin: 0 0 16px;">Olá <strong>{{user_name}}</strong>,</p>
  <p style="margin: 0 0 16px;">Um Key Result está sem check-in há <strong>{{days_overdue}} dias</strong> na <strong>{{bu_name}}</strong>.</p>
  <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p style="margin: 0 0 8px;"><strong>Objetivo:</strong> {{objective_title}}</p>
    <p style="margin: 0 0 8px;"><strong>KR:</strong> {{kr_title}}</p>
    <p style="margin: 0 0 8px;"><strong>Responsável:</strong> {{kr_owner}}</p>
    <p style="margin: 0;"><strong>Último check-in:</strong> {{last_checkin_date}}</p>
  </div>
  <a href="{{context_url}}" style="display: inline-block; background: #f59e0b; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">Fazer Check-in</a>
  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
  <p style="color: #71717a; font-size: 14px; margin: 0;">Hub da {{bu_name}}</p>
</div>',
  updated_at = now()
WHERE id = 'cabe83f8-0e19-48bb-bd12-eec09bdbf03c';

-- TEAM.MEMBER.ADDED (id: d33a67de-83bc-491b-8b04-f518e60dd6c5)
UPDATE public.notification_templates SET
  subject_template = '[{{bu_name}}] Você foi adicionado ao time {{team_name}} - {{current_datetime}}',
  body_template = E'<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <p style="margin: 0 0 16px;">Olá <strong>{{user_name}}</strong>,</p>
  <p style="margin: 0 0 16px;">Você foi adicionado ao time <strong>{{team_name}}</strong> na <strong>{{bu_name}}</strong>.</p>
  <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p style="margin: 0 0 8px;"><strong>Time:</strong> {{team_name}}</p>
    <p style="margin: 0;"><strong>Adicionado por:</strong> {{actor_name}}</p>
  </div>
  <a href="{{context_url}}" style="display: inline-block; background: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">Ver Time</a>
  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
  <p style="color: #71717a; font-size: 14px; margin: 0;">Hub da {{bu_name}}</p>
</div>',
  updated_at = now()
WHERE id = 'd33a67de-83bc-491b-8b04-f518e60dd6c5';

-- ASSET.CHECKOUT (id: b369ed5b-3886-4655-90a8-924c9e6a0b7a)
UPDATE public.notification_templates SET
  subject_template = '[{{bu_name}}] Ativo emprestado: {{asset_name}} - {{current_datetime}}',
  body_template = E'<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <p style="margin: 0 0 16px;">Olá <strong>{{user_name}}</strong>,</p>
  <p style="margin: 0 0 16px;">Um ativo foi emprestado para você na <strong>{{bu_name}}</strong>.</p>
  <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p style="margin: 0 0 8px;"><strong>Ativo:</strong> {{asset_name}} ({{asset_code}})</p>
    <p style="margin: 0 0 8px;"><strong>Categoria:</strong> {{asset_category}}</p>
    <p style="margin: 0 0 8px;"><strong>Data de retirada:</strong> {{checkout_date}}</p>
    <p style="margin: 0 0 8px;"><strong>Devolução prevista:</strong> {{due_at}}</p>
    <p style="margin: 0;"><strong>Autorizado por:</strong> {{authorized_by}}</p>
  </div>
  <a href="{{context_url}}" style="display: inline-block; background: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">Ver Detalhes</a>
  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
  <p style="color: #71717a; font-size: 14px; margin: 0;">Hub da {{bu_name}}</p>
</div>',
  updated_at = now()
WHERE id = 'b369ed5b-3886-4655-90a8-924c9e6a0b7a';

-- KPI.TARGET.REACHED (id: df09dc8d-4b2b-45f2-a306-079df3426d53)
UPDATE public.notification_templates SET
  subject_template = '[{{bu_name}}] 🎉 Meta atingida: {{kpi_name}} - {{current_datetime}}',
  body_template = E'<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <p style="margin: 0 0 16px;">Olá <strong>{{user_name}}</strong>,</p>
  <p style="margin: 0 0 16px;">Parabéns! Uma meta foi atingida na <strong>{{bu_name}}</strong>!</p>
  <div style="background: #d1fae5; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p style="margin: 0 0 8px;"><strong>KPI:</strong> {{kpi_name}}</p>
    <p style="margin: 0 0 8px;"><strong>Valor atual:</strong> {{current_value}}</p>
    <p style="margin: 0;"><strong>Meta:</strong> {{target_value}}</p>
  </div>
  <a href="{{context_url}}" style="display: inline-block; background: #10b981; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">Ver KPI</a>
  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
  <p style="color: #71717a; font-size: 14px; margin: 0;">Hub da {{bu_name}}</p>
</div>',
  updated_at = now()
WHERE id = 'df09dc8d-4b2b-45f2-a306-079df3426d53';

-- PARTNER.INVITE (id: 2479682f-ce74-4ce4-ba8e-df81c5316ded)
UPDATE public.notification_templates SET
  subject_template = '[{{bu_name}}] Você foi convidado para o Hub - {{current_datetime}}',
  body_template = E'<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <p style="margin: 0 0 16px;">Olá <strong>{{user_name}}</strong>,</p>
  <p style="margin: 0 0 16px;">Você foi convidado para acessar o Hub da <strong>{{bu_name}}</strong>.</p>
  <p style="margin: 0 0 16px;">Clique no botão abaixo para acessar o portal e visualizar os tickets compartilhados com você:</p>
  <a href="{{context_url}}" style="display: inline-block; background: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">Acessar Hub</a>
  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
  <p style="color: #71717a; font-size: 14px; margin: 0;">Hub da {{bu_name}}</p>
</div>',
  updated_at = now()
WHERE id = '2479682f-ce74-4ce4-ba8e-df81c5316ded';

-- Log
DO $$
BEGIN
  RAISE NOTICE 'Migration 3a/3 completed: Updated 10 existing templates with v2 copies';
END $$;