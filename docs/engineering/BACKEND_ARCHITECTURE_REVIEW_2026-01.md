# 🔍 Revisão de Arquitetura Backend — Hub da Jet

**Data:** 2026-01-12  
**Versão:** 1.0.0  
**Escopo:** Edge Functions, Database Functions, RLS, Triggers  
**Objetivo:** Identificar fragilidades, complexidade desnecessária e propor melhorias

---

## 📋 Sumário Executivo

| Categoria | Status | Itens Críticos | Ação |
|-----------|--------|----------------|------|
| **Edge Functions** | 🟡 Bom | 2 problemas de design | Refatorar |
| **Database Functions** | 🟠 Atenção | 5+ funções redundantes | Consolidar |
| **RLS Policies** | 🟢 Sólido | Bem estruturado | Manter |
| **Triggers** | 🟡 Bom | Nomenclatura inconsistente | Padronizar |
| **Middleware** | 🟢 Excelente | Centralizado | Manter |

---

## 1. EDGE FUNCTIONS — Análise

### 1.1 Inventário (16 funções)

| Função | Categoria | Criticidade | Status |
|--------|-----------|-------------|--------|
| `auth-email-hook` | Auth | 🔴 Crítica | ✅ Robusto |
| `request-magic-link` | Auth | 🔴 Crítica | ✅ Robusto |
| `cron-dispatcher` | Infra | 🔴 Crítica | ✅ Robusto |
| `process-notification-outbox` | Notificações | 🔴 Crítica | ✅ Robusto |
| `invoke-vic` | IA | 🟠 Alta | ⚠️ Complexo |
| `culture-message` | IA | 🟢 Baixa | ⚠️ Redundante (frontend tem fallback) |
| `evaluate-notification-health` | Observabilidade | 🟡 Média | ✅ OK |
| `get-public-asset` | Assets | 🟡 Média | ✅ OK |
| `get-place-details` | Maps | 🟢 Baixa | ✅ OK |
| `search-address` | Maps | 🟢 Baixa | ✅ OK |
| `search-cities` | Maps | 🟢 Baixa | ✅ OK |
| `get-tcr` | Dev | 🟢 Baixa | ⚠️ Dev-only |
| `audit-permissions` | Dev | 🟢 Baixa | ⚠️ Dev-only |
| `send-partner-invite` | Onboarding | 🟡 Média | ✅ OK |
| `process-agent-document` | IA | 🟡 Média | ✅ OK |

### 1.2 Problemas Identificados

#### 🔴 P1: `invoke-vic` — Complexidade Excessiva

**Problema:** Função monolítica com 400+ linhas que orquestra:
- Validação de auth + BU
- Rate limiting
- Seleção de agente
- Chamada ao LLM
- Logging

**Risco:** Difícil de testar, manter e debugar.

**Solução Proposta:**
```
invoke-vic/
├── index.ts          # Apenas orquestração
├── validate.ts       # Auth + rate limits
├── agent-loader.ts   # Busca agente e instruções
├── llm-client.ts     # Chamada ao provider
└── logger.ts         # Log estruturado
```

#### 🟠 P2: `culture-message` — Redundância

**Problema:** Frontend já tem pool local de mensagens (`src/data/cultureMessages.ts`).

**Solução:** Deprecar edge function. Frontend usa pool local como primary.

#### 🟡 P3: Funções Dev-only em Produção

**Problema:** `get-tcr` e `audit-permissions` expõem estrutura interna.

**Solução:** Restringir a `super_admin` ou remover de produção.

### 1.3 Arquitetura Shared — Análise

```
supabase/functions/_shared/
├── middleware.ts      ✅ Excelente — Centraliza auth/BU/cors
├── email-sender.ts    ✅ OK
├── hub-tools.ts       ✅ OK — Tool definitions para IA
├── instruction-sources.ts  ⚠️ Específico demais para ser shared
```

**✅ Pontos Positivos:**
- `middleware.ts` implementa padrão robusto de validação
- `createBuScopedAuthenticatedClient()` propaga `x-current-bu-id` corretamente
- Rate limiting centralizado

**⚠️ Melhorias:**
- Adicionar `_shared/logging.ts` para structured logging
- Mover `instruction-sources.ts` para `invoke-vic/`

---

## 2. DATABASE FUNCTIONS — Análise

### 2.1 Inventário por Categoria

| Categoria | Qtd | Exemplos | Status |
|-----------|-----|----------|--------|
| **Identidade** | 8 | `my_profile_id()`, `current_bu_id()`, `is_platform_admin()` | ✅ Sólido |
| **RLS Helpers** | 12 | `is_current_bu()`, `user_has_bu_access()`, `has_permission()` | ✅ Sólido |
| **Hierarchy** | 6 | `team_is_ancestor()`, `get_manageable_teams()` | ✅ Sólido |
| **RPCs Dashboard** | 4 | `rpc_home_dashboard_data`, `rpc_tickets_summary` | ✅ Bom |
| **Triggers** | 45+ | `update_updated_at_column`, `enforce_bu_scope` | 🟡 Revisar |
| **Legacy/Redundantes** | 5+ | `_identity_dual_mode_deadline`, contadores duplicados | 🔴 Remover |

### 2.2 Problemas Identificados

#### 🔴 P1: Funções Legacy Não Removidas

| Função | Problema | Ação |
|--------|----------|------|
| `_identity_dual_mode_deadline` | Deadline expirado | ❌ DROP |
| `_use_profile_id_for_identity` | Obsoleto (sempre true) | ❌ DROP |
| `count_bu_calls_today` | Não usado em prod | ⚠️ Auditar |
| `count_user_calls_today` | Não usado em prod | ⚠️ Auditar |

#### 🟠 P2: Triggers com Nomenclatura Inconsistente

**Padrão observado:**
- `trg_enforce_bu_scope_<table>` ✅
- `update_<table>_updated_at` ⚠️
- `trg_<table>_updated_at` ⚠️

**Solução:** Padronizar para `trg_<action>_<table>`.

#### 🟡 P3: Funções SECURITY DEFINER sem Auditoria

**Problema:** 40+ funções são SECURITY DEFINER, bypassando RLS.

**Risco:** Se mal escritas, podem expor dados.

**Solução:** 
1. Auditar cada função SECURITY DEFINER
2. Documentar justificativa
3. Garantir `SET search_path = public`

### 2.3 Funções Core — Análise Detalhada

#### `current_bu_id()` — ✅ Robusto

```sql
-- Lê x-current-bu-id do request.header
-- Fallback para session.claims se necessário
-- NUNCA retorna NULL em contexto válido
```

**Validação:** OK. Segue TCR.

#### `is_current_bu(bu_id)` — ✅ Robusto

```sql
-- Helper para RLS: bu_id = current_bu_id()
-- Usado em todas as policies BU-scoped
```

**Validação:** OK.

#### `my_profile_id()` — ✅ Robusto

```sql
-- Converte auth.uid() para profiles.id
-- Critical para identity convention
```

**Validação:** OK. Segue identity convention.

---

## 3. RLS POLICIES — Análise

### 3.1 Estatísticas

| Métrica | Valor |
|---------|-------|
| Tabelas com RLS | 50+ |
| Total de policies | 120+ |
| Média policies/tabela | 2.4 |
| Tabelas sem RLS | 3 (catálogos globais) |

### 3.2 Padrões Identificados

#### Padrão 1: `_select` + `_admin` (Mais Comum)

```sql
CREATE POLICY "table_select" ON table FOR SELECT
USING (is_current_bu(bu_id));

CREATE POLICY "table_admin" ON table FOR ALL
USING (is_current_bu(bu_id) AND (
  is_platform_admin(auth.uid()) OR 
  is_bu_admin(auth.uid(), bu_id) OR
  has_permission(bu_id, 'module.entity.manage')
));
```

**Avaliação:** ✅ Sólido e consistente.

#### Padrão 2: CRUD Granular (Tickets, OKRs)

```sql
CREATE POLICY "tickets_select" ...
CREATE POLICY "tickets_insert" ...
CREATE POLICY "tickets_update" ...
-- (sem DELETE ou com soft delete)
```

**Avaliação:** ✅ Apropriado para entidades com fluxo de aprovação.

### 3.3 Problemas Identificados

#### 🟠 P1: Policies `USING (true)` para INSERT/UPDATE

**Tabelas afetadas:**
- `notification_outbox` — INSERT com `true`
- Algumas tabelas de log

**Risco:** Médio. São tabelas de sistema, não de domínio.

**Solução:** Adicionar `WITH CHECK (auth.role() = 'service_role')` onde aplicável.

#### 🟡 P2: Views SECURITY DEFINER

**Views afetadas:**
- `v_profiles_directory`
- `v_bu_all_profiles_admin`

**Justificativa:** Necessárias para queries cross-BU de admins.

**Ação:** Documentar como exceção autorizada.

---

## 4. TRIGGERS — Análise

### 4.1 Inventário por Tipo

| Tipo | Qtd | Função | Status |
|------|-----|--------|--------|
| `updated_at` | 30+ | `update_updated_at_column` | ✅ OK |
| `enforce_bu_scope` | 20+ | `enforce_bu_scope` | ✅ OK |
| Contagem | 2 | `trg_update_objective_kr_count`, `trg_update_team_member_count` | ✅ Novo (Wave 2) |
| Domínio específico | 10+ | `update_inventory_on_movement`, `update_gift_stock_on_movement` | ✅ OK |

### 4.2 Problemas Identificados

#### 🟡 P1: Nomenclatura Inconsistente

**Atual:**
- `update_ai_agents_updated_at`
- `trg_asset_keys_updated_at`
- `trg_enforce_bu_scope_asset_categories`

**Proposto:**
- `trg_<table>_updated_at`
- `trg_<table>_enforce_bu_scope`

**Impacto:** Baixo. Cosmético.

#### 🟢 Nenhum problema crítico encontrado

---

## 5. RISCOS E RECOMENDAÇÕES

### 5.1 Riscos Ordenados por Severidade

| # | Risco | Severidade | Mitigação |
|---|-------|------------|-----------|
| 1 | `invoke-vic` monolítico dificulta manutenção | 🟠 Média | Refatorar em módulos |
| 2 | Funções legacy não removidas | 🟠 Média | Executar cleanup |
| 3 | Views SECURITY DEFINER | 🟡 Baixa | Documentar |
| 4 | Nomenclatura triggers inconsistente | 🟢 Cosmética | Padronizar gradualmente |

### 5.2 Plano de Ação

#### Fase 1: Cleanup (1 dia)

```sql
-- Remover funções obsoletas
DROP FUNCTION IF EXISTS _identity_dual_mode_deadline();
DROP FUNCTION IF EXISTS _use_profile_id_for_identity();
```

#### Fase 2: Refatorar invoke-vic (2-3 dias)

```
1. Extrair validação para validate.ts
2. Extrair agent loading para agent-loader.ts
3. Extrair LLM client para llm-client.ts
4. Manter index.ts como orquestrador fino
```

#### Fase 3: Documentação (1 dia)

```
1. Documentar todas as funções SECURITY DEFINER
2. Documentar views SECURITY DEFINER
3. Atualizar TCR com decisões
```

---

## 6. ARQUITETURA ALVO

### 6.1 Edge Functions — Estrutura Ideal

```
supabase/functions/
├── _shared/
│   ├── middleware.ts      # Auth, CORS, BU validation
│   ├── logging.ts         # Structured logging (NOVO)
│   ├── email-sender.ts    # SendGrid wrapper
│   └── response.ts        # Response helpers (NOVO)
├── auth-email-hook/       # ✅ Manter
├── request-magic-link/    # ✅ Manter
├── cron-dispatcher/       # ✅ Manter
├── process-notification-outbox/  # ✅ Manter
├── invoke-vic/
│   ├── index.ts           # Orquestrador
│   ├── validate.ts        # Auth + rate limits
│   ├── agent-loader.ts    # Busca agente
│   ├── llm-client.ts      # Provider call
│   └── hub-tools.ts       # Tool definitions
└── ... (demais funções)
```

### 6.2 Database Functions — Organização Lógica

```
-- Identidade (core)
my_profile_id()
current_bu_id()
is_current_bu(bu_id)

-- Autorização (core)
is_platform_admin(user_id)
is_bu_admin(user_id, bu_id)
user_has_bu_access(user_id, bu_id)
has_permission(bu_id, permission_key)

-- Hierarquia de Times
team_is_ancestor(ancestor_id, team_id)
user_can_manage_team(user_id, team_id)
get_manageable_teams(user_id, bu_id)

-- RPCs de Dashboard
rpc_home_dashboard_data(p_bu_id, p_user_id)
rpc_tickets_summary(p_bu_id)
rpc_okr_team_summary(p_bu_id, p_team_id)

-- Manutenção
initialize_counting_columns()
cleanup_old_wizard_sessions()
get_vacuum_instructions()
```

---

## 7. MÉTRICAS DE SUCESSO

| Métrica | Atual | Meta |
|---------|-------|------|
| Linhas em `invoke-vic/index.ts` | 400+ | < 150 |
| Funções legacy | 5+ | 0 |
| Documentação SECURITY DEFINER | 0% | 100% |
| Triggers com nomenclatura padrão | 60% | 90% |

---

## 📎 Documentos Relacionados

- [TECHNICAL_CONTEXT_REGISTRY.md](../TECHNICAL_CONTEXT_REGISTRY.md)
- [DEVELOPMENT_STANDARDS.md](./DEVELOPMENT_STANDARDS.md)
- [HYGIENE_AND_OPTIMIZATION_PLAN_2026-01.md](./HYGIENE_AND_OPTIMIZATION_PLAN_2026-01.md)
- [DATABASE_OPTIMIZATION_PLAN_2026-01.md](./DATABASE_OPTIMIZATION_PLAN_2026-01.md)

---

*Documento gerado em: 2026-01-12*
