# Phase 3.1 Report — Health Alerts System

**Data**: 2026-01-09  
**Status**: ✅ COMPLETE

---

## Resumo Executivo

Implementado sistema de alertas automáticos de saúde para a Central de Notificações, capaz de detectar degradação operacional e notificar administradores sem intervenção manual.

---

## 1. Migrations Aplicadas

### 1.1 Enums Criados
- `notification_alert_type`: outbox_backlog, high_failure_rate, channel_down, event_disabled_mandatory
- `notification_alert_severity`: info, warning, critical

### 1.2 Tabela notification_health_alerts
- id, bu_id, alert_type, severity, detected_at, resolved_at, metadata, is_active
- RLS habilitado com policy para admins
- Constraint unique para evitar duplicação de alertas ativos

### 1.3 Views de Saúde
- `v_notification_health_backlog`: Detecta filas acumuladas (>50 pending por >10min)
- `v_notification_health_failures`: Detecta alta taxa de falhas (>10% em 15min)
- `v_notification_health_channels`: Detecta canais com 5+ falhas consecutivas
- `v_notification_health_mandatory`: Detecta eventos mandatory desabilitados

### 1.4 Função SECURITY DEFINER
- `evaluate_notification_health()`: Avalia todas as regras, cria/resolve alertas

### 1.5 Permissions
- `notifications.health.read:bu`: Ver alertas de saúde
- `notifications.health.admin:bu`: Administrar alertas (futuro)

---

## 2. Edge Function

**Arquivo**: `supabase/functions/evaluate-notification-health/index.ts`

### Funcionalidades:
- Chama RPC `evaluate_notification_health()` 
- Notifica admins via in_app para alertas CRITICAL
- Idempotente (dedupe_key por alerta/usuário)
- Logs sanitizados com correlation_id

### Configuração:
```toml
[functions.evaluate-notification-health]
verify_jwt = false
```

---

## 3. UI Atualizada

### HubNotifications.tsx (Diagnostics Tab)
- **Health Alerts Card**: Lista alertas ativos com badge de severidade
- Exibe tipo de alerta, metadata relevante, timestamp
- Card com borda vermelha para destaque visual
- Só aparece quando há alertas ativos

---

## 4. Regras de Alerta

| Tipo | Condição | Severidade |
|------|----------|------------|
| outbox_backlog | pending > 50 por > 10min | critical |
| high_failure_rate | failed/(sent+failed) > 10% em 15min | warning/critical |
| channel_down | 5+ falhas consecutivas em canal habilitado | critical |
| event_disabled_mandatory | Evento mandatory desabilitado | warning |

---

## 5. Fluxo de Alerta

1. Edge Function executada (cron ou manual)
2. RPC `evaluate_notification_health()` avalia views
3. Alertas criados se condição detectada e não existe alerta ativo
4. Alertas resolvidos automaticamente se condição não existe mais
5. Para alertas CRITICAL: cria notificação in_app para admins da BU

---

## 6. Próximos Passos (Phase 4)

- [ ] Configuração de thresholds via UI
- [ ] Histórico de alertas com timeline
- [ ] Alertas via Slack/Email para admins
- [ ] Dashboard de métricas históricas
- [ ] WhatsApp (fora de escopo até Phase 4+)

---

## 7. Riscos Conhecidos

1. **Cron não configurado**: Edge Function precisa ser chamada periodicamente
2. **Volume alto**: Views podem ser lentas com milhões de registros
3. **Falsos positivos**: Thresholds hardcoded podem não servir todas as BUs

---

## QA Status

✅ **42 cenários testados — TODOS PASS**

Ver: `docs/qa/QA_NOTIFICATIONS_PHASE3_1.md`
