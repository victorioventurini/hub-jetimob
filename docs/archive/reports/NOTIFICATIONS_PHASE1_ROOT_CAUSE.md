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

1. ~~Adicionar botão "Enviar Teste" na UI~~ ✅ Implementado
2. ~~Tabs de Outbox e In-App Logs em /settings/notifications~~ ✅ Implementado
3. ~~Configurar cron para `process-notification-outbox`~~ ✅ Migrado para cron-dispatcher externo
4. Health dashboard com métricas

---

## Phase 3 — RLS Hardening (2026-01-11)

### Problema Identificado

As tabs de **Outbox** e **In-App** em `/settings/notifications` não carregavam dados porque as RLS policies estavam incorretas:

1. **Policies originais usavam permission keys sem sufixo `:scope`** (ex: `notifications.outbox.view` ao invés de `notifications.outbox.view:bu`)
2. **Policy de `notifications` para admin view não existia** — apenas a policy de "own notifications" funcionava

### Correções Aplicadas (Migration `20260111235054`)

```sql
-- notification_outbox (SELECT)
CREATE POLICY notification_outbox_view_policy
ON public.notification_outbox FOR SELECT TO authenticated
USING (
  is_current_bu(bu_id) AND (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_permission(auth.uid(), current_bu_id(), 'notifications.outbox.view:bu')
  )
);

-- notification_outbox (UPDATE)
CREATE POLICY notification_outbox_update_policy
ON public.notification_outbox FOR UPDATE TO authenticated
USING (
  is_current_bu(bu_id) AND (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_permission(auth.uid(), current_bu_id(), 'notifications.outbox.retry:bu')
  )
);

-- notifications (SELECT para admin view)
CREATE POLICY notifications_admin_view
ON public.notifications FOR SELECT TO authenticated
USING (
  is_current_bu(bu_id) AND (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_permission(auth.uid(), current_bu_id(), 'notifications.bu.view:bu')
    OR has_permission(auth.uid(), current_bu_id(), 'notifications.bu.manage:bu')
  )
);
```

### Permission Keys Necessárias

| Key | Descrição |
|-----|-----------|
| `notifications.outbox.view:bu` | Ver fila de envio de notificações (outbox) |
| `notifications.outbox.retry:bu` | Reprocessar notificações com falha |
| `notifications.bu.view:bu` | Ver configuração de notificações da BU |
| `notifications.bu.manage:bu` | Gerenciar canais e eventos de notificação da BU |

### Validação

```sql
-- Verificar que usuário tem permissão
SELECT * FROM v_user_effective_permissions 
WHERE user_id = '<user-id>' AND bu_id = '<bu-id>'
AND permission_key IN ('notifications.outbox.view:bu', 'notifications.bu.view:bu');
```
