# 📋 Plano de Migração text → ENUM

**Data:** 2026-01-13  
**Prioridade:** P3  
**Status:** 📅 BACKLOG

---

## 📊 Sumário

Este documento detalha o plano para migrar colunas `text` para `enum` types no PostgreSQL, visando melhor integridade de dados e performance.

---

## 🎯 Colunas Candidatas

### 1. `ai_agent_logs.status`

| Atributo | Valor |
|----------|-------|
| Tipo Atual | `text` |
| Valores Utilizados | `success`, `error` |
| Volume de Dados | ~10k+ registros |
| Views Dependentes | Nenhuma |

**Enum Proposto:**
```sql
CREATE TYPE agent_log_status AS ENUM ('success', 'error', 'pending');
```

### 2. `automation_logs.status`

| Atributo | Valor |
|----------|-------|
| Tipo Atual | `text` |
| Valores Esperados | `success`, `error`, `pending`, `retrying` |
| Volume de Dados | ~5k+ registros |
| Views Dependentes | Nenhuma |

**Enum Proposto:**
```sql
CREATE TYPE automation_log_status AS ENUM ('success', 'error', 'pending', 'retrying');
```

### 3. `okr_org_objectives.health_status` e `okr_team_objectives.health_status`

| Atributo | Valor |
|----------|-------|
| Tipo Atual | `text` |
| Valores Esperados | `on_track`, `at_risk`, `behind`, `not_started` |
| Views Dependentes | `v_okr_org_objectives_summary`, `v_okr_team_objectives_summary` (potenciais) |
| Dados Atuais | Nenhum dado com `health_status` preenchido |

**Enum Proposto:**
```sql
CREATE TYPE okr_health_status AS ENUM ('not_started', 'on_track', 'at_risk', 'behind');
```

---

## 🔄 Scripts de Migração

### Fase 1: Criar ENUMs

```sql
-- Criar tipos ENUM
CREATE TYPE agent_log_status AS ENUM ('success', 'error', 'pending');
CREATE TYPE automation_log_status AS ENUM ('success', 'error', 'pending', 'retrying');
CREATE TYPE okr_health_status AS ENUM ('not_started', 'on_track', 'at_risk', 'behind');
```

### Fase 2: Migrar Colunas

```sql
-- ai_agent_logs
ALTER TABLE ai_agent_logs 
  ALTER COLUMN status TYPE agent_log_status 
  USING status::agent_log_status;

-- automation_logs
ALTER TABLE automation_logs 
  ALTER COLUMN status TYPE automation_log_status 
  USING status::automation_log_status;

-- okr_org_objectives
ALTER TABLE okr_org_objectives 
  ALTER COLUMN health_status TYPE okr_health_status 
  USING health_status::okr_health_status;

-- okr_team_objectives
ALTER TABLE okr_team_objectives 
  ALTER COLUMN health_status TYPE okr_health_status 
  USING health_status::okr_health_status;
```

---

## ⚠️ Riscos e Mitigações

| Risco | Probabilidade | Mitigação |
|-------|---------------|-----------|
| Valor inesperado bloqueia migração | Baixa | Audit prévia com `DISTINCT` |
| Views dependentes quebram | Média | DROP/recreate views |
| Edge functions com valores hardcoded | Baixa | Audit código antes |
| Downtime durante ALTER | Baixa | Migração em horário off-peak |

---

## 📅 Cronograma Sugerido

| Fase | Esforço | Quando |
|------|---------|--------|
| 1. Audit de valores | 30 min | Feito (2026-01-13) |
| 2. Criar ENUMs | 10 min | Quando necessário |
| 3. Migrar logs tables | 15 min | Sprint futuro |
| 4. Migrar OKR tables | 30 min | Após estabilizar views |

---

## ✅ Decisão

**Status:** ⏳ ADIADO

**Razão:** 
- Baixo impacto operacional (tabelas de log)
- `health_status` sem dados ainda (migração trivial quando necessário)
- Foco atual em features

**Próxima Revisão:** 2026-02-01

---

*Criado em: 2026-01-13*  
*Atualizado por: Sistema*
