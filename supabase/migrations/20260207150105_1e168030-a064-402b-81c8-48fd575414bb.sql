-- ============================================
-- Asset Recommendation Expiry Notifications
-- ============================================
-- Templates para os 5 eventos já criados na migration anterior
-- Corrigindo nomes de colunas: channel, subject_template, body_template

-- ============================================
-- 1. Inserir templates de notificação (email + in_app)
-- ============================================

INSERT INTO notification_templates (event_slug, channel, subject_template, body_template, is_active, bu_id)
VALUES 
  -- 15 dias antes - email
  ('asset.recommendation.expiring.15d', 'email', 
   '[{{bu_name}}] Recomendação vence em 15 dias - {{current_datetime}}',
   E'# Recomendação de Equipamento\n\nOlá {{owner_name}},\n\nA recomendação **{{recommendation_name}}** precisa ser revisada em **15 dias**.\n\n📅 Data de vencimento: {{due_date}}\n\n[Revisar Recomendação]({{context_url}})\n\nEssa revisão garante que as especificações de equipamentos estejam sempre atualizadas.',
   true, NULL),
  -- 15 dias antes - in_app
  ('asset.recommendation.expiring.15d', 'in_app',
   'Recomendação vence em 15 dias',
   'A recomendação "{{recommendation_name}}" precisa ser revisada em 15 dias.',
   true, NULL),
   
  -- 7 dias antes - email
  ('asset.recommendation.expiring.7d', 'email',
   '[{{bu_name}}] Recomendação vence em 7 dias - {{current_datetime}}',
   E'# Recomendação de Equipamento\n\nOlá {{owner_name}},\n\nA recomendação **{{recommendation_name}}** precisa ser revisada em **7 dias**.\n\n📅 Data de vencimento: {{due_date}}\n\n[Revisar Recomendação]({{context_url}})\n\nNão deixe para a última hora!',
   true, NULL),
  -- 7 dias antes - in_app
  ('asset.recommendation.expiring.7d', 'in_app',
   'Recomendação vence em 7 dias',
   'A recomendação "{{recommendation_name}}" precisa ser revisada em 7 dias.',
   true, NULL),
   
  -- No dia - email
  ('asset.recommendation.expiring.today', 'email',
   '[{{bu_name}}] Recomendação vence HOJE - {{current_datetime}}',
   E'# ⚠️ Recomendação Vence Hoje\n\nOlá {{owner_name}},\n\nA recomendação **{{recommendation_name}}** vence **HOJE**.\n\n[Revisar Agora]({{context_url}})\n\nPor favor, revise a recomendação para manter as especificações atualizadas.',
   true, NULL),
  -- No dia - in_app
  ('asset.recommendation.expiring.today', 'in_app',
   'Recomendação vence HOJE',
   'A recomendação "{{recommendation_name}}" vence hoje. Revise agora.',
   true, NULL),
   
  -- 7 dias depois - email
  ('asset.recommendation.expired.7d', 'email',
   '[{{bu_name}}] Recomendação vencida há 7 dias - {{current_datetime}}',
   E'# 🔴 Recomendação Vencida\n\nOlá {{owner_name}},\n\nA recomendação **{{recommendation_name}}** está vencida há **7 dias**.\n\n📅 Data de vencimento: {{due_date}}\n\n[Revisar Recomendação]({{context_url}})\n\nRecomendações desatualizadas podem levar a compras inadequadas de equipamentos.',
   true, NULL),
  -- 7 dias depois - in_app
  ('asset.recommendation.expired.7d', 'in_app',
   'Recomendação vencida há 7 dias',
   'A recomendação "{{recommendation_name}}" está vencida há 7 dias.',
   true, NULL),
   
  -- 15 dias depois - email
  ('asset.recommendation.expired.15d', 'email',
   '[{{bu_name}}] URGENTE: Recomendação vencida há 15 dias - {{current_datetime}}',
   E'# 🚨 Ação Urgente Necessária\n\nOlá {{owner_name}},\n\nA recomendação **{{recommendation_name}}** está vencida há **15 dias**.\n\n📅 Data de vencimento: {{due_date}}\n\n[Revisar Imediatamente]({{context_url}})\n\n**Esta é uma notificação urgente.** Recomendações muito desatualizadas podem impactar significativamente as decisões de compra de equipamentos.',
   true, NULL),
  -- 15 dias depois - in_app
  ('asset.recommendation.expired.15d', 'in_app',
   'URGENTE: Recomendação vencida há 15 dias',
   'A recomendação "{{recommendation_name}}" está vencida há 15 dias. Ação urgente necessária.',
   true, NULL)
ON CONFLICT DO NOTHING;