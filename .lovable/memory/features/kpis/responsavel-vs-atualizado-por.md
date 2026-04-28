---
name: KPIs — Responsável vs Atualizado por
description: Distinção entre owner_user_id (accountable pelo resultado) e contribuidor data_entry (quem atualiza valores). Convenção single-user, obrigatório quando ativo, backfill executado.
type: feature
---

## Semântica
- **Responsável** (`kpi_metrics.owner_user_id`): accountable pelo **resultado**. Monitora desvios, age para "mover o ponteiro". Notificado de alertas/RAG.
- **Atualizado por** (`kpi_data_contributors` com `role='data_entry'`): responsável por **inserir/atualizar valores** do indicador. Pode ser o mesmo do Responsável ou outra pessoa.

## Convenção de UI (v2.92.0)
- 1 único contribuidor `data_entry` ativo por KPI (apesar de o schema permitir N).
- Exibido em CreateKpiDialog e EditKpiDialog ao lado do Responsável (BuUserSelect, `excludeExternal`).
- **Obrigatório** quando `lifecycle_status='active'` (mesma regra do Responsável).
- Read-only em `KpiDetailContent` (linha "Atualizado por" ao lado de "Responsável").

## Helpers canônicos
- Leitura: `useKpiPrimaryDataEntry(kpiId)` em `src/modules/kpis/hooks/useKpiPrimaryDataEntry.ts`.
- Escrita: `useUpsertKpiPrimaryDataEntry()` — idempotente: no-op se já é o atual; soft-delete antigos + insert novo caso contrário; soft-delete todos se userId for null.
- Não usar `KpiContributorsManager` (componente órfão) sem decisão explícita — ele é multi-contribuidor e foge da convenção single-user.

## Persistência
- Tabela `kpi_data_contributors` (BU-scoped, RLS, soft-delete).
- Unique: `uq_kpi_contributor (kpi_id, contributor_user_id, deleted_at) NULLS NOT DISTINCT`.
- Schema permite role `reviewer` e múltiplos data_entry — manter para futura expansão.

## Backfill (2026-04-28)
Migration idempotente copiou `owner_user_id` → `kpi_data_contributors(role='data_entry')` para todos os KPIs ativos sem contribuidor. Re-execução é segura (NOT EXISTS + ON CONFLICT DO NOTHING).

## Onde NÃO duplicar
- Não criar campos paralelos em `kpi_metrics` para "atualizado por" — a fonte da verdade é `kpi_data_contributors`.
- Não sincronizar implicitamente owner→data_entry via trigger; a UI faz a vinculação explícita no submit.
