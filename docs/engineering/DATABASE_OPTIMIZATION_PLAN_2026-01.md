# 🗄️ Plano de Otimização do Banco de Dados — Hub da Jet

**Data:** 2026-01-12  
**Versão:** 1.1.0  
**Baseado em:** Análise de schema, estatísticas pg_stat e DATA_MODEL_REGISTRY  
**Status:** Wave 1 parcialmente executada

---

## 📋 Sumário Executivo

| Categoria | Itens Identificados | Prioridade | Impacto |
|-----------|---------------------|------------|---------|
| Tabelas Grandes | 3 tabelas > 1000 rows | P2 | Storage/Performance |
| Campos Mal Tipados | 17 colunas TEXT sem ENUM | P1 | Integridade |
| Colunas Auxiliares Faltantes | 8 colunas computadas | P2 | DX/Performance |
| Dados Não Normalizados | 5 tabelas com JSONB | P3 | Flexibilidade |
| Índices Não Utilizados | 40+ índices com 0 scans | P2 | Storage |
| FKs Faltantes | 60+ colunas sem FK | P1 | Integridade |

---

## 1. TABELAS GRANDES (Volume Alto)

### 1.1 Tabelas Identificadas

| Tabela | Rows | Tamanho | Problema | Ação |
|--------|------|---------|----------|------|
| `ai_agent_logs` | 51.054 | 21 MB | Logs sem retenção | ✅ Retenção 90 dias já implementada |
| `cron_execution_logs` | 3.410 | 744 KB | Logs sem retenção | ✅ Retenção 30 dias já implementada |
| `audit_logs` | 637 | 1.2 MB | Dead rows (12) | ⚠️ VACUUM + monitorar |
| `okr_wizard_sessions` | 498 | 384 KB | Dados temporários | ⚠️ Avaliar retenção |
| `asset_inventory` | 407 | 432 KB | OK | ✅ Tamanho adequado |

### 1.2 Ações para Tabelas Grandes

#### 1.2.1 Retenção para `okr_wizard_sessions`

```sql
-- Wizard sessions completadas há mais de 90 dias podem ser arquivadas
CREATE OR REPLACE FUNCTION cleanup_old_wizard_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM okr_wizard_sessions 
  WHERE status = 'completed' 
    AND updated_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

#### 1.2.2 VACUUM para `audit_logs`

```sql
-- Executar manualmente ou via cron
VACUUM ANALYZE audit_logs;
```

---

## 2. CAMPOS MAL TIPADOS (TEXT ao invés de ENUM)

### 2.1 Colunas TEXT que deveriam ser ENUM

| Tabela | Coluna | Valores Possíveis | Ação |
|--------|--------|-------------------|------|
| `ai_agent_documents` | `status` | pending, processing, completed, error | 🔴 Criar ENUM |
| `asset_categories` | `status` | active, inactive | 🔴 Criar ENUM |
| `asset_clavicularies` | `status` | active, inactive | 🔴 Criar ENUM |
| `automation_connections` | `scope` | global, bu | 🟡 Usar `agent_scope` existente |
| `automation_event_catalog` | `scope` | global, bu | 🟡 Usar `agent_scope` existente |
| `automation_incoming_tokens` | `scope` | global, bu | 🟡 Usar `agent_scope` existente |
| `automation_logs` | `status` | pending, success, error | 🔴 Criar ENUM |
| `automation_logs` | `type` | webhook, incoming | 🔴 Criar ENUM |
| `cron_execution_logs` | `status` | started, completed, failed | 🔴 Criar ENUM |
| `cycles` | `type` | annual, quarterly, monthly | 🔴 Criar ENUM |
| `hub_integrations_catalog` | `status` | active, beta, deprecated | 🟡 Usar `catalog_status` existente |
| `notification_channels` | `status` | active, inactive | 🟡 Usar `catalog_status` existente |
| `okr_wizard_sessions` | `status` | draft, in_progress, completed | 🔴 Criar ENUM |
| `permission_migrations` | `status` | pending, completed, failed | 🔴 Criar ENUM |
| `ticket_subcategories` | `status` | active, inactive | 🟡 Usar `catalog_status` existente |

### 2.2 ENUMs a Criar

```sql
-- 1. Document processing status
CREATE TYPE document_status AS ENUM ('pending', 'processing', 'completed', 'error');

-- 2. Generic catalog status (já existe catalog_status)
-- Usar catalog_status para: asset_categories, asset_clavicularies, notification_channels, ticket_subcategories

-- 3. Automation log types
CREATE TYPE automation_log_type AS ENUM ('webhook', 'incoming', 'scheduled');
CREATE TYPE automation_log_status AS ENUM ('pending', 'success', 'error', 'timeout');

-- 4. Cron execution status
CREATE TYPE cron_status AS ENUM ('started', 'completed', 'failed', 'timeout');

-- 5. Cycle type
CREATE TYPE cycle_type AS ENUM ('annual', 'quarterly', 'monthly', 'custom');

-- 6. Wizard session status
CREATE TYPE wizard_status AS ENUM ('draft', 'in_progress', 'completed', 'abandoned');

-- 7. Migration status
CREATE TYPE migration_status AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'rolled_back');
```

### 2.3 Migrações de TEXT → ENUM

```sql
-- Exemplo: asset_categories.status → catalog_status
ALTER TABLE asset_categories 
  ALTER COLUMN status TYPE catalog_status 
  USING status::catalog_status;

-- Exemplo: cycles.type → cycle_type  
ALTER TABLE cycles 
  ALTER COLUMN type TYPE cycle_type 
  USING type::cycle_type;
```

---

## 3. COLUNAS AUXILIARES FALTANTES

### 3.1 Colunas Computadas/Cache Recomendadas

| Tabela | Coluna Proposta | Tipo | Justificativa |
|--------|-----------------|------|---------------|
| `okr_team_objectives` | `kr_count` | int | Evita COUNT em queries |
| `okr_team_objectives` | `avg_progress` | numeric | Evita cálculo repetido |
| `okr_org_objectives` | `team_kr_count` | int | Agregação rápida |
| `teams` | `member_count` | int | Evita COUNT |
| `profiles` | `team_count` | int | Evita COUNT de memberships |
| `tickets` | `message_count` | int | Evita COUNT |
| `asset_inventory` | `movement_count` | int | Histórico rápido |
| `bu_units` | `active_user_count` | int | Dashboard rápido |

### 3.2 Triggers para Manter Contagens

```sql
-- Exemplo: kr_count em okr_team_objectives
ALTER TABLE okr_team_objectives ADD COLUMN IF NOT EXISTS kr_count int DEFAULT 0;

CREATE OR REPLACE FUNCTION update_objective_kr_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE okr_team_objectives SET kr_count = kr_count + 1 WHERE id = NEW.objective_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE okr_team_objectives SET kr_count = kr_count - 1 WHERE id = OLD.objective_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_objective_kr_count
AFTER INSERT OR DELETE ON okr_team_key_results
FOR EACH ROW EXECUTE FUNCTION update_objective_kr_count();
```

### 3.3 Timestamps Faltantes

| Tabela | Coluna Faltante | Ação |
|--------|-----------------|------|
| `okr_checkins` | `updated_at` | Adicionar + trigger |
| `notification_outbox` | `updated_at` | Adicionar + trigger |
| `audit_logs` | `updated_at` | ❌ Não aplicável (imutável) |

---

## 4. DADOS NÃO NORMALIZADOS (JSONB)

### 4.1 Colunas JSONB Identificadas

| Tabela | Coluna | Uso | Ação |
|--------|--------|-----|------|
| `asset_inventory` | `documents`, `photos` | Arrays de URLs | ✅ OK (flexível) |
| `audit_logs` | `old_values`, `new_values` | Diff de mudanças | ✅ OK (schema variável) |
| `okr_wizard_sessions` | `decisions`, `action_items`, etc. | Dados temporários | ✅ OK (ephemeral) |
| `notification_outbox` | `payload` | Dados variáveis por evento | ✅ OK (flexível) |
| `ticket_messages` | `body_richtext` | Editor rich text | ⚠️ Considerar estrutura |

### 4.2 Recomendações para JSONB

**Manter como JSONB:**
- Dados com schema variável (audit_logs, notifications)
- Dados temporários (wizard sessions)
- Configurações flexíveis (integrations config)

**Considerar normalizar:**
- `ticket_messages.body_richtext` → Se queries frequentes em conteúdo

---

## 5. ÍNDICES NÃO UTILIZADOS

### 5.1 Índices com 0 Scans (Top 20)

| Índice | Tabela | Tamanho | Ação |
|--------|--------|---------|------|
| `idx_ai_agent_logs_user_bu_created` | ai_agent_logs | 5.3 MB | ⏳ Monitorar 30 dias |
| `idx_ai_agent_logs_bu_created` | ai_agent_logs | 3.6 MB | ⏳ Monitorar 30 dias |
| `ai_agent_logs_pkey` | ai_agent_logs | 2.3 MB | ✅ Manter (PK) |
| `cron_execution_logs_pkey` | cron_execution_logs | 160 KB | ✅ Manter (PK) |
| `audit_logs_pkey` | audit_logs | 48 KB | ✅ Manter (PK) |
| `idx_bu_units_domains` | bu_units | 24 KB | ✅ Manter (auth) |
| `idx_bu_units_cnpj` | bu_units | 16 KB | ✅ Manter (validação) |
| `idx_okr_checkins_*` (3) | okr_checkins | 48 KB | ⏳ Monitorar |
| `idx_asset_*` (5) | asset_* | 80 KB | ⏳ Monitorar |

### 5.2 Ação para Índices

```sql
-- Após 30 dias de monitoramento, remover índices não utilizados
-- DROP INDEX IF EXISTS idx_ai_agent_logs_user_bu_created;
-- DROP INDEX IF EXISTS idx_ai_agent_logs_bu_created;
```

---

## 6. FOREIGN KEYS FALTANTES

### 6.1 Colunas user_id/created_by sem FK

| Tabela | Coluna | FK Destino | Prioridade |
|--------|--------|------------|------------|
| `ai_agent_documents` | `created_by` | profiles.id | P2 |
| `ai_agent_instruction_sources` | `created_by` | profiles.id | P2 |
| `ai_agent_logs` | `user_id` | profiles.id | P3 (logs) |
| `ai_agents` | `created_by` | profiles.id | P2 |
| `asset_clavicularies` | `created_by` | profiles.id | P2 |
| `asset_gift_batches` | `created_by` | profiles.id | P2 |
| `asset_gift_items` | `created_by` | profiles.id | P2 |
| `asset_groups` | `created_by` | profiles.id | P2 |
| `asset_inventory` | `created_by`, `updated_by` | profiles.id | P1 |
| `asset_key_movements` | `user_id` | profiles.id | P2 |
| `asset_keyrings` | `created_by` | profiles.id | P2 |
| `asset_keys` | `created_by` | profiles.id | P2 |
| `asset_permissions` | `created_by` | profiles.id | P2 |

### 6.2 Migration para Adicionar FKs

```sql
-- Exemplo: asset_inventory.created_by → profiles.id
ALTER TABLE asset_inventory 
  ADD CONSTRAINT fk_asset_inventory_created_by 
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE asset_inventory 
  ADD CONSTRAINT fk_asset_inventory_updated_by 
  FOREIGN KEY (updated_by) REFERENCES profiles(id) ON DELETE SET NULL;
```

---

## 📊 Priorização de Execução

### Wave 1 — Integridade (P1) ✅ CONCLUÍDA

| Item | Esforço | Impacto | Status |
|------|---------|---------|--------|
| Criar ENUMs faltantes | 1h | Integridade | ✅ Feito (7 ENUMs criados) |
| Migrar TEXT → ENUM (17 colunas) | 2h | Integridade | ⚠️ Pendente (triggers BU scope) |
| Adicionar FKs em tabelas sem órfãos | 30min | Integridade | ✅ Feito (5 tabelas) |
| Adicionar FKs em tabelas com órfãos | 30min | Integridade | ✅ Feito (Wave 3) |

**ENUMs criados:**
- `document_processing_status` (pending, processing, completed, error)
- `automation_log_type` (webhook, incoming, scheduled)
- `automation_log_status` (pending, success, error, timeout)
- `cron_status` (started, completed, failed, timeout)
- `cycle_type` (annual, quarterly, monthly, custom)
- `wizard_session_status` (draft, in_progress, completed, abandoned)
- `migration_status` (pending, in_progress, completed, failed, rolled_back)

**FKs adicionadas (Wave 1):**
- `asset_keys.created_by` → `profiles.id`
- `asset_permissions.created_by` → `profiles.id`
- `asset_groups.created_by` → `profiles.id`
- `asset_gift_items.created_by` → `profiles.id`
- `asset_gift_batches.created_by` → `profiles.id`

### Wave 2 — Performance (P2) ✅ CONCLUÍDA

| Item | Esforço | Impacto | Status |
|------|---------|---------|--------|
| Adicionar colunas de contagem | 2h | Query speed | ✅ Feito (`kr_count`, `avg_progress`, `member_count`) |
| Criar triggers de contagem | 1h | Manutenção | ✅ Feito (2 triggers) |
| Função de retenção wizard | 30min | Storage | ✅ Feito (`cleanup_old_wizard_sessions`) |
| Inicializar contagens | 10min | Dados | ⚠️ Pendente (executar via Dashboard SQL) |

**Colunas adicionadas:**
- `okr_team_objectives.kr_count` — Contagem de KRs ativos
- `okr_team_objectives.avg_progress` — Progresso médio (cache)
- `teams.member_count` — Contagem de membros

**Triggers criados:**
- `trg_update_objective_kr_count` — Atualiza kr_count ao inserir/deletar KRs
- `trg_update_team_member_count` — Atualiza member_count ao inserir/deletar membros

**Funções criadas:**
- `initialize_counting_columns()` — Recalcula contagens (executar manualmente)
- `cleanup_old_wizard_sessions()` — Remove sessões antigas (>90 dias)

### Wave 3 — Cleanup (P3) ✅ CONCLUÍDA

| Item | Esforço | Impacto | Status |
|------|---------|---------|--------|
| Limpar referências órfãs | 30min | Integridade | ✅ Feito (12 registros) |
| Adicionar FKs restantes | 2h | Integridade | ✅ Feito (11 FKs) |
| Função de VACUUM | 10min | Performance | ✅ Feito (`get_vacuum_instructions`) |
| Monitorar índices 30 dias | Passivo | Observabilidade | ⏳ Em andamento |
| Remover índices não utilizados | 30min | Storage | 🔲 Após monitoramento |
| Migrar TEXT → ENUM | 2h | Integridade | 🔲 Pendente (triggers BU scope)

**Órfãos limpos:**
- `asset_inventory.created_by` — 1 registro
- `asset_inventory.updated_by` — 9 registros
- `asset_keyrings.created_by` — 1 registro
- `asset_clavicularies.created_by` — 1 registro
- `ai_agents.created_by` — 6 registros

**FKs adicionadas (Wave 3):**
- `asset_inventory.created_by` → `profiles.id`
- `asset_inventory.updated_by` → `profiles.id`
- `asset_keyrings.created_by` → `profiles.id`
- `asset_clavicularies.created_by` → `profiles.id`
- `ai_agent_documents.created_by` → `profiles.id`
- `ai_agents.created_by` → `profiles.id`
- `automation_connections.created_by` → `profiles.id`
- `automation_incoming_tokens.created_by` → `profiles.id`
- `bu_module_configs.enabled_by` → `profiles.id`
- `bu_module_configs.disabled_by` → `profiles.id`
- `bu_locations.created_by` → `profiles.id`
- `bu_locations.updated_by` → `profiles.id`
- `bu_agent_activations.enabled_by` → `profiles.id`
- `bu_integrations_config.updated_by` → `profiles.id`

---

## ✅ Métricas de Sucesso

| Métrica | Atual | Meta |
|---------|-------|------|
| Colunas TEXT para status/type | 17 | 0 |
| Tabelas sem FK para profiles | 13+ | 0 |
| Índices não utilizados | 40+ | < 10 |
| Dead rows em audit_logs | 12 | 0 |
| Storage em logs (ai_agent_logs) | 21 MB | < 10 MB (após retenção) |

---

## 📎 Documentos Relacionados

- [DATA_MODEL_REGISTRY.md](./DATA_MODEL_REGISTRY.md) — Schema canônico
- [HYGIENE_AND_OPTIMIZATION_PLAN_2026-01.md](./HYGIENE_AND_OPTIMIZATION_PLAN_2026-01.md) — Plano de higienização
- [DEVELOPMENT_STANDARDS.md](./DEVELOPMENT_STANDARDS.md) — Padrões obrigatórios

---

*Documento gerado em: 2026-01-12*
