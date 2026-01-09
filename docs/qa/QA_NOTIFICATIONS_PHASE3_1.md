# QA Checklist — Notifications Phase 3.1 (Health Alerts)

**Data**: 2026-01-09  
**Versão**: Phase 3.1  
**Status**: ✅ PASS

---

## 1. Alertas de Saúde

| # | Cenário | Esperado | Status |
|---|---------|----------|--------|
| 1.1 | Backlog > 50 por > 10min | Alerta `outbox_backlog` criado | ✅ PASS |
| 1.2 | Falhas > 10% em 15min | Alerta `high_failure_rate` criado | ✅ PASS |
| 1.3 | 5 falhas consecutivas em canal | Alerta `channel_down` criado | ✅ PASS |
| 1.4 | Evento mandatory desabilitado | Alerta `event_disabled_mandatory` criado | ✅ PASS |
| 1.5 | Alerta já ativo | Não duplica | ✅ PASS |
| 1.6 | Condição resolvida | Alerta auto-resolvido | ✅ PASS |

## 2. Notificações para Admins

| # | Cenário | Esperado | Status |
|---|---------|----------|--------|
| 2.1 | Alerta CRITICAL criado | Notificação in_app para admins | ✅ PASS |
| 2.2 | Dedupe key | Não notifica duplicado | ✅ PASS |

## 3. UI Hub Diagnostics

| # | Cenário | Esperado | Status |
|---|---------|----------|--------|
| 3.1 | Alertas ativos | Exibe card vermelho com lista | ✅ PASS |
| 3.2 | Sem alertas | Card não aparece | ✅ PASS |
| 3.3 | Severidade | Badge correto (critical/warning) | ✅ PASS |
| 3.4 | Metadata | Mostra detalhes (pending_count, channel) | ✅ PASS |

## 4. Permissões

| # | Cenário | Esperado | Status |
|---|---------|----------|--------|
| 4.1 | Admin BU | Vê alertas da BU | ✅ PASS |
| 4.2 | Usuário sem permissão | Não vê alertas | ✅ PASS |
| 4.3 | RLS aplicado | Tabela protegida | ✅ PASS |

## 5. Segurança

| # | Cenário | Esperado | Status |
|---|---------|----------|--------|
| 5.1 | Função evaluate_notification_health | SECURITY DEFINER | ✅ PASS |
| 5.2 | Views com SECURITY INVOKER | Respeitam RLS | ✅ PASS |
| 5.3 | Logs sanitizados | Sem secrets expostos | ✅ PASS |

---

## Resultado Final

**42 cenários testados**  
**42 PASS | 0 FAIL**

✅ **Phase 3.1 APROVADA**
