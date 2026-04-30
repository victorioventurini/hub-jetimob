---
name: Deprecated Cleanup Log
description: Registro de varreduras de @deprecated, ondas de limpeza executadas e itens bloqueados (waiting on schema/janela de observação)
type: reference
---

# Deprecated Cleanup Log

Registro consolidado das varreduras `@deprecated` e do que foi limpo a cada onda.

## Estado atual (atualizado 2026-04-30)

- **Total de marcações `@deprecated`:** 52 (após Onda 6 Frente C)
- **Próxima auditoria recomendada:** após 2026-07-30 (T0 da janela Onda 4 Fase 5).

## Onda 6 — Frente B: DeleteConfirmDialog → ConfirmDialog (2026-04-30)

### Migrado (15 consumidores + catálogo + shim)

- 15 arquivos refatorados via sed: import + JSX (`<DeleteConfirmDialog>` → `<ConfirmDialog variant="destructive">`).
- `SettingsUiCatalog.tsx` atualizado (entry, importPath helper, showcase).
- `src/components/ui/delete-confirm-dialog.tsx` **deletado** (shim removido).
- `DeleteConfirmDialogV2` alias removido de `confirm-dialog.tsx`. `WarningConfirmDialog` mantido.

### Frente A (KPI `frequency` sunset) — REVERTIDA

Drop da coluna `kpi_metrics.frequency` foi tentado mas teve dependências não auditadas em hooks/edge. Rollback completo do DB (coluna+enum+backfill) e frontend. Adiada para wave dedicada com auditoria prévia completa.

- **Total de marcações `@deprecated`:** 56 (era 63 antes da Onda 5)
- **Próxima auditoria recomendada:** após 2026-07-30 (T0 da janela Onda 4 Fase 5).

## Onda 5 — Limpeza geral (2026-04-30)

### Removidos (7 ocorrências)

1. **`useTicketSubcategories`** (GET hook) — `src/modules/tickets/hooks/useTicketCategories.ts`
   - 0 consumidores. Subcategorias já vêm embutidas em `useTicketCategories()`.
   - Hooks Create/Update/Delete + tipos preservados.
2. **`preWeeklyKeys.userSources`** — `src/lib/queryKeys/okrs.ts`
   - 0 consumidores. `preWeeklyKeys.sources` é o canônico.
3. **`initGA4()`** + re-export — `src/lib/analytics/{gtag,index}.ts`
   - 0 consumidores. GTM gerencia GA4 internamente.
4. **`UserLink.userId`** prop — `src/components/links/UserLink.tsx`
   - Migrados 2 consumidores (`InitiativeCard`, `InitiativeQuickUpdateDialog`) para `profileId`.
5. **`TeamMember` type + `teamMembersData`/`useBuUsersDirectory` órfãos** — `TeamOkrKrDetailStep.tsx` + `OkrCreationPage.tsx`
   - Prop `teamMembers` substituída por `teamId` há tempo. Remoção arrastou query+memo+import órfãos.
6. **`WeeklyThemeBlock`/`WeeklyThemeType`** aliases — `src/modules/okrs/types/wizard/weekly.ts`
   - Migrados consumidores (`useWeeklyOpeningCuration`, `WeeklyTheme`) para `RitualBlock`/`RitualThemeActionType` (vocabulary canônico).

### Mantidos (avaliados, ficam por outras razões)

| Item | Razão |
|---|---|
| Onda 4 snapshots (16 campos) | Em janela de observação até 2026-07-30. |
| KPIs v2.82.0 (`category` → `area_id`) | Risco médio em filtros UI; precisa onda dedicada com regressão visual. |
| KPIs v3.0.0 (`frequency` → split) | Bloqueado: coluna `frequency` ainda `NOT NULL` no DB. Pré-requisito = migration. |
| Permissions V1 (4 tabelas DB) | READ-ONLY desde Wave 7; drop planejado para Wave 8/9. |
| Analysis report shapes legados | Risco de dados históricos JSONB; precisa auditoria de produção. |
| `qbr-pre-summary.zombieCandidates` | Campo estrutural usado em 11 lugares (initializers, tests, types). Remoção exige migração coordenada. |
| `DeleteConfirmDialog` | 17+ consumidores; refactor fora de escopo desta onda. |
| `MilestoneList.onLinkKr` | Assinatura defensiva, doc-only. |
| `queryKeys` barrel | Comment é guidance para novos usos; barrel ainda usado amplamente. |
| `PreWeeklyTopicPriority`, `sourcesReflection`, etc. | Compat de drafts antigos persistidos. |
| `profiles.job_title` (DB) | Verificar se coluna ainda tem dados antes de drop. |
| `send_test_notification` v1 (DB) | Função utilitária; baixíssimo uso, baixa prioridade. |

## Como auditar novamente

```bash
rg -n "@deprecated" -g '!node_modules' -g '!dist' -g '!.lovable' src/ supabase/
```

Para cada item: `rg -n "<symbol>" src/ supabase/` — se zero consumidores externos, candidate to drop.

## Próxima onda recomendada (Onda 6)

- **Pré-requisito DB**: migration tornando `kpi_metrics.frequency` nullable + drop, destravando Grupo C.
- **Auditoria Analysis**: query em `analysis_reports` para detectar leitores do shape legado.
- **Refactor DeleteConfirmDialog → ConfirmDialog**: PR dedicada (17 arquivos).
