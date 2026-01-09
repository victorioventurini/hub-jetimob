# Phase 4: Observabilidade & Governança de Notificações - Report

**Data:** 2026-01-09  
**Status:** ✅ COMPLETO

## 1. Problema Original

A migration SQL estava falhando devido ao uso incorreto do cast `::numeric` com `FILTER`:

```sql
-- ERRADO:
ROUND(AVG(x)::numeric FILTER (WHERE ...), 2)

-- CORRETO:
ROUND((AVG(x) FILTER (WHERE ...))::numeric, 2)
```

## 2. Correção Aplicada

Todas as views SLO foram criadas com sintaxe correta:

```sql
ROUND(
  COALESCE(
    (AVG(EXTRACT(EPOCH FROM (o.sent_at - o.created_at)) * 1000) 
     FILTER (WHERE o.sent_at IS NOT NULL))::numeric,
    0
  ), 2
) AS avg_delivery_time_ms
```

## 3. Schema Changes

### 3.1 Tabelas Criadas

| Tabela | Descrição |
|--------|-----------|
| `notification_health_alerts` | Alertas com cooldown/escalation |
| `notification_health_alert_actions` | Auditoria de ações |
| `notification_health_runbooks` | Guias de resolução |

### 3.2 Colunas Adicionadas

- `notification_outbox.sent_at` - Para cálculo de tempo de entrega

### 3.3 Views SLO Criadas

| View | Descrição |
|------|-----------|
| `v_notification_slo_by_channel_daily` | Métricas diárias por canal |
| `v_notification_slo_by_event_daily` | Métricas diárias por evento |
| `v_notification_slo_summary_7d` | Resumo 7 dias com SLO compliance |

### 3.4 Funções Criadas

| Função | Descrição |
|--------|-----------|
| `evaluate_notification_health()` | Avalia saúde com escalation |
| `acknowledge_health_alert()` | Reconhece alerta |
| `resolve_health_alert()` | Resolve alerta manualmente |

### 3.5 Índices de Performance

- `idx_outbox_bu_created`
- `idx_outbox_bu_channel_status`
- `idx_outbox_event_created`
- `idx_outbox_status_created`
- `idx_outbox_sent_at`
- `idx_unique_active_alert_per_bu_type` (partial unique)
- `idx_health_alerts_active`

### 3.6 Permissões Adicionadas

- `notifications.slo.read:bu`
- `notifications.slo.admin:bu`
- `notifications.health.ack:bu`

## 4. Edge Function Changes

`evaluate-notification-health` atualizada com:

- **Cooldown**: Respeita `cooldown_minutes` antes de renotificar
- **Escalation**: warning → critical após 3 ocorrências
- **Auto-resolve**: Limpa alertas quando condição normaliza
- **Logs sanitizados**: Não expõe secrets

## 5. UI Changes

Novos componentes em `/hub/notifications?tab=diagnostics`:

- `DiagnosticsSloCard`: Métricas SLO por canal e eventos problemáticos
- `DiagnosticsHealthAlertsCard`: Alertas com ações, runbooks e cooldown

## 6. QA

Ver `docs/qa/QA_NOTIFICATIONS_PHASE4.md`

**Resultado: PASS**
