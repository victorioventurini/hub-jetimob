-- Criar templates de notificação para MBR summary (email + in_app)
INSERT INTO notification_templates (event_slug, channel, subject_template, body_template, is_active)
VALUES
  (
    'mbr.summary',
    'email',
    '[{{bu_name}}] MBR — {{reference_month}} — {{current_datetime}}',
    E'<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">\n<p>{{opening_text}}</p>\n\n<h3>📊 KPIs Críticos</h3>\n{{critical_kpis_summary}}\n\n<h3>🎯 Decisões Estratégicas</h3>\n{{strategic_decisions}}\n\n<h3>🔄 Ajustes de Foco</h3>\n{{focus_adjustments}}\n\n<h3>✅ Próximos Passos</h3>\n{{next_steps}}\n\n<h3>📋 Diretrizes Mensais</h3>\n{{monthly_directives}}\n\n<p>{{closing_text}}</p>\n\n<p style="margin-top: 24px; font-size: 12px; color: #888;"><a href="{{context_url}}">Ver sessão completa</a></p>\n</div>',
    true
  ),
  (
    'mbr.summary',
    'in_app',
    'MBR — {{reference_month}}',
    'Resumo do Monthly Business Review — {{reference_month}}',
    true
  )
ON CONFLICT DO NOTHING;

-- Atualizar modelos dos agentes facilitador-decisoes e revisor-comunicacao
-- de gpt-4-turbo (legacy, não suportado pelo Lovable AI Gateway) para modelo suportado
UPDATE ai_agents
SET model_name = 'google/gemini-3-flash-preview', updated_at = now()
WHERE slug IN ('facilitador-decisoes', 'revisor-comunicacao')
  AND model_name = 'gpt-4-turbo';