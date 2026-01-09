# Notifications Phase 1 - Root Cause Analysis

## Diagnóstico: Por que "0 notificações enviadas"?

### Data: 2026-01-09

---

## Executive Summary

**ROOT CAUSE IDENTIFICADO**: `bu_notification_channels` estava vazio - nenhuma BU tinha canais de notificação habilitados.

---

## Investigação Detalhada

### A) Estado Inicial das Tabelas

```sql
-- Contagem inicial
SELECT 'notifications' as table_name, COUNT(*) FROM notifications;        -- 0
SELECT 'notification_outbox' as table_name, COUNT(*) FROM notification_outbox; -- 0
SELECT 'bu_notification_channels' as table_name, COUNT(*) FROM bu_notification_channels; -- 0
SELECT 'user_notification_preferences_v2' as table_name, COUNT(*) FROM user_notification_preferences_v2; -- 0
```

### B) Canais por BU

```sql
-- Antes da correção
SELECT bu.name, bnc.channel_slug, bnc.is_enabled
FROM bu_units bu
LEFT JOIN bu_notification_channels bnc ON bu.id = bnc.bu_id;

-- Resultado: NENHUM canal habilitado para nenhuma BU
| bu_name        | channel_slug | is_enabled |
|----------------|--------------|------------|
| Jet Experience | NULL         | NULL       |
| Jetimob        | NULL         | NULL       |
```

### C) Permission Keys

```sql
SELECT key FROM permission_catalog WHERE module = 'notifications';
-- Resultado: 0 registros (nenhuma permission key existia)
```

### D) Fluxo de `emit_notification_event`

A função SQL verifica:
1. Se o canal está habilitado na BU (linhas 312-321)
2. Se o usuário tem preferência desabilitada (linhas 323-336)

**Problema**: Como `bu_notification_channels` estava vazio, o check na linha 314-320 sempre retornava FALSE para canais não-in_app:

```sql
-- Check if channel is enabled for BU (for non-in_app channels)
IF v_channel != 'in_app' THEN
  SELECT is_enabled INTO v_channel_enabled
  FROM public.bu_notification_channels
  WHERE bu_id = p_bu_id AND channel_slug = v_channel;
  
  IF v_channel_enabled IS FALSE THEN  -- NULL também entra aqui!
    CONTINUE;
  END IF;
END IF;
```

---

## Correções Aplicadas

### 1. Permission Keys Criadas (8 novas)

```sql
INSERT INTO permission_catalog (key, module, resource, action, scope, description, status)
VALUES
  ('notifications.catalog.view:platform', ...),
  ('notifications.catalog.manage:platform', ...),
  ('notifications.bu.view:bu', ...),
  ('notifications.bu.manage:bu', ...),
  ('notifications.outbox.view:bu', ...),
  ('notifications.outbox.retry:bu', ...),
  ('notifications.user.manage:self', ...),
  ('notifications.test.send:bu', ...);
```

### 2. Canais Habilitados por Default

```sql
-- in_app para todas BUs
INSERT INTO bu_notification_channels (bu_id, channel_slug, is_enabled, config)
SELECT bu.id, 'in_app', true, '{}'::jsonb FROM bu_units bu;

-- email para todas BUs
INSERT INTO bu_notification_channels (bu_id, channel_slug, is_enabled, config)
SELECT bu.id, 'email', true, jsonb_build_object('from_name', bu.name, 'configured', false)
FROM bu_units bu;
```

### 3. Nova Tabela `bu_notification_event_settings`

Permite controle granular por BU/evento/canal:
- RLS policies aplicadas
- Trigger para impedir desabilitar eventos mandatory
- Backfill automático para todos eventos existentes

### 4. Evento de Teste

Adicionado `notifications.test` ao catálogo + RPC `send_test_notification()`.

---

## Estado Após Correção

```sql
-- Contagem após correção
SELECT 'permission_catalog (notifications)' as table_name, COUNT(*) FROM permission_catalog WHERE module = 'notifications'; -- 8
SELECT 'bu_notification_channels' as table_name, COUNT(*) FROM bu_notification_channels; -- 4
SELECT 'bu_notification_event_settings' as table_name, COUNT(*) FROM bu_notification_event_settings; -- 60
```

---

## Status

| Item | Status |
|------|--------|
| Root cause identificado | ✅ PASS |
| Permission keys criadas | ✅ PASS |
| Canais habilitados por default | ✅ PASS |
| Tabela bu_notification_event_settings | ✅ PASS |
| RPC send_test_notification | ✅ PASS |
| QueryKeys atualizadas | ✅ PASS |

---

## Próximos Passos (Phase 2)

1. Adicionar botão "Enviar Teste" na UI
2. Tabs de Outbox e In-App Logs em /settings/notifications
3. Configurar cron para `process-notification-outbox`
4. Health dashboard com métricas
