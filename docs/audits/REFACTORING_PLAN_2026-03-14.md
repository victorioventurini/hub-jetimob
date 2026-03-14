# 🔧 Plano de Refatoração — 2026-03-14

**Base:** TCR v3.10.0 | DEVELOPMENT_STANDARDS v1.26.0  
**Método:** Análise de pg_stat, grep de padrões, revisão arquitetural  
**Health Score atual:** 10/10

---

## 📊 Sumário

| Área | Itens | Prioridade | Esforço Total |
|------|-------|------------|---------------|
| 3.1 Banco de Dados | 3 itens | P2, P3, P3 | 1h30 |
| 3.2 Backend (Edge Functions) | 2 itens | P2, P3 | 1h |
| 3.3 Frontend | 3 itens | P2, P2, P3 | 1h30 |

---

## 3.1 Banco de Dados — Otimizações

### 3.1.1 🔴 Índices Nunca Utilizados (idx_scan = 0)

**Diagnóstico:** 20 índices com 0 scans detectados. Os maiores:

| Índice | Tamanho | Tabela |
|--------|---------|--------|
| `perf_metrics_snapshots_pkey` | 1224 kB | `perf_metrics_snapshots` |
| `cron_execution_logs_pkey` | 904 kB | `cron_execution_logs` |
| `ai_agent_logs_pkey` | 808 kB | `ai_agent_logs` |
| `okr_audit_log_pkey` | 56 kB | `okr_audit_log` |
| `audit_logs_pkey` | 56 kB | `audit_logs` |
| `idx_okr_audit_log_created_at` | 40 kB | `okr_audit_log` |
| `idx_kpi_values_*` (4 índices) | 64 kB | `kpi_values` |

**Nota:** PKs com 0 scans indicam que os acessos são via `seq_scan` (preocupante para tabelas grandes). Índices secundários com 0 scans são candidatos à remoção, **exceto PKs** (necessárias para integridade).

**Ação:**
- **DROP** índices secundários não-PK com 0 scans após validar que não são usados em queries SQL (funções/views)
- **Investigar** por que `perf_metrics_snapshots` (29k rows) tem 122 seq_scans vs 64k idx_scans — a PK mostra 0 porque acessos são via outras queries

**Prioridade:** P3  
**Esforço:** 30 min (análise) + 15 min (migration)

---

### 3.1.2 🟡 Tabelas com Alto seq_scan/tup_read

| Tabela | seq_scan | seq_tup_read | idx_scan | Rows |
|--------|----------|-------------|----------|------|
| `ai_agent_logs` | 563 | 4.4M | 53k | 13.8k |
| `cron_execution_logs` | 564 | 1.3M | 55k | 19.4k |
| `bu_user_permission_templates_v2` | 17.4k | 849k | 1.5M | 687 |

**Análise:**
- `ai_agent_logs` e `cron_execution_logs`: Tabelas de log com muitos seq_scans lendo milhões de tuplas. Candidatas a **particionamento por data** ou **índice em `created_at`** para queries de dashboard.
- `bu_user_permission_templates_v2`: 17k seq_scans em 687 rows — aceitável (tabela pequena, cabe em cache).

**Ação:**
- Adicionar índice `idx_ai_agent_logs_created_at` se não existir
- Adicionar índice `idx_cron_execution_logs_created_at` se não existir
- Avaliar política de retenção (purge logs > 90 dias)

**Prioridade:** P2  
**Esforço:** 20 min

---

### 3.1.3 🟢 Tabelas com 0 Registros — Monitoramento

30 tabelas com 0 registros foram identificadas. A maioria são features implementadas aguardando uso (automações, coaching, overrides). Já documentadas na Hygiene Analysis. **Nenhuma ação adicional necessária** — monitoramento contínuo via Data Model Registry.

---

## 3.2 Backend (Edge Functions) — Otimizações

### 3.2.1 🔴 Domínio Hardcoded `hub.jetimob.com`

**Diagnóstico:** 7 ocorrências de `hub.jetimob.com` espalhadas em 6 arquivos:

| Arquivo | Ocorrência |
|---------|-----------|
| `auth-email-hook/index.ts` | `no-reply@hub.jetimob.com` |
| `_shared/email-sender.ts` | `no-reply@hub.jetimob.com` |
| `_shared/notification-providers/email.ts` | `no-reply@hub.jetimob.com` |
| `_shared/notification-providers/webhook.ts` | fallback `https://hub.jetimob.com` |
| `_shared/notification-providers/slack.ts` | fallback `https://hub.jetimob.com` |
| `_shared/notification-providers/templates.ts` | fallback `https://hub.jetimob.com` |
| `send-partner-invite/index.ts` | `no-reply@hub.jetimob.com` |

**Problema:** Viola o padrão `domain-centralization-standard`. Se o domínio mudar, 7 arquivos precisam ser editados.

**Ação:**
1. Criar constantes em `_shared/constants.ts`:
   ```ts
   export const SITE_URL = Deno.env.get("SITE_URL") || "https://hub.jetimob.com";
   export const NO_REPLY_EMAIL = Deno.env.get("NO_REPLY_EMAIL") || "no-reply@hub.jetimob.com";
   export const DEFAULT_SENDER_NAME = "Hub";
   ```
2. Substituir todas as 7 ocorrências por imports da constante

**Prioridade:** P2  
**Esforço:** 30 min

---

### 3.2.2 🟢 Padronização JSDoc — Funções Novas

4 Edge Functions novas desde a última auditoria (`clevel-checkin-summary`, `collaborator-checkin-summary`, `mbr-summary`, `health-check`). Verificar se seguem o padrão JSDoc estabelecido na auditoria anterior.

**Prioridade:** P3  
**Esforço:** 30 min

---

## 3.3 Frontend — Otimizações

### 3.3.1 🔴 `select('*')` em `useBuLocations.ts`

**Diagnóstico:** Único módulo no frontend usando `select('*')`:

```typescript
// src/modules/bu/hooks/useBuLocations.ts (linhas 17, 42, 88, 129)
.select("*, parent:parent_location_id(id, name)")
```

**Problema:** Viola regra inquebrávelW #4 (`Proibido select('*')`). Puxa colunas desnecessárias e quebra type-safety.

**Ação:** Substituir por campos explícitos:
```typescript
.select(`
  id, bu_id, name, type, status, address, city, state, zip_code,
  parent_location_id, floor, room_number, notes,
  created_at, updated_at, deleted_at,
  parent:parent_location_id(id, name)
`)
```

**Prioridade:** P2  
**Esforço:** 15 min

---

### 3.3.2 🟡 Migração de Wrappers Deprecated (OKR)

**Diagnóstico:** 2 wrappers deprecated com importadores ativos:

| Wrapper | Canônico | Importadores |
|---------|----------|-------------|
| `KrUnitSelect.tsx` | `UnitSelect` | `TeamKrFormDialog`, `OrgKrFormDialog` |
| `krUnits.ts` (re-export) | `@/shared/constants/units` | `KrProgressPreview`, `KrCheckinsTable`, `KrHistoryDialog`, `KrEvolutionChart` |

**Ação:**
1. Substituir imports de `KrUnitSelect` → `UnitSelect` nos 2 dialogs
2. Substituir imports de `krUnits.ts` → `@/shared/constants/units` nos 4 componentes
3. Deletar `KrUnitSelect.tsx` e `krUnits.ts`
4. Remover testes de `KrUnitSelect`

**Prioridade:** P2  
**Esforço:** 30 min

---

### 3.3.3 🟢 Events Module — Dados Mock

**Diagnóstico:** `EventsContext.tsx` usa `OPPORTUNITIES_MOCK` como dados iniciais em `useState`. O módulo de Events opera inteiramente com dados mock, sem persistência no banco.

**Ação:** Não é refatoração — é evolução de feature. Documentar como "feature com dados mock" no TCR quando o módulo for priorizado para produção.

**Prioridade:** P3  
**Esforço:** N/A (decisão de produto)

---

## 📋 Plano de Execução Consolidado

### Wave 1 — Imediata (P2)

| # | Ação | Área | Esforço | Risco |
|---|------|------|---------|-------|
| 1 | Centralizar domínio em `_shared/constants.ts` | Backend | 30 min | Baixo |
| 2 | Corrigir `select('*')` em `useBuLocations.ts` | Frontend | 15 min | Baixo |
| 3 | Migrar wrappers deprecated (KrUnitSelect + krUnits) | Frontend | 30 min | Baixo |
| 4 | Índices para tabelas de log (ai_agent_logs, cron) | DB | 20 min | Baixo |

### Wave 2 — Próximo ciclo (P3)

| # | Ação | Área | Esforço | Risco |
|---|------|------|---------|-------|
| 5 | Avaliar DROP de índices secundários não utilizados | DB | 45 min | Médio |
| 6 | JSDoc audit em 4 Edge Functions novas | Backend | 30 min | Zero |
| 7 | Documentar módulo Events como mock no TCR | Frontend | 10 min | Zero |

---

*Análise concluída em: 2026-03-14*  
*TCR: v3.10.0 | Health Score: 10/10*
