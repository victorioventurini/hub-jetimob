# NOTIFICATIONS COMPLIANCE REPORT

**Versão:** 1.0  
**Data:** 2026-01-07  
**Referência:** TCR v2.4.0  
**Status Geral:** ⚠️ **PARTIAL**

---

## 1. RESUMO EXECUTIVO

A Central de Notificações foi implementada seguindo a arquitetura definida no TCR v2.4.0, com separação clara entre níveis Global, BU e Usuário. O modelo de dados está correto, as RLS policies estão configuradas, e a função de emissão de eventos está operacional.

**Pontos Fortes:**
- ✅ Modelo de dados completo e normalizado
- ✅ RLS policies adequadas em todas as tabelas
- ✅ Separação correta Global/BU/Usuário
- ✅ Suporte a eventos obrigatórios
- ✅ Arquitetura extensível para novos canais

**Pontos de Atenção:**
- ⚠️ Rotas de frontend não registradas no App.tsx
- ⚠️ Sistema legado de menções ainda em uso paralelo
- ⚠️ Edge Function de processamento do outbox não implementada
- ⚠️ Migração dos módulos para usar `emit_notification_event` pendente

---

## 2. CONFORMIDADE DO MODELO DE DADOS

| Tabela | RLS Ativa | bu_id | Scope Correto | Políticas | Status |
|--------|-----------|-------|---------------|-----------|--------|
| `notification_events` | ✅ | N/A (Global) | ✅ | SELECT: any, ALL: super_admin | ✅ PASS |
| `notification_channels` | ✅ | N/A (Global) | ✅ | SELECT: any, ALL: super_admin | ✅ PASS |
| `bu_notification_channels` | ✅ | ✅ NOT NULL | ✅ user_has_bu_access | SELECT: BU members, ALL: BU admins | ✅ PASS |
| `user_notification_preferences_v2` | ✅ | ✅ NOT NULL | ✅ user_id = auth.uid() | Own data only | ✅ PASS |
| `notification_outbox` | ✅ | ✅ NOT NULL | ✅ | SELECT: own + admin | ✅ PASS |
| `notifications` | ✅ | ✅ (nullable) | ⚠️ | SELECT/UPDATE: own | ⚠️ PARTIAL |

### Observações:
- `notifications.bu_id` é nullable para compatibilidade com sistema legado
- Não há acesso cross-BU nas políticas verificadas
- Nenhuma coluna hardcoded por módulo

---

## 3. CONFORMIDADE DE GOVERNANÇA

### 3.1 Nível GLOBAL (/hub/notifications)

| Requisito | Status | Observação |
|-----------|--------|------------|
| Catálogo único de eventos | ✅ PASS | 18 eventos em 6 módulos |
| Catálogo único de canais | ✅ PASS | 5 canais (in_app, email, slack, whatsapp, webhook) |
| Campo `audience` | ✅ PASS | internal, external, both |
| Campo `is_mandatory` | ✅ PASS | 7 eventos obrigatórios |
| Campo `default_channels` | ✅ PASS | Array de canais padrão |
| Sem lógica de BU | ✅ PASS | Tabelas globais sem bu_id |
| Página frontend | ⚠️ PARTIAL | Arquivo criado, rota não registrada |

### 3.2 Nível BU (/settings/notifications)

| Requisito | Status | Observação |
|-----------|--------|------------|
| Ativar/desativar canais por BU | ✅ PASS | `bu_notification_channels.is_enabled` |
| Configurar canais (Slack, etc) | ✅ PASS | `bu_notification_channels.config` (JSONB) |
| Isolamento entre BUs | ✅ PASS | RLS com `user_has_bu_access(bu_id)` |
| Página frontend | ⚠️ PARTIAL | Arquivo criado, rota não registrada |

### 3.3 Nível USUÁRIO (/me/notifications)

| Requisito | Status | Observação |
|-----------|--------|------------|
| Preferências por evento + canal | ✅ PASS | `user_notification_preferences_v2` |
| Eventos obrigatórios bloqueados | ✅ PASS | Validação na função `set_user_notification_preference` |
| Externos veem apenas external/both | ✅ PASS | Função `get_user_notification_settings` filtra |
| Página frontend | ⚠️ PARTIAL | Arquivo criado, rota não registrada |

---

## 4. CONFORMIDADE DO FLUXO DE EVENTOS

| Requisito | Status | Observação |
|-----------|--------|------------|
| Função `emit_notification_event` | ✅ PASS | Implementada com todos os parâmetros |
| Gera `notification` (in-app) | ✅ PASS | INSERT direto na tabela |
| Gera `notification_outbox` | ✅ PASS | Para canais != in_app |
| Respeita tipo de usuário | ✅ PASS | Verifica `partner_contacts` |
| Respeita BU atual | ✅ PASS | Parâmetro `p_bu_id` obrigatório |
| Respeita preferências | ✅ PASS | Consulta `user_notification_preferences_v2` |
| Respeita eventos obrigatórios | ✅ PASS | Ignora preferência se `is_mandatory = true` |

### Migração de Módulos

| Módulo | Usa `emit_notification_event` | Status |
|--------|-------------------------------|--------|
| Core (Menções) | ❌ Usa sistema legado | ⚠️ PENDENTE |
| Tickets | ❌ Não migrado | ⚠️ PENDENTE |
| OKRs | ❌ Usa `processMentions` legado | ⚠️ PENDENTE |
| Assets | ❌ Não migrado | ⚠️ PENDENTE |
| KPIs | ❌ Não migrado | ⚠️ PENDENTE |
| Teams | ❌ Não migrado | ⚠️ PENDENTE |

---

## 5. CONFORMIDADE RBAC + RLS

| Verificação | Status | Observação |
|-------------|--------|------------|
| `super_admin` gerencia tudo | ✅ PASS | `is_super_admin(auth.uid())` em políticas globais |
| Admin BU gerencia apenas sua BU | ✅ PASS | `is_bu_admin(auth.uid(), bu_id)` |
| Usuário vê apenas suas notificações | ✅ PASS | `user_id = auth.uid()` |
| Usuário configura apenas suas preferências | ✅ PASS | RLS em `user_notification_preferences_v2` |
| Externo não recebe eventos internos | ✅ PASS | Filtro em `emit_notification_event` |
| Uso de `user_has_bu_access()` | ✅ PASS | Em `bu_notification_channels` |
| Políticas permissivas | ✅ PASS | Apenas em SELECT de catálogos globais (intencional) |

---

## 6. CONFORMIDADE DE FRONTEND

| Componente | Arquivo | Rota | Status |
|------------|---------|------|--------|
| Hub Notifications | `src/pages/hub/HubNotifications.tsx` | `/hub/notifications` | ⚠️ ARQUIVO OK, ROTA FALTA |
| Settings Notifications | `src/pages/settings/SettingsNotifications.tsx` | `/settings/notifications` | ⚠️ ARQUIVO OK, ROTA FALTA |
| User Preferences | `src/pages/me/NotificationPreferences.tsx` | `/me/notifications` | ⚠️ ARQUIVO OK, ROTA FALTA |
| Notification Bell | `src/components/notifications/NotificationCenter.tsx` | N/A (Topbar) | ✅ PASS |

### Verificação de UX

| Item | Status | Observação |
|------|--------|------------|
| Estados vazios | ✅ PASS | Mensagens apropriadas |
| Feedback ao salvar | ✅ PASS | Toast de sucesso/erro |
| Eventos obrigatórios bloqueados | ✅ PASS | Switch desabilitado + badge "Obrigatório" |
| Agrupamento por módulo | ✅ PASS | Accordion organizado |

---

## 7. PREPARAÇÃO PARA FUTUROS CANAIS

| Requisito | Status | Observação |
|-----------|--------|------------|
| Slack não hardcoded | ✅ PASS | Configuração via JSONB |
| WhatsApp não hardcoded | ✅ PASS | Configuração via JSONB |
| Webhook genérico | ✅ PASS | Canal com `requires_configuration` |
| `notification_outbox` genérica | ✅ PASS | Payload JSONB flexível |
| Campos de retry | ✅ PASS | `retries`, `max_retries`, `next_retry_at`, `last_error` |
| Edge Function de processamento | ❌ FAIL | Não implementada |

---

## 8. QA CHECKLIST

| Teste | Status | Evidência |
|-------|--------|-----------|
| Evento obrigatório ignora preferências | ✅ PASS | Código em `emit_notification_event`: `IF NOT v_event.is_mandatory THEN` |
| Usuário externo não recebe evento interno | ✅ PASS | Código: `IF v_is_external AND v_event.audience = 'internal' THEN CONTINUE` |
| Admin BU configura Slack sem afetar outra BU | ✅ PASS | RLS: `is_bu_admin(auth.uid(), bu_id)` |
| Troca de BU isola notificações | ✅ PASS | Preferências têm `bu_id` |
| Notification Bell atualiza corretamente | ✅ PASS | Realtime subscription + refetch 30s |
| Falha de envio gera retry | ⚠️ PARTIAL | Schema OK, processador não implementado |
| Outbox não perde eventos | ✅ PASS | Inserção transacional |

---

## 9. RISCOS REMANESCENTES

### Alta Prioridade
1. **Rotas não registradas** - Páginas criadas mas inacessíveis via navegação
2. **Edge Function do Outbox** - Emails e outros canais não são processados
3. **Migração de módulos** - Sistema legado rodando em paralelo

### Média Prioridade
4. **`notifications.bu_id` nullable** - Pode causar inconsistências
5. **Documentação de API** - Falta documentar parâmetros do `emit_notification_event`

### Baixa Prioridade
6. **Testes automatizados** - Não existem testes para o fluxo de notificações

---

## 10. RECOMENDAÇÕES TÉCNICAS

### Imediato (P0)
1. Registrar rotas em `App.tsx`:
   - `/hub/notifications` (AdminRoute)
   - `/settings/notifications` (ProtectedRoute + BuRequiredRoute)
   - `/me/notifications` (ProtectedRoute)

2. Criar Edge Function `process-notification-outbox`:
   - Processar entradas com status `pending`
   - Implementar retry com backoff exponencial
   - Enviar via canal apropriado (email, Slack, etc.)

### Curto Prazo (P1)
3. Migrar `useNotifications.ts` (menções) para usar `emit_notification_event`
4. Migrar módulo Tickets para emitir eventos
5. Atualizar `notifications.bu_id` para NOT NULL após migração

### Médio Prazo (P2)
6. Implementar processador Slack
7. Implementar processador WhatsApp
8. Criar dashboard de métricas de notificações

---

## 11. CONFIRMAÇÃO TCR v2.4.0

| Princípio TCR | Status |
|---------------|--------|
| Segurança por padrão (RLS + BU scope) | ✅ PASS |
| Separação Global / BU / Usuário | ✅ PASS |
| Nenhuma lógica hardcoded por módulo | ✅ PASS |
| Tudo baseado em eventos | ⚠️ PARTIAL (migração pendente) |
| Extensível para novos canais | ✅ PASS |
| Usuários externos suportados | ✅ PASS |
| Compatível com Slack/WhatsApp/Webhooks | ✅ PASS (schema pronto) |

---

## 12. CONCLUSÃO

A Central de Notificações está **PARCIALMENTE IMPLEMENTADA**. A infraestrutura de banco de dados, RLS e funções está completa e correta. Os componentes de frontend foram criados seguindo o design system.

**Bloqueadores para produção:**
1. Rotas não registradas em App.tsx
2. Edge Function de processamento não existe
3. Nenhum módulo migrado para o novo sistema

**Ação recomendada:** Completar os 3 itens bloqueadores antes de considerar a feature como concluída.

---

*Relatório gerado automaticamente por auditoria técnica.*
