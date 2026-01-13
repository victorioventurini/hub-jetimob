# 🧹 Análise de Higienização — 2026-01-13

**Objetivo:** Identificar código e arquivos desnecessários para remoção segura.  
**Revisão:** v2 (corrigida após verificação do TCR e uso real no código)

---

## 📊 Sumário Executivo

| Área | Itens Identificados | Ação | Esforço Total |
|------|---------------------|------|---------------|
| 2.1 Banco de Dados | 0 items | — | — |
| 2.2 Backend (Edge Functions) | 0 items | — | — |
| 2.3 Frontend | 1 item | P3 | 15 min |

**Resultado:** Codebase está extremamente limpo. Apenas 1 item de baixa prioridade identificado.

---

## 2.1 BANCO DE DADOS

### ✅ Tabela `mentions` — MANTER (ATIVA)

| Atributo | Valor |
|----------|-------|
| Registros | **0** (ainda não utilizada em produção, mas ativa) |
| Colunas | 8 |
| RLS | Ativo |

**Uso no Código:**
- `src/modules/tickets/hooks/useTickets.ts` — linhas 180, 397 (select), 539 (insert)
- `src/modules/tickets/hooks/useTicketMessages.ts` — linha 144 (insert)

**Referência:** Memory `global-contextual-mentions-v2` confirma que `mentions` é a tabela canônica global para todos os módulos (Tickets, OKRs, etc.).

**Decisão:** ✅ MANTER — tabela ativa, sistema de mentions funciona, apenas sem dados de produção ainda.

---

### ✅ Tabela `ticket_mentions` — NÃO EXISTE

Conforme verificado, a tabela `ticket_mentions` foi removida em migrações anteriores. A tabela `mentions` é a única fonte de dados para menções.

---

### ✅ Views de Diagnóstico — MANTER (Monitoramento)

| View | Registros | Uso |
|------|-----------|-----|
| `identity_rls_violations` | 0 | ✅ Monitoramento ativo |
| `users_without_v2_permissions` | 44 | ⚠️ Usuários a migrar |
| `v_bu_id_null_report` | 11 | ⚠️ Dados a corrigir |
| `v_permissions_without_explanation` | 34 | ⚠️ Explicações pendentes |
| `v_users_without_templates` | 44 | ⚠️ Templates a atribuir |

**Decisão:** MANTER — são views de monitoramento ativo para compliance.

---

### ✅ Funções `auto_add_mention_*` — MANTER

| Função | Status |
|--------|--------|
| `auto_add_mention_as_participant` | ✅ Ativa (trigger on mentions) |
| `create_mention_notification` | ✅ Ativa (notificações de menções) |

**Decisão:** MANTER — suportam o sistema de mentions quando dados forem inseridos.

---

### ✅ Tabela `user_roles` — MANTER

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

### 2.3.1 Página `VicTestPage.tsx` — CANDIDATA À PROTEÇÃO ⚠️

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
1. **Proteger com flag de ambiente** (manter apenas em dev)
2. **Remover completamente** (se não for mais necessária)

**Prioridade:** P3  
**Esforço:** 15 min

---

### ✅ Diretório `src/components/mentions/` — MANTER

| Arquivo | Uso |
|---------|-----|
| `MentionInput.tsx` | ✅ Ativo (Tickets, OKRs) |
| `index.ts` | ✅ Re-export |

**Decisão:** MANTER — componentes ativos usados em Tickets e OKRs.

---

### ✅ Arquivo `Wizards.tsx` — MANTER

**Análise:**
- Página hub central para rituais de OKR
- Navegação para full-page wizards
- Ativo e em uso

**Decisão:** MANTER

---

## 📋 Conclusão Final

### Banco de Dados
✅ **Nenhum item para remoção** — todas as tabelas, views e funções estão ativas.

### Backend
✅ **Nenhum item para remoção** — todas as Edge Functions estão ativas.

### Frontend
⚠️ **1 item de baixa prioridade:**
- `VicTestPage.tsx` — proteger com flag de ambiente ou remover

---

## 🔒 Itens a MANTER

| Item | Razão |
|------|-------|
| `mentions` | Tabela canônica para menções (usada em useTickets, useTicketMessages) |
| `user_roles` | Crítico para RBAC |
| Views de diagnóstico | Monitoramento ativo |
| Edge Functions | Todas ativas |
| `src/components/mentions/` | Componentes ativos |
| `Wizards.tsx` | Hub de rituais ativo |

---

*Análise concluída em: 2026-01-13*  
*Revisão v2: Corrigida após consulta ao TCR v2.27.0 e verificação do uso real no código*
