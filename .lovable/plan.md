# Onda 6 — Limpeza @deprecated (Frentes A/B/C — CONCLUÍDA 2026-04-30)

## Resultado consolidado
- **63 → 52** ocorrências `@deprecated` (-11 totais nas Ondas 5+6).
- Build limpo, zero quebras.

## Frente A — KPI `frequency` sunset (REVERTIDA)
Drop tentado mas com dependências profundas em hooks (`useKpiData`, `useKpiEvolutionList`, `useKpisForWizard*`) e edge (`hub-tools`). Rollback completo (DB + frontend). Adiada para wave dedicada com auditoria prévia.

## Frente B — DeleteConfirmDialog → ConfirmDialog (CONCLUÍDA)
- 15 consumidores migrados para `<ConfirmDialog variant="destructive">`.
- Shim `delete-confirm-dialog.tsx` deletado, alias `DeleteConfirmDialogV2` removido.
- `SettingsUiCatalog` atualizado.

## Frente C — Auditoria pós-Wave 7 (CONCLUÍDA)
- `QbrPostKrAdjustment` → `QbrKrAdjustment`: 8 refs migradas, alias removido.
- Demais aliases avaliados: bloqueados por janela de observação, dependências DB, ou volume de consumidores.

## Bloqueados / próximas ondas
- **Onda 4 snapshots** (16 campos): observação até 2026-07-30.
- **KPIs v3 `frequency`** + **v2.82.0 `category`**: requer wave dedicada com migration DB + regressão visual.
- **Permissions V1** (4 tabelas + hooks): drop em Wave 8/9.
- **Analysis legacy shapes**: auditoria JSONB necessária.
- **`qbr-pre-summary.zombieCandidates`**: migração coordenada de 11 pontos.

Detalhes em `mem://standards/deprecated-cleanup-log`.
