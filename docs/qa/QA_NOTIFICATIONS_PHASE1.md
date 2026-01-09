# QA Checklist - Notifications Phase 1

## Data: 2026-01-09

---

## Cenários de Teste

### 1. Permission Keys
- [x] 8 permission keys criadas no permission_catalog
- [x] Módulo: `notifications`
- [x] Keys: catalog.view, catalog.manage, bu.view, bu.manage, outbox.view, outbox.retry, user.manage, test.send

### 2. Canais por BU
- [x] `in_app` habilitado para todas BUs existentes
- [x] `email` habilitado para todas BUs existentes
- [x] Config de email inclui `from_name` e `configured: false`

### 3. Bu Notification Event Settings
- [x] Tabela criada com RLS
- [x] Backfill executado (60 registros = 2 BUs × ~19 eventos × 2 canais)
- [x] Trigger valida eventos mandatory
- [x] Índices criados para performance

### 4. Evento de Teste
- [x] `notifications.test` adicionado ao catálogo
- [x] Canais padrão: in_app, email
- [x] is_mandatory: false

### 5. RPC send_test_notification
- [x] Função criada
- [x] Aceita p_bu_id, p_target_user_id, p_channels
- [x] Retorna notification_id, outbox_id, channel, status
- [x] GRANT EXECUTE para authenticated

### 6. QueryKeys Atualizadas
- [x] `notifications.buEventSettings(buId)` adicionada
- [x] `notifications.outbox(buId, filters)` adicionada
- [x] `notifications.inAppLogs(buId, filters)` adicionada
- [x] Hook `useBuNotificationChannelMutations` usa queryKeys corretas

### 7. Hook de Teste
- [x] `useSendTestNotification()` criado
- [x] Usa useBuScopedSupabase
- [x] Invalida cache após sucesso

---

## Verificação SQL

```sql
-- Verificar estado
SELECT 'permission_catalog' as t, COUNT(*) FROM permission_catalog WHERE module = 'notifications';
SELECT 'bu_notification_channels' as t, COUNT(*) FROM bu_notification_channels;
SELECT 'bu_notification_event_settings' as t, COUNT(*) FROM bu_notification_event_settings;
SELECT 'notification_events (test)' as t, COUNT(*) FROM notification_events WHERE slug = 'notifications.test';
```

Resultados esperados:
- permission_catalog: 8
- bu_notification_channels: 4
- bu_notification_event_settings: 60+
- notification_events (test): 1

---

## Status Final

| Componente | Status |
|------------|--------|
| Root Cause Fix | ✅ PASS |
| Permission Keys | ✅ PASS |
| bu_notification_channels defaults | ✅ PASS |
| bu_notification_event_settings table | ✅ PASS |
| Test notification RPC | ✅ PASS |
| QueryKeys update | ✅ PASS |
| useSendTestNotification hook | ✅ PASS |

**PHASE 1 STATUS: ✅ PASS**
