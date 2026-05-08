---
name: KPI Status Consolidation
description: lifecycle_status é o SSOT canônico de ciclo de vida de KPI. status (legado) é sincronizado por trigger. Filtros e mutações novas devem usar APENAS lifecycle_status.
type: standard
---

# KPI Status — Consolidação

## SSOT
- **`kpi_metrics.lifecycle_status`** (`proposed | active | observing | deprecated`) é o **único** campo canônico de ciclo de vida.
- **`kpi_metrics.status`** (`active | inactive`) é **@deprecated** — mantido por trigger `trg_kpi_metrics_sync_status_lifecycle` (BEFORE INSERT/UPDATE) que sincroniza bidirecionalmente:
  - `lifecycle='deprecated'` ⇒ `status='inactive'`
  - `status='inactive'` ⇒ `lifecycle='deprecated'`
  - `status='active'` (e lifecycle não mudou) e lifecycle era `deprecated` ⇒ lifecycle vira `active`

## Regras
1. **Filtros nos ritos / dashboards**: usar APENAS `.eq('lifecycle_status','active')` (ou `.in('lifecycle_status', […])`). Nunca filtrar por `status` em código novo.
2. **Mutações de "arquivar/ativar KPI"**: escrever em `lifecycle_status`. UI antiga que escreve em `status` continua funcional (trigger espelha), mas deve ser migrada.
3. **Drop futuro de `status`**: depende de auditoria de leitores remanescentes; não remover sem gate explícito.

## Contexto histórico
- 2026-05: incidente Jetimob — KPI "MRR Churn + Downsell" arquivado pelo dashboard (`status='inactive'`) continuava aparecendo no MBR (`lifecycle_status='active'`). Backfill alinhou os 2 KPIs divergentes e trigger impede regressão.
