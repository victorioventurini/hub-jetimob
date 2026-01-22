-- ============================================================
-- NOTIFICATION TEMPLATES v2 - Migration 3b/3
-- Create NEW templates that don't exist yet
-- ============================================================

-- TICKET.ASSIGNED_TO_EXTERNAL (NEW)
INSERT INTO public.notification_templates (event_slug, channel, subject_template, body_template, version, is_active, bu_id)
VALUES (
  'ticket.assigned_to_external',
  'email',
  '[{{bu_name}}] Você recebeu um ticket: {{title}} - {{current_datetime}}',
  E'<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <p style="margin: 0 0 16px;">Olá <strong>{{user_name}}</strong>,</p>
  <p style="margin: 0 0 16px;">A <strong>{{bu_name}}</strong> atribuiu um ticket para você.</p>
  <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p style="margin: 0 0 8px;"><strong>Ticket:</strong> {{title}}</p>
    <p style="margin: 0;"><strong>Solicitante:</strong> {{requester_name}}</p>
  </div>
  <p style="margin: 16px 0;">Acesse o Hub para responder:</p>
  <a href="{{context_url}}" style="display: inline-block; background: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">Acessar Ticket</a>
  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
  <p style="color: #71717a; font-size: 14px; margin: 0;">Hub da {{bu_name}}</p>
</div>',
  1,
  true,
  NULL
);

-- TICKET.MESSAGE.CREATED (NEW)
INSERT INTO public.notification_templates (event_slug, channel, subject_template, body_template, version, is_active, bu_id)
VALUES (
  'ticket.message.created',
  'email',
  '[{{bu_name}}] {{actor_name}} respondeu: {{title}} - {{current_datetime}}',
  E'<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <p style="margin: 0 0 16px;">Olá <strong>{{user_name}}</strong>,</p>
  <p style="margin: 0 0 16px;"><strong>{{actor_name}}</strong> enviou uma mensagem no ticket na <strong>{{bu_name}}</strong>:</p>
  <div style="background: #f4f4f5; border-left: 4px solid #3b82f6; border-radius: 0 8px 8px 0; padding: 16px; margin: 16px 0;">{{message}}</div>
  <a href="{{context_url}}" style="display: inline-block; background: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">Responder</a>
  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
  <p style="color: #71717a; font-size: 14px; margin: 0;">Hub da {{bu_name}}</p>
</div>',
  1,
  true,
  NULL
);

-- TICKET.SLA.WARNING (NEW)
INSERT INTO public.notification_templates (event_slug, channel, subject_template, body_template, version, is_active, bu_id)
VALUES (
  'ticket.sla.warning',
  'email',
  '[{{bu_name}}] ⚠️ SLA próximo: {{title}} - {{current_datetime}}',
  E'<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <p style="margin: 0 0 16px;">Olá <strong>{{user_name}}</strong>,</p>
  <p style="margin: 0 0 16px;">O SLA do ticket está próximo do vencimento na <strong>{{bu_name}}</strong>.</p>
  <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p style="margin: 0 0 8px;"><strong>Ticket:</strong> {{title}}</p>
    <p style="margin: 0 0 8px;"><strong>Vence em:</strong> {{sla_due_at}}</p>
    <p style="margin: 0;"><strong>Tempo restante:</strong> {{time_remaining}}</p>
  </div>
  <a href="{{context_url}}" style="display: inline-block; background: #f59e0b; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">Resolver Agora</a>
  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
  <p style="color: #71717a; font-size: 14px; margin: 0;">Hub da {{bu_name}}</p>
</div>',
  1,
  true,
  NULL
);

-- TICKET.SLA.BREACHED (NEW)
INSERT INTO public.notification_templates (event_slug, channel, subject_template, body_template, version, is_active, bu_id)
VALUES (
  'ticket.sla.breached',
  'email',
  '[{{bu_name}}] 🚨 SLA violado: {{title}} - {{current_datetime}}',
  E'<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <p style="margin: 0 0 16px;">Olá <strong>{{user_name}}</strong>,</p>
  <p style="margin: 0 0 16px;">O SLA do ticket foi violado na <strong>{{bu_name}}</strong>.</p>
  <div style="background: #fee2e2; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p style="margin: 0 0 8px;"><strong>Ticket:</strong> {{title}}</p>
    <p style="margin: 0 0 8px;"><strong>SLA expirou em:</strong> {{sla_due_at}}</p>
    <p style="margin: 0;"><strong>Tempo excedido:</strong> {{time_overdue}}</p>
  </div>
  <a href="{{context_url}}" style="display: inline-block; background: #ef4444; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">Ação Urgente</a>
  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
  <p style="color: #71717a; font-size: 14px; margin: 0;">Hub da {{bu_name}}</p>
</div>',
  1,
  true,
  NULL
);

-- OKR.KR.STATUS_CHANGED (NEW)
INSERT INTO public.notification_templates (event_slug, channel, subject_template, body_template, version, is_active, bu_id)
VALUES (
  'okr.kr.status_changed',
  'email',
  '[{{bu_name}}] Status alterado: {{kr_title}} - {{current_datetime}}',
  E'<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <p style="margin: 0 0 16px;">Olá <strong>{{user_name}}</strong>,</p>
  <p style="margin: 0 0 16px;">O status de um Key Result foi alterado na <strong>{{bu_name}}</strong>.</p>
  <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p style="margin: 0 0 8px;"><strong>KR:</strong> {{kr_title}}</p>
    <p style="margin: 0 0 8px;"><strong>Novo status:</strong> {{new_status}}</p>
    <p style="margin: 0;"><strong>Alterado por:</strong> {{actor_name}}</p>
  </div>
  <a href="{{context_url}}" style="display: inline-block; background: #10b981; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">Ver KR</a>
  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
  <p style="color: #71717a; font-size: 14px; margin: 0;">Hub da {{bu_name}}</p>
</div>',
  1,
  true,
  NULL
);

-- OKR.OBJECTIVE.SHARED (NEW)
INSERT INTO public.notification_templates (event_slug, channel, subject_template, body_template, version, is_active, bu_id)
VALUES (
  'okr.objective.shared',
  'email',
  '[{{bu_name}}] {{actor_name}} compartilhou um objetivo - {{current_datetime}}',
  E'<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <p style="margin: 0 0 16px;">Olá <strong>{{user_name}}</strong>,</p>
  <p style="margin: 0 0 16px;"><strong>{{actor_name}}</strong> compartilhou um objetivo com você na <strong>{{bu_name}}</strong>.</p>
  <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p style="margin: 0 0 8px;"><strong>Objetivo:</strong> {{objective_title}}</p>
    <p style="margin: 0;"><strong>Time:</strong> {{team_name}}</p>
  </div>
  <a href="{{context_url}}" style="display: inline-block; background: #10b981; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">Ver Objetivo</a>
  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
  <p style="color: #71717a; font-size: 14px; margin: 0;">Hub da {{bu_name}}</p>
</div>',
  1,
  true,
  NULL
);

-- TEAM.MEMBER.REMOVED (NEW)
INSERT INTO public.notification_templates (event_slug, channel, subject_template, body_template, version, is_active, bu_id)
VALUES (
  'team.member.removed',
  'email',
  '[{{bu_name}}] Você foi removido do time {{team_name}} - {{current_datetime}}',
  E'<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <p style="margin: 0 0 16px;">Olá <strong>{{user_name}}</strong>,</p>
  <p style="margin: 0 0 16px;">Você foi removido do time <strong>{{team_name}}</strong> na <strong>{{bu_name}}</strong>.</p>
  <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p style="margin: 0 0 8px;"><strong>Time:</strong> {{team_name}}</p>
    <p style="margin: 0;"><strong>Removido por:</strong> {{actor_name}}</p>
  </div>
  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
  <p style="color: #71717a; font-size: 14px; margin: 0;">Hub da {{bu_name}}</p>
</div>',
  1,
  true,
  NULL
);

-- ASSET.RETURN.REMINDER (NEW)
INSERT INTO public.notification_templates (event_slug, channel, subject_template, body_template, version, is_active, bu_id)
VALUES (
  'asset.return.reminder',
  'email',
  '[{{bu_name}}] ⚠️ Devolução em {{days_until_due}} dias: {{asset_name}} - {{current_datetime}}',
  E'<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <p style="margin: 0 0 16px;">Olá <strong>{{user_name}}</strong>,</p>
  <p style="margin: 0 0 16px;">Lembrete: você precisa devolver um ativo na <strong>{{bu_name}}</strong>.</p>
  <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p style="margin: 0 0 8px;"><strong>Ativo:</strong> {{asset_name}} ({{asset_code}})</p>
    <p style="margin: 0 0 8px;"><strong>Prazo:</strong> {{due_at}}</p>
    <p style="margin: 0;"><strong>Dias restantes:</strong> {{days_until_due}}</p>
  </div>
  <a href="{{context_url}}" style="display: inline-block; background: #f59e0b; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">Ver Detalhes</a>
  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
  <p style="color: #71717a; font-size: 14px; margin: 0;">Hub da {{bu_name}}</p>
</div>',
  1,
  true,
  NULL
);

-- NOTIFICATIONS.TEST (NEW)
INSERT INTO public.notification_templates (event_slug, channel, subject_template, body_template, version, is_active, bu_id)
VALUES (
  'notifications.test',
  'email',
  '[{{bu_name}}] Notificação de teste - {{current_datetime}}',
  E'<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <p style="margin: 0 0 16px;">Olá <strong>{{user_name}}</strong>,</p>
  <p style="margin: 0 0 16px;">Esta é uma notificação de teste enviada na <strong>{{bu_name}}</strong>.</p>
  <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p style="margin: 0;"><strong>Enviado por:</strong> {{actor_name}}</p>
  </div>
  <p style="margin: 16px 0;">Se você recebeu este email, suas notificações estão funcionando corretamente!</p>
  <a href="{{context_url}}" style="display: inline-block; background: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">Acessar Hub</a>
  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
  <p style="color: #71717a; font-size: 14px; margin: 0;">Hub da {{bu_name}}</p>
</div>',
  1,
  true,
  NULL
);

-- Log
DO $$
BEGIN
  RAISE NOTICE 'Migration 3b/3 completed: Created 9 new templates';
END $$;