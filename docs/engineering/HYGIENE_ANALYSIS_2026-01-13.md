# 🧹 Análise de Higienização — 2026-01-13

**Objetivo:** Identificar código e arquivos desnecessários para remoção segura.

---

## 📊 Sumário Executivo

| Área | Itens Identificados | Prioridade | Esforço Total |
|------|---------------------|------------|---------------|
| 2.1 Banco de Dados | 6 items | P2-P3 | 2h |
| 2.2 Backend (Edge Functions) | 0 items | — | — |
| 2.3 Frontend | 3 items | P2 | 1h |

---

## 2.1 BANCO DE DADOS

### 2.1.1 Tabela `mentions` — CANDIDATA À REMOÇÃO ⚠️

| Atributo | Valor |
|----------|-------|
| Registros | **0** (vazia) |
| Colunas | 8 |
| RLS | Ativo |
| Dependências DB | Triggers `auto_add_mention_as_participant`, `auto_add_ticket_mention_as_participant`, `create_mention_notification` |

**Análise:**
- Tabela vazia, sistema de mentions migrou para parsing client-side (`@/lib/mentions`)
- Frontend usa `MentionInput` que extrai mentions via regex, não persiste na tabela
- Triggers ainda referenciam a tabela, mas não são executados (tabela vazia)

**Ação Recomendada:**
1. Remover triggers dependentes
2. DROP TABLE mentions
3. Verificar se `useMentionableUsers` precisa de ajuste (provavelmente não)

**Prioridade:** P2  
**Esforço:** 30 min

---

### 2.1.2 Views de Diagnóstico — MANTER (Monitoramento)

| View | Registros | Uso |
|------|-----------|-----|
| `identity_rls_violations` | 0 | ✅ Monitoramento ativo |
| `users_without_v2_permissions` | 44 | ⚠️ Usuários a migrar |
| `v_bu_id_null_report` | 11 | ⚠️ Dados a corrigir |
| `v_permissions_without_explanation` | 34 | ⚠️ Explicações pendentes |
| `v_users_without_templates` | 44 | ⚠️ Templates a atribuir |

**Decisão:** MANTER — são views de monitoramento ativo para compliance.

---

### 2.1.3 Funções com Prefixo `auto_add_mention_*` — CANDIDATAS À REMOÇÃO

| Função | Status |
|--------|--------|
| `auto_add_mention_as_participant` | ⚠️ Órfã (tabela mentions vazia) |
| `auto_add_ticket_mention_as_participant` | ⚠️ Órfã (tabela mentions vazia) |
| `create_mention_notification` | ⚠️ Órfã (tabela mentions vazia) |

**Ação Recomendada:** Remover junto com tabela `mentions`

---

### 2.1.4 Tabela `user_roles` — MANTER ✅

| Atributo | Valor |
|----------|-------|
| Registros | **10** |
| Uso | `useAuth.tsx` → determina `is_platform_admin`, `is_bu_admin` |
| Funções dependentes | `is_platform_admin()`, `is_bu_admin()` |

**Decisão:** MANTER — tabela ativa e crítica para RBAC.

---

## 2.2 BACKEND (Edge Functions)

### Funções Ativas

| Função | Status | Uso |
|--------|--------|-----|
| `audit-permissions` | ✅ Ativo | Auditoria de permissões |
| `auth-email-hook` | ✅ Ativo | Hook de autenticação |
| `cron-dispatcher` | ✅ Ativo | Orquestrador de crons |
| `culture-message` | ✅ Ativo | Mensagens de cultura (Vic) |
| `evaluate-notification-health` | ✅ Ativo | Health check de notificações |
| `get-place-details` | ✅ Ativo | Integração Google Places |
| `get-public-asset` | ✅ Ativo | Assets públicos |
| `get-tcr` | ✅ Ativo | TCR para agentes |
| `invoke-vic` | ✅ Ativo | Orquestrador de agentes IA |
| `process-agent-document` | ✅ Ativo | Processamento de documentos IA |
| `process-notification-outbox` | ✅ Ativo | Processador de notificações |
| `request-magic-link` | ✅ Ativo | Magic links |
| `search-address` | ✅ Ativo | Busca de endereços |
| `search-cities` | ✅ Ativo | Busca de cidades |
| `send-partner-invite` | ✅ Ativo | Convites para parceiros |

**Conclusão:** ✅ **Nenhuma função órfã identificada.**

---

## 2.3 FRONTEND

### 2.3.1 Página `VicTestPage.tsx` — CANDIDATA À REMOÇÃO ⚠️

| Atributo | Valor |
|----------|-------|
| Rota | `/vic-test` |
| Propósito | Página de teste para agentes Vic |
| Uso em Produção | ❌ Apenas desenvolvimento/debug |

**Análise:**
- Página de desenvolvimento para testar agentes IA
- Não deve estar acessível em produção
- Rota registrada no `App.tsx`

**Opções:**
1. **Remover completamente** (se não for mais necessária)
2. **Proteger com flag de ambiente** (manter apenas em dev)

**Prioridade:** P3  
**Esforço:** 15 min

---

### 2.3.2 Diretório `src/components/mentions/` — MANTER ✅

| Arquivo | Uso |
|---------|-----|
| `MentionInput.tsx` | ✅ Ativo (Tickets, OKRs) |
| `index.ts` | ✅ Re-export |

**Decisão:** MANTER — componentes ativos usados em Tickets e OKRs.

**Nota:** O sistema de mentions migrou de persistência em banco (`mentions` table) para parsing client-side (`@/lib/mentions`). Os componentes frontend continuam ativos.

---

### 2.3.3 Arquivo `Wizards.tsx` — MANTER ✅

**Análise:**
- Página hub central para rituais de OKR
- Navegação para full-page wizards
- Ativo e em uso

**Decisão:** MANTER

---

## 📋 Plano de Ação

### Fase 1 — Limpeza do Banco (P2)

```sql
-- 1. Remover triggers órfãos
DROP TRIGGER IF EXISTS auto_add_mention_as_participant ON mentions;
DROP TRIGGER IF EXISTS auto_add_ticket_mention_as_participant ON ticket_messages;

-- 2. Remover funções órfãs
DROP FUNCTION IF EXISTS auto_add_mention_as_participant();
DROP FUNCTION IF EXISTS auto_add_ticket_mention_as_participant();
DROP FUNCTION IF EXISTS create_mention_notification();

-- 3. Remover tabela vazia
DROP TABLE IF EXISTS mentions;
```

### Fase 2 — Limpeza do Frontend (P3)

| Ação | Arquivo | Decisão |
|------|---------|---------|
| Proteger ou remover | `VicTestPage.tsx` | Discutir com time |
| Remover rota | `App.tsx` (linha ~36, ~496) | Se remover página |

---

## 🔒 Itens a MANTER

| Item | Razão |
|------|-------|
| `user_roles` | Crítico para RBAC |
| Views de diagnóstico | Monitoramento ativo |
| Edge Functions | Todas ativas |
| `src/components/mentions/` | Componentes ativos |
| `Wizards.tsx` | Hub de rituais ativo |

---

## ✅ Próximos Passos

1. **Aprovar plano** — Revisar com stakeholders
2. **Executar Fase 1** — Migration para remover `mentions`
3. **Decidir sobre VicTestPage** — Dev-only ou remover
4. **Documentar no TCR** — Atualizar após execução

---

*Análise concluída em: 2026-01-13*  
*Autor: Sistema*
