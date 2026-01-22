# 📊 Análise de Débitos Técnicos e Plano de Ação v2

**Data:** 2026-01-12  
**Versão TCR:** 2.24.0  
**Status:** 🔴 AÇÃO URGENTE NECESSÁRIA

---

## 🚨 Resumo Executivo — Problemas Críticos Identificados

### Erros Ativos no Banco de Dados

Os logs do Postgres mostram erros recorrentes:

| Erro | Frequência | Severidade | Causa Raiz |
|------|------------|------------|------------|
| `relation "public.bu_user_permission_groups" does not exist` | 10+ por minuto | 🔴 CRÍTICO | Funções legadas ainda referenciam tabela V1 deletada |
| `column "executed_at" does not exist` | A cada 60s | 🟡 MÉDIO | Função `cleanup_old_cron_logs` usa coluna errada |

---

## 1. DÉBITOS CRÍTICOS (P0 — Correção Imediata)

### 1.1 Funções SQL Referenciam Tabela Legada Deletada

**Problema:** 3 funções ainda referenciam `bu_user_permission_groups` que foi deletada:

| Função | Problema | Impacto |
|--------|----------|---------|
| `has_permission(uuid, uuid, text)` | Usa V1 groups | ⚠️ Retorna `false` incorretamente |
| `user_has_permission(uuid, uuid, text)` | Usa V1 groups | ⚠️ Retorna `false` incorretamente |
| `user_has_permission_ctx(uuid, uuid, text, jsonb)` | Usa V1 groups | ⚠️ Retorna `false` incorretamente |

**Solução:** Recriar as funções usando APENAS V2 (templates + overrides).

### 1.2 Função de Cleanup Usa Coluna Inexistente

**Problema:** `cleanup_old_cron_logs()` usa `executed_at`, mas a coluna é `ran_at`.

```sql
-- Colunas reais de cron_execution_logs:
-- id, ran_at, duration_ms, outbox_processed, outbox_sent, outbox_failed, 
-- health_alerts_created, health_alerts_resolved, error_message, correlation_id, created_at, status
```

**Solução:** Corrigir a função para usar `ran_at`.

---

## 2. HIGIENIZAÇÃO — Código e Arquivos Desnecessários

### 2.1 Banco de Dados

#### 2.1.1 Tabelas Vazias (38 identificadas)

| Categoria | Tabelas | Ação |
|-----------|---------|------|
| **Schema Pronto (Manter)** | `kpi_metrics`, `kpi_values`, `okr_dependencies`, `okr_kr_metrics`, `okr_insights` | ✅ Aguardam dados de produção |
| **Automação (Não Lançado)** | `automation_*` (4 tabelas) | ⚠️ Manter - módulo planejado |
| **Assets Sub-módulos** | `asset_gift_*`, `asset_groups`, `asset_keys` | ✅ Manter - módulos ativos |
| **Notificações Infra** | `notification_*` (6 tabelas) | ✅ Manter - observabilidade |
| **Legacy/Remover** | `mentions`, `permission_preset_items` | ❌ **DROP** — substituídas |

#### 2.1.2 Tabelas de Log (Crescimento)

| Tabela | Linhas | Tamanho | Ação |
|--------|--------|---------|------|
| `ai_agent_logs` | 51.064 | 10 MB | ⚠️ Cleanup automático OK, monitorar |
| `cron_execution_logs` | 4.135 | 816 KB | 🔴 Cleanup FALHA (bug na função) |
| `okr_wizard_sessions` | 498 | 304 KB | ⚠️ Implementar cleanup 7 dias |

#### 2.1.3 Índices Não Utilizados (20+ com 0 scans)

| Índice | Tamanho | Ação |
|--------|---------|------|
| `idx_ai_agent_logs_user_bu_created` | 5.3 MB | ⚠️ Monitorar 30 dias |
| `ai_agent_logs_pkey` | 2.3 MB | ✅ Manter (PK) |
| `cron_execution_logs_pkey` | 256 KB | ✅ Manter (PK) |
| `idx_bu_units_domains` | 24 KB | ✅ Manter (auth) |

**Nota:** Índices em tabelas de log podem ter 0 scans porque os dados são só inseridos/lidos em batch pelo cron.

---

### 2.2 Backend (Edge Functions)

#### 2.2.1 Status das Funções

| Função | Status | Notas |
|--------|--------|-------|
| `auth-email-hook` | ✅ Crítica | Validação de domínio |
| `request-magic-link` | ✅ Crítica | Auth flow |
| `invoke-vic` | ✅ Ativa | IA principal |
| `culture-message` | ⚠️ Fallback | Frontend usa pool local |
| `process-notification-outbox` | ✅ Crítica | Outbox pattern |
| `cron-dispatcher` | ✅ Crítica | Orquestração |
| `get-public-asset` | ✅ Ativa | QR codes |
| `audit-permissions` | ⚠️ Dev-only | Considerar flag ambiente |

#### 2.2.2 Arquivos _shared

```
supabase/functions/_shared/
├── cors.ts          ✅ Usado
├── supabaseClient.ts ✅ Usado
├── response.ts      ✅ Criado (v2.22.0)
└── auth.ts          ⚠️ Auditar imports
```

---

### 2.3 Frontend

#### 2.3.1 Arquivos Candidatos a Verificação

| Arquivo | Status | Notas |
|---------|--------|-------|
| `src/pages/VicTestPage.tsx` | ⚠️ Dev-only | Mover para /dev ou remover |
| `src/data/cultureMessages.ts` | ✅ Manter | Fallback local (evita IA) |

#### 2.3.2 Hooks/Componentes Legados Já Removidos ✅

- `TicketMentionInput.tsx` — Removido v2.22.0
- `LegacyAssetRedirect.tsx` — Removido v2.22.0
- `useDebouncedValue.ts` — Consolidado v2.22.0
- `useDebouncedCallback.ts` — Consolidado v2.22.0

---

## 3. REFATORAÇÃO — Otimização Estrutural

### 3.1 Banco de Dados

#### 3.1.1 Funções de Permissão (CRÍTICO)

As funções `has_permission`, `user_has_permission`, `user_has_permission_ctx` precisam ser reescritas para usar APENAS V2:

```sql
-- Nova implementação has_permission (V2-only)
CREATE OR REPLACE FUNCTION has_permission(
  p_profile_id uuid,  -- Agora recebe profile_id, não user_id
  p_bu_id uuid,
  p_permission_key text
) RETURNS boolean AS $$
BEGIN
  -- Platform admin bypass
  IF EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN profiles p ON p.user_id = ur.user_id
    WHERE p.id = p_profile_id AND ur.role IN ('super_admin', 'admin')
  ) THEN
    RETURN true;
  END IF;
  
  -- BU admin bypass
  IF EXISTS (
    SELECT 1 FROM bu_user_memberships m
    JOIN profiles p ON p.user_id = m.user_id
    WHERE p.id = p_profile_id
      AND m.bu_id = p_bu_id
      AND m.role_in_bu = 'admin'
  ) THEN
    RETURN true;
  END IF;
  
  -- Check V2 templates ONLY (no V1 groups)
  RETURN EXISTS (
    SELECT 1 FROM bu_user_permission_templates_v2 ut
    JOIN permission_template_items_v2 ti ON ti.template_id = ut.template_id
    WHERE ut.user_id = p_profile_id
      AND ut.bu_id = p_bu_id
      AND ti.permission_key = p_permission_key
  ) OR EXISTS (
    SELECT 1 FROM bu_user_permission_overrides o
    JOIN permission_catalog pc ON pc.id = o.permission_id
    WHERE o.user_id = p_profile_id
      AND o.bu_id = p_bu_id
      AND pc.key = p_permission_key
      AND o.effect = 'allow'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;
```

#### 3.1.2 Correção cleanup_old_cron_logs

```sql
CREATE OR REPLACE FUNCTION cleanup_old_cron_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM cron_execution_logs 
  WHERE ran_at < NOW() - INTERVAL '30 days';  -- ran_at, não executed_at
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

---

### 3.2 Backend

✅ **Já otimizado em v2.22.0:**
- `_shared/response.ts` — Helpers padronizados
- Logging estruturado em edge functions

---

### 3.3 Frontend

✅ **Já otimizado:**
- Módulo OKRs bem estruturado (hooks/queries/, utils/, wizards/)
- queryKeys centralizados
- Componentes UI centralizados (PageHeader, EmptyState, LoadingState)

---

## 4. CENTRALIZAÇÃO

### 4.1 Banco de Dados

✅ **Já centralizado:**
- `permission_catalog` — 160 keys
- `permission_templates_v2` — 27 templates
- `notification_events` — 19 eventos

### 4.2 Backend

✅ **Já centralizado:**
- `_shared/` com helpers comuns

### 4.3 Frontend

✅ **Já centralizado:**
- `src/lib/queryKeys/` — Query keys modularizadas
- `src/shared/types/` — Tipos compartilhados
- `src/components/ui/` — Componentes base

---

## 5. PERFORMANCE

### 5.1 Banco de Dados

#### 5.1.1 Índices Recomendados (Pendentes)

```sql
-- OKR Team Objectives (queries frequentes)
CREATE INDEX IF NOT EXISTS idx_okr_team_objectives_bu_team_status 
ON okr_team_objectives(bu_id, team_id, status);

-- Notifications (inbox do usuário)
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created 
ON notifications(recipient_id, read_at NULLS FIRST, created_at DESC);
```

### 5.2 Frontend

✅ **Já otimizado:**
- `queryCacheConfig.ts` com staleTime por domínio
- Code splitting para rotas
- Lazy loading de componentes pesados

---

## 📋 PLANO DE EXECUÇÃO

### Wave P0 — CRÍTICO (Executar AGORA)

| # | Item | Esforço | Impacto |
|---|------|---------|---------|
| 1 | Corrigir `cleanup_old_cron_logs` (ran_at) | 5 min | Erros no log |
| 2 | Recriar `has_permission` V2-only | 30 min | Segurança/Permissões |
| 3 | Recriar `user_has_permission` V2-only | 15 min | Segurança/Permissões |
| 4 | Recriar `user_has_permission_ctx` V2-only | 15 min | Segurança/Permissões |

### Wave P1 — Importante (Esta semana)

| # | Item | Esforço | Impacto |
|---|------|---------|---------|
| 5 | DROP tabelas legadas (`mentions`, `permission_preset_items`) | 5 min | Cleanup |
| 6 | Cleanup `okr_wizard_sessions` > 7 dias | 5 min | Storage |
| 7 | Criar índices de performance pendentes | 10 min | Query speed |

### Wave P2 — Desejável (Backlog)

| # | Item | Esforço | Impacto |
|---|------|---------|---------|
| 8 | Migrar colunas text → enum (status) | 2h | Type safety |
| 9 | Implementar UI para `okr_dependencies` | 4h | Feature |
| 10 | Avaliar remoção de índices não usados (após 30d) | 30 min | Storage |

---

## ✅ Métricas de Sucesso

| Métrica | Antes | Meta | Status |
|---------|-------|------|--------|
| Erros de tabela inexistente | 10+/min | 0 | 🔴 Pendente |
| Erros de coluna inexistente | 1/min | 0 | 🔴 Pendente |
| Funções V1-legacy | 3 | 0 | 🔴 Pendente |
| Tabelas legacy | 2 | 0 | 🟡 Pendente |
| RLS 100% V2 | 79/79 | 79/79 | ✅ Completo |

---

*Análise gerada em 2026-01-12. Prioridade: P0 deve ser executado imediatamente.*
