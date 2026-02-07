-- ============================================
-- Asset Recommendation Expiry Notifications
-- ============================================
-- Criar eventos e função SQL (templates já existem)

-- ============================================
-- 1. Inserir 5 novos eventos de notificação
-- ============================================

INSERT INTO notification_events (slug, module, name, description, audience)
VALUES 
  ('asset.recommendation.expiring.15d', 'assets', 'Recomendação Vence em 15 dias', 'Uma recomendação de equipamento vence em 15 dias', 'internal'),
  ('asset.recommendation.expiring.7d', 'assets', 'Recomendação Vence em 7 dias', 'Uma recomendação de equipamento vence em 7 dias', 'internal'),
  ('asset.recommendation.expiring.today', 'assets', 'Recomendação Vence Hoje', 'Uma recomendação de equipamento vence hoje', 'internal'),
  ('asset.recommendation.expired.7d', 'assets', 'Recomendação Vencida há 7 dias', 'Uma recomendação de equipamento venceu há 7 dias', 'internal'),
  ('asset.recommendation.expired.15d', 'assets', 'Recomendação Vencida há 15 dias', 'Uma recomendação de equipamento venceu há 15 dias', 'internal')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 2. Função para processar vencimentos
-- ============================================

CREATE OR REPLACE FUNCTION public.process_recommendation_expiry_notifications()
RETURNS TABLE (
  notifications_sent INT,
  recommendations_checked INT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec RECORD;
  v_due_date DATE;
  v_days_until INT;
  v_event_slug TEXT;
  v_title TEXT;
  v_message TEXT;
  v_context_url TEXT;
  v_notifications_sent INT := 0;
  v_recommendations_checked INT := 0;
BEGIN
  -- Iterate over active recommendations with owners
  FOR v_rec IN
    SELECT 
      r.id,
      r.bu_id,
      r.name,
      r.owner_user_id,
      r.last_reviewed_at,
      r.review_interval_months,
      (r.last_reviewed_at + (r.review_interval_months || ' months')::INTERVAL)::DATE AS due_date,
      p.display_name AS owner_name
    FROM asset_recommendations r
    JOIN profiles p ON p.id = r.owner_user_id
    WHERE r.status = 'active'
      AND r.deleted_at IS NULL
      AND r.last_reviewed_at IS NOT NULL
      AND r.owner_user_id IS NOT NULL
  LOOP
    v_recommendations_checked := v_recommendations_checked + 1;
    v_due_date := v_rec.due_date;
    v_days_until := v_due_date - CURRENT_DATE;
    v_event_slug := NULL;
    
    -- Determine which notification to send based on days until due
    CASE v_days_until
      WHEN 15 THEN
        v_event_slug := 'asset.recommendation.expiring.15d';
        v_title := 'Recomendação vence em 15 dias';
        v_message := format('A recomendação "%s" precisa ser revisada em 15 dias.', v_rec.name);
      WHEN 7 THEN
        v_event_slug := 'asset.recommendation.expiring.7d';
        v_title := 'Recomendação vence em 7 dias';
        v_message := format('A recomendação "%s" precisa ser revisada em 7 dias.', v_rec.name);
      WHEN 0 THEN
        v_event_slug := 'asset.recommendation.expiring.today';
        v_title := 'Recomendação vence hoje';
        v_message := format('A recomendação "%s" precisa ser revisada hoje.', v_rec.name);
      WHEN -7 THEN
        v_event_slug := 'asset.recommendation.expired.7d';
        v_title := 'Recomendação vencida há 7 dias';
        v_message := format('A recomendação "%s" está vencida há 7 dias. Por favor, revise-a.', v_rec.name);
      WHEN -15 THEN
        v_event_slug := 'asset.recommendation.expired.15d';
        v_title := 'Recomendação vencida há 15 dias';
        v_message := format('A recomendação "%s" está vencida há 15 dias. Ação urgente necessária.', v_rec.name);
      ELSE
        -- No notification for other days
        CONTINUE;
    END CASE;
    
    -- Build context URL using /go pattern
    v_context_url := '/go/asset_recommendation/' || v_rec.id::TEXT;
    
    -- Emit the notification event
    BEGIN
      PERFORM public.emit_notification_event(
        p_event_slug := v_event_slug,
        p_bu_id := v_rec.bu_id,
        p_recipient_ids := ARRAY[v_rec.owner_user_id],
        p_title := v_title,
        p_message := v_message,
        p_context_type := 'asset_recommendation',
        p_context_id := v_rec.id,
        p_context_url := v_context_url,
        p_metadata := jsonb_build_object(
          'recommendation_name', v_rec.name,
          'owner_name', v_rec.owner_name,
          'due_date', v_due_date::TEXT,
          'days_until', v_days_until
        )
      );
      v_notifications_sent := v_notifications_sent + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Log but don't fail the entire process
      RAISE WARNING 'Failed to emit notification for recommendation %: %', v_rec.id, SQLERRM;
    END;
    
  END LOOP;
  
  RETURN QUERY SELECT v_notifications_sent, v_recommendations_checked;
END;
$$;

COMMENT ON FUNCTION public.process_recommendation_expiry_notifications() IS 
'Processa notificações de vencimento de recomendações de equipamentos.
Chamada pelo cron-dispatcher diariamente.
Envia notificações: 15d antes, 7d antes, no dia, 7d depois, 15d depois.
Dedupe automático via emit_notification_event.';