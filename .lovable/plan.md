# Onda 8 — KPI frequency Fase 1 (CONCLUÍDA 2026-04-30)

## Resultado consolidado
- **47 → 48** ocorrências `@deprecated` (+1: `legacyFrequencyToValue` agora marcado como uso interno).
- Removidas **8/8 leituras frontend** de `kpi.frequency`.
- 1 CI guard novo: `scripts/check-no-kpi-frequency.sh` integrado a `compliance-all.yml`.

## O que foi feito (Fase 1 do KPI sunset plan)

### Refactor frontend (8 pontos)
| Arquivo | Mudança |
|---|---|
| `KpiCard.tsx` | Removido fallback `legacyFrequencyToValue` — usa `update_frequency` direto. |
| `KpiDetailContent.tsx` | `FREQUENCY_LABELS[kpi.frequency]` → `FREQUENCY_VALUE_LABELS[kpi.update_frequency]`. |
| `KpiHistoryDialog.tsx` | Idem + tipo `KpiFrequency` removido do shape de dados. |
| `KpiActionsMenu.tsx` | Mapping para `KpiMetric.frequency` agora deriva via `valueFrequencyToLegacy(update_frequency)` (DB ainda NOT NULL). |
| `useEditKpiForm.ts` | Removido `legacyFrequencyToValue`; usa `consolidation_frequency`/`update_frequency` direto. |
| `KpiEvolutionPage.tsx` | Removido cast `as any`; passa `update_frequency` + `consolidation_frequency` para o histórico. |
| `useKpisForWizard.ts` | Tipo refeito (`update_frequency`/`consolidation_frequency`); `needsUpdate` agora usa `update_frequency` (semântica correta de gate). |
| `useKpisForWizardV2.ts` | Removido `frequency` do select, do mapping e do tipo `KpiForWizardV2`. |

### Tipos
- `KpiForWizard.frequency` → substituído por `update_frequency`/`consolidation_frequency`.
- `KpiForWizardV2.frequency` → removido (era `@deprecated`).
- `KpiHistoryDialogData.frequency` → marcado `@deprecated`, mantido opcional para compat.
- `KpiEvolutionItem.frequency` → substituído por `update_frequency`/`consolidation_frequency`.

### Tests atualizados
- `CollaboratorKpiStep.test.tsx` — fixture usa `update_frequency`/`consolidation_frequency`.
- `CollaboratorContextStep.test.tsx` — removido `frequency`.
- `CLevelSteps.test.tsx` — fixture v2 atualizada.
- `frequency.test.ts` — sem mudanças (helpers legacy preservados, deprecated).

### CI guard
`scripts/check-no-kpi-frequency.sh` bloqueia novos `kpi.frequency` em código de aplicação.
Allowlist: utils/frequency.ts, types.ts, KpiActionsMenu.tsx (escrita-espelho), useTeamKpisGrouped.ts (pass-through).

## Próximas fases (não executadas — exigem janela)

- **Fase 2 — Auditoria pós-deploy**: 1 semana de produção observando Sentry/console.
- **Fase 3 — Drop DB**: `ALTER TABLE kpi_metrics DROP NOT NULL` (kpi_metrics.frequency) → wave seguinte → `DROP COLUMN`.
- **Fase 4 — Cleanup helpers**: remover `legacyFrequencyToValue`, `valueFrequencyToLegacy`, `FREQUENCY_LABELS`, `KpiFrequency` enum.

## Bloqueados / próximas ondas (mantidos)
- **Onda 4 snapshots** (16 campos): observação até 2026-07-30.
- **`qbr-pre-summary.zombieCandidates`**: migração coordenada de 11 pontos.

Detalhes em `mem://standards/deprecated-cleanup-log` e `docs/audits/KPI_FREQUENCY_SUNSET_PLAN.md`.
