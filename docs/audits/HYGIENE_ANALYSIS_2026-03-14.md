# 🧹 Análise de Higienização — 2026-03-14

**Objetivo:** Identificar código e arquivos desnecessários para remoção segura.  
**Base:** TCR v3.9.0 | DATA_MODEL_REGISTRY v1.2.2 | LEGACY_CLASSIFICATION_MATRIX v2.0  
**Método:** Cruzamento de uso no código (grep), contagem de registros no banco e classificação Legacy Matrix.

---

## 📊 Sumário Executivo

| Área | Itens Identificados | Prioridade | Esforço Total |
|------|---------------------|------------|---------------|
| 2.1 Banco de Dados | 2 itens | P2, P3 | 30 min |
| 2.2 Backend (Edge Functions) | 0 itens | — | — |
| 2.3 Frontend | 3 itens | P2, P3, P3 | 45 min |

**Total: 5 itens para higienização.**

---

## 2.1 BANCO DE DADOS

### 🗑️ 2.1.1 Tabela `okr_coaching_events` — CANDIDATA À REMOÇÃO

| Atributo | Valor |
|----------|-------|
| Registros | **0** |
| RLS | ✅ Ativo |
| BU-Scoped | ✅ |

**Uso no Código:** ❌ NENHUM (apenas em `types.ts` auto-gerado)  
**Legacy Matrix:** SUSPECT (Wave 3 — avaliar remoção)

**Decisão:** 🗑️ REMOVER — 0 registros, 0 referências no código do app. Tabela nunca foi utilizada.

**Prioridade:** P3  
**Esforço:** 10 min (migration DROP + atualizar Data Model Registry)

---

### ⚠️ 2.1.2 Tabela `okr_dependencies` — MANTER (ATIVA)

| Atributo | Valor |
|----------|-------|
| Registros | **0** |
| RLS | ✅ Ativo |
| BU-Scoped | ✅ |

**Uso no Código:**
- `useCreateTeamOkrBundle.ts` — insert
- `useCreateTeamKrBundle.ts` — insert
- `useManagersPanorama.ts` — select com joins

**Legacy Matrix:** SUSPECT (Wave 3)  
**Decisão:** ✅ MANTER — código ativo, apenas sem dados de produção ainda.

---

### ℹ️ Tabelas com 0 registros (MANTER)

As seguintes tabelas têm 0 registros mas possuem código ativo que as utiliza:

| Tabela | Código Ativo |
|--------|-------------|
| `automation_connections` | `useAutomationData.ts` (feature de automações) |
| `automation_logs` | `useAutomationData.ts` |
| `automation_incoming_tokens` | `useAutomationData.ts` |
| `automation_connection_events` | `useAutomationData.ts` |
| `ticket_routing_rules` | `useRoutingRules.ts` (roteamento externo) |
| `asset_phone_lines` | `usePhoneLines.ts` (linhas telefônicas) |
| `perf_metrics_snapshots` | `usePerfMetrics.ts` (métricas de performance) |
| `okr_dependencies` | 3 hooks ativos |

**Decisão:** MANTER — são features implementadas aguardando uso em produção.

---

## 2.2 BACKEND (Edge Functions)

### ✅ Nenhuma função órfã identificada

| Função | Status |
|--------|--------|
| `audit-permissions` | ✅ Ativo |
| `auth-email-hook` | ✅ Ativo |
| `clevel-checkin-summary` | ✅ Ativo |
| `collaborator-checkin-summary` | ✅ Ativo |
| `cron-dispatcher` | ✅ Ativo |
| `culture-message` | ✅ Ativo |
| `evaluate-notification-health` | ✅ Ativo |
| `get-place-details` | ✅ Ativo |
| `get-public-asset` | ✅ Ativo |
| `get-tcr` | ✅ Ativo |
| `health-check` | ✅ Ativo |
| `invoke-vic` | ✅ Ativo |
| `mbr-summary` | ✅ Ativo |
| `okr-construction-review` | ✅ Ativo |
| `okr-org-health-review` | ✅ Ativo |
| `process-agent-document` | ✅ Ativo |
| `process-notification-outbox` | ✅ Ativo |
| `request-magic-link` | ✅ Ativo |
| `search-address` | ✅ Ativo |
| `search-cities` | ✅ Ativo |
| `send-partner-invite` | ✅ Ativo |
| `team-checkin-summary` | ✅ Ativo |

**Conclusão:** ✅ **22 funções ativas. 0 órfãs.** (4 novas desde última auditoria: `clevel-checkin-summary`, `collaborator-checkin-summary`, `mbr-summary`, `health-check`)

---

## 2.3 FRONTEND

### 🗑️ 2.3.1 Componente `KpiCategorySection.tsx` — REMOVER

| Atributo | Valor |
|----------|-------|
| Localização | `src/modules/kpis/components/KpiCategorySection.tsx` |
| Substituído por | `KpiAreaSection.tsx` (v2.82.0) |
| Importações reais | **0** (apenas re-export deprecated em `index.ts`) |

**Análise:** Componente marcado como `@deprecated` em v2.82.0, substituído por `KpiAreaSection`. Nenhuma página ou componente o importa.

**Ação:**
1. Remover `KpiCategorySection.tsx`
2. Remover re-export deprecated do `src/modules/kpis/index.ts`

**Prioridade:** P2  
**Esforço:** 5 min

---

### 🗑️ 2.3.2 Componente `OpportunitiesVolumeChart.tsx` — REMOVER

| Atributo | Valor |
|----------|-------|
| Localização | `src/modules/events/components/dashboard/OpportunitiesVolumeChart.tsx` |
| Importações | **0** (marcado como unused pelo sistema) |

**Análise:** Componente de gráfico nunca importado por nenhuma página ou dashboard.

**Ação:** Remover arquivo.

**Prioridade:** P3  
**Esforço:** 5 min

---

### ⚠️ 2.3.3 Páginas de Desenvolvimento — PROTEGER

| Página | Rota | Propósito |
|--------|------|-----------|
| `VicTestPage.tsx` | `/vic-test` | Teste de agentes IA |
| `DevDocsPage.tsx` | `/dev-docs` | Documentação interna dev |

**Análise:** Ambas são páginas de desenvolvimento/debug acessíveis em produção sem restrição. Devem ser protegidas com verificação de role `platform_admin` ou flag de ambiente.

**Opções:**
1. Proteger com `isPlatformAdmin` check (recomendado)
2. Remover completamente (se não forem mais necessárias)

**Prioridade:** P2  
**Esforço:** 15 min

---

### ✅ Wrappers Deprecated (MANTER por agora)

| Arquivo | Deprecated em | Uso Real |
|---------|---------------|----------|
| `KrUnitSelect.tsx` | TCR v3.6.0 | ✅ Ainda importado em `TeamKrFormDialog`, `OrgKrFormDialog` |
| `krUnits.ts` | TCR v3.6.0 | ✅ Ainda importado em `KrProgressPreview`, `KrHistoryDialog` |

**Decisão:** MANTER — têm importadores ativos. Migração requer refactor coordenado.

---

## 📋 Plano de Ação

### Wave Imediata (P2 — fazer agora)

| # | Ação | Esforço | Risco |
|---|------|---------|-------|
| 1 | Remover `KpiCategorySection.tsx` + re-export | 5 min | Zero |
| 2 | Proteger `VicTestPage` e `DevDocsPage` com admin check | 15 min | Baixo |

### Wave Seguinte (P3 — próximo ciclo)

| # | Ação | Esforço | Risco |
|---|------|---------|-------|
| 3 | Remover `OpportunitiesVolumeChart.tsx` | 5 min | Zero |
| 4 | DROP tabela `okr_coaching_events` | 10 min | Baixo |
| 5 | Migrar imports de `KrUnitSelect` → `UnitSelect` | 20 min | Baixo |
| 6 | Migrar imports de `krUnits.ts` → `@/shared/constants/units` | 15 min | Baixo |

---

## 🔒 Itens a MANTER

| Item | Razão |
|------|-------|
| `okr_dependencies` | 3 hooks ativos (insert + select) |
| `automation_*` (4 tabelas) | Feature implementada, aguardando uso |
| `ticket_routing_rules` | Hook ativo, feature de roteamento |
| `asset_phone_lines` | Hook completo ativo |
| `perf_metrics_snapshots` | Hook ativo para métricas |
| `KrUnitSelect.tsx` | 2 importadores ativos |
| `krUnits.ts` | 2 importadores ativos |
| `VicTestPage.tsx` | Útil para debug (proteger) |
| `DevDocsPage.tsx` | Útil para dev (proteger) |

---

*Análise concluída em: 2026-03-14*  
*TCR: v3.9.0 | Health Score: 10/10*
